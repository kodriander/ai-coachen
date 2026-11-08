// AI-coachens lokala server. Kör den på din egen dator med `npm start`.
//
// Den gör tre saker:
//  1. Serverar appen (mappen dist/) så att du kan öppna den på datorn och mobilen.
//  2. Låter dig logga in med ChatGPT (Sign in with ChatGPT för appar med öppen källkod)
//     så att coachen använder din ChatGPT-plan i stället för en API-nyckel.
//  3. Skickar coachens frågor vidare till OpenAI:s Responses API med din inloggning.
//
// Inloggningen sparas bara i data/chatgpt.json på din dator och lämnar den aldrig,
// förutom till OpenAI. Inga beroenden utöver Node 18 eller senare.

import { createServer } from "node:http";
import { createHash, createPublicKey, createVerify, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const DATA = process.env.COACH_DATA_DIR ? resolve(process.env.COACH_DATA_DIR) : join(ROOT, "data");
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "0.0.0.0";

const AUTH = process.env.OPENAI_AUTH_BASE || "https://auth.openai.com";
const API = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const RESOURCE = "https://api.openai.com/v1";
const SCOPES = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const APP_NAME = "AI-coachen";
const REDIRECT = `http://127.0.0.1:${PORT}/auth/callback`;

// ---------- lagring ----------

const AUTH_FILE = join(DATA, "chatgpt.json");
const LOCAL_FILE = join(DATA, "local.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, value) {
  mkdirSync(DATA, { recursive: true, mode: 0o700 });
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
}

// Värd-id och parkopplingskod skapas en gång per dator och sparas.
const local = readJson(LOCAL_FILE, {});
if (!local.ext_agent_host_id) local.ext_agent_host_id = `urn:uuid:${randomUUID()}`;
if (!local.pair_token) local.pair_token = randomBytes(18).toString("base64url");
writeJson(LOCAL_FILE, local);

let creds = readJson(AUTH_FILE, null);
const saveCreds = (c) => {
  creds = c;
  writeJson(AUTH_FILE, c);
};

// ---------- hjälpare ----------

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sha256 = (s) => createHash("sha256").update(s).digest();

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string";
  res.writeHead(status, { "Content-Type": isJson ? "application/json; charset=utf-8" : "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(isJson ? JSON.stringify(body) : body);
}

function isLoopback(req) {
  const a = req.socket.remoteAddress || "";
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
}

// Datorn själv är alltid betrodd. Andra enheter (mobilen) måste ha parkopplingskoden.
function authorized(req) {
  if (isLoopback(req)) return true;
  const got = Buffer.from(String(req.headers["x-coach-token"] || ""));
  const want = Buffer.from(local.pair_token);
  return got.length === want.length && timingSafeEqual(got, want);
}

function lanUrls() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list || []) if (n.family === "IPv4" && !n.internal) out.push(`http://${n.address}:${PORT}/`);
  }
  return out;
}

async function readBody(req, limit = 12 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("För stor förfrågan."), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const page = (title, text) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
  `<body style="margin:0;background:#07080c;color:#f4f5f7;font:16px/1.5 system-ui;display:grid;place-items:center;min-height:100vh;padding:24px">` +
  `<div style="max-width:440px"><h1 style="font-size:24px">${title}</h1><p>${text}</p></div>`;

// ---------- Sign in with ChatGPT ----------

const pending = new Map(); // state -> { verifier, nonce, clientId, created }

let jwksCache = null;
async function jwks() {
  if (jwksCache && Date.now() - jwksCache.at < 3600_000) return jwksCache.keys;
  const r = await fetch(`${AUTH}/.well-known/jwks.json`);
  if (!r.ok) throw new Error("Kunde inte hämta OpenAI:s nycklar.");
  jwksCache = { at: Date.now(), keys: (await r.json()).keys };
  return jwksCache.keys;
}

async function verifyIdToken(idToken, clientId, nonce) {
  const [h, p, s] = String(idToken).split(".");
  if (!h || !p || !s) throw new Error("Ogiltig ID-token.");
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (header.alg !== "RS256") throw new Error("Okänd signaturtyp.");
  const jwk = (await jwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Okänd signeringsnyckel.");
  const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
  if (!ok) throw new Error("ID-token har fel signatur.");
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== AUTH.replace(/\/$/, "")) throw new Error("ID-token har fel utgivare.");
  if (!aud.includes(clientId)) throw new Error("ID-token är inte till den här appen.");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now() - 60_000) throw new Error("ID-token har gått ut.");
  if (nonce && claims.nonce !== nonce) throw new Error("ID-token matchar inte inloggningen.");
  return claims;
}

function startLogin(req, res) {
  // Svaret från OpenAI kommer alltid till 127.0.0.1, så inloggningen måste ske på den här datorn.
  const host = String(req.headers.host || "");
  if (!isLoopback(req) || !host.startsWith("127.0.0.1")) {
    return send(res, 200, page("Logga in på datorn", `Inloggningen med ChatGPT görs på datorn som kör AI-coachen. Öppna <b>http://127.0.0.1:${PORT}</b> där och tryck på Fortsätt med ChatGPT. Sedan funkar det på mobilen också.`));
  }
  const verifier = b64url(randomBytes(32));
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const clientId = creds?.client_id || "dynamic_agent_client";
  pending.set(state, { verifier, nonce, clientId, created: Date.now() });
  const q = new URLSearchParams({
    client_id: clientId,
    ext_agent_host_id: local.ext_agent_host_id,
    response_type: "code",
    redirect_uri: REDIRECT,
    scope: SCOPES,
    resource: RESOURCE,
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: b64url(sha256(verifier)),
  });
  if (clientId === "dynamic_agent_client") q.set("agent_name_hint", APP_NAME);
  if (creds?.id_token) q.set("id_token_hint", creds.id_token);
  if (creds?.email) q.set("login_hint", creds.email);
  res.writeHead(302, { Location: `${AUTH}/api/accounts/authorize?${q}` });
  res.end();
}

async function callback(req, res, url) {
  const fail = (msg) => send(res, 400, page("Inloggningen gick inte", `${msg} <a style="color:#ddf47a" href="/">Tillbaka till appen</a>`));
  const state = url.searchParams.get("state") || "";
  const p = pending.get(state);
  pending.delete(state);
  if (!p || Date.now() - p.created > 15 * 60_000) return fail("Inloggningen hann gå ut eller kom inte härifrån. Försök igen.");
  const error = url.searchParams.get("error");
  if (error === "access_denied") return fail("Du avbröt inloggningen.");
  if (error) return fail(`OpenAI svarade: ${error}.`);
  const code = url.searchParams.get("code");
  if (!code) return fail("Ingen kod kom tillbaka.");

  let clientId = p.clientId;
  const issued = url.searchParams.get("client_id");
  if (clientId === "dynamic_agent_client") {
    if (!issued) return fail("Appen blev inte registrerad hos OpenAI. Försök igen.");
    clientId = issued;
  } else if (issued && issued !== clientId) {
    return fail("Fel app-id i svaret från OpenAI.");
  }

  const tr = await fetch(`${AUTH}/api/accounts/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code, code_verifier: p.verifier, redirect_uri: REDIRECT, resource: RESOURCE }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tr.ok) return fail(tok.error === "invalid_grant" ? "Koden gick inte att använda. Försök igen." : `Tokenbytet misslyckades (${tok.error || tr.status}).`);

  let claims;
  try {
    claims = await verifyIdToken(tok.id_token, clientId, p.nonce);
  } catch (e) {
    return fail(e.message);
  }
  const scopes = String(tok.scope || "").split(/\s+/).filter(Boolean);
  const firstTime = !creds?.refresh_token;
  saveCreds({
    client_id: clientId,
    ext_agent_host_id: local.ext_agent_host_id,
    sub: claims.sub,
    email: claims.email || null,
    id_token: tok.id_token,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: Date.now() + (Number(tok.expires_in) || 3600) * 1000,
    scopes,
  });
  res.writeHead(302, { Location: `/?chatgpt=${firstTime ? "welcome" : "connected"}` });
  res.end();
}

let refreshing = null;
async function accessToken() {
  if (!creds?.refresh_token) throw Object.assign(new Error("Logga in med ChatGPT under Inställningar."), { status: 401, code: "not_signed_in" });
  if (creds.access_token && creds.expires_at - Date.now() > 120_000) return creds.access_token;
  refreshing ??= (async () => {
    const r = await fetch(`${AUTH}/api/accounts/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: creds.client_id, refresh_token: creds.refresh_token, resource: RESOURCE }),
    });
    const tok = await r.json().catch(() => ({}));
    if (!r.ok) {
      const terminal = ["invalid_grant", "invalid_refresh_token", "refresh_token_expired", "refresh_token_reused"].includes(tok.error);
      if (terminal) saveCreds({ ...creds, access_token: null, refresh_token: null, expires_at: 0 });
      throw Object.assign(new Error(terminal ? "Inloggningen har gått ut. Logga in med ChatGPT igen." : "Kunde inte förnya inloggningen. Försök igen."), { status: 401, code: terminal ? "not_signed_in" : "refresh_failed" });
    }
    saveCreds({
      ...creds,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token || creds.refresh_token,
      expires_at: Date.now() + (Number(tok.expires_in) || 3600) * 1000,
      scopes: tok.scope ? String(tok.scope).split(/\s+/) : creds.scopes,
      id_token: tok.id_token || creds.id_token,
    });
    return creds.access_token;
  })().finally(() => (refreshing = null));
  return refreshing;
}

const planUsage = () => !!creds?.refresh_token && (creds.scopes || []).includes("chatgpt.tokens.use.direct");

function mapOpenAIError(status, body) {
  const code = body?.error?.code || body?.code || body?.detail?.code;
  if (code === "subscription_sharing_usage_limit_exceeded" || status === 429)
    return { status: 429, code: "usage_limit", message: "Gränsen för din ChatGPT-plan är nådd just nu. Se Hantera användning i ChatGPT." };
  if (code === "subscription_sharing_user_not_eligible")
    return { status: 403, code: "not_eligible", message: "Din ChatGPT-plan kan inte användas i andra appar (kräver ett betalt abonnemang som stöds)." };
  if (code === "chatpass_v2_scope_not_authorized")
    return { status: 403, code: "scope", message: "Appen har inte rätt behörighet. Logga ut och in igen med ChatGPT." };
  if (status === 401) return { status: 401, code: "unauthorized", message: "OpenAI godkände inte inloggningen. Logga in med ChatGPT igen." };
  if (status === 400) return { status: 400, code: "bad_request", message: `OpenAI kunde inte ta emot frågan: ${body?.error?.message || "okänt fel"}` };
  return { status: 502, code: "upstream", message: `OpenAI svarade med fel (${status}). Försök igen.` };
}

// Läser Responses-strömmen och returnerar svaret när response.completed kommer.
async function readStream(r) {
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for await (const chunk of r.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
      if (!data || data === "[DONE]") continue;
      let ev;
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.type === "response.output_text.delta") text += ev.delta || "";
      else if (ev.type === "response.completed") {
        const out = (ev.response?.output || []).flatMap((o) => o.content || []);
        const refusal = out.find((c) => c.type === "refusal");
        if (refusal) return { refusal: refusal.refusal || true };
        const final = out.filter((c) => c.type === "output_text").map((c) => c.text).join("");
        return { text: final || text };
      } else if (ev.type === "response.incomplete") return { incomplete: ev.response?.incomplete_details?.reason || "okänd" };
      else if (ev.type === "response.failed" || ev.type === "error") return { error: ev.response?.error || ev.error || ev };
    }
  }
  return { error: { message: "Svaret från OpenAI bröts innan det blev klart." } };
}

async function respond(req, res) {
  const body = JSON.parse(await readBody(req));
  const token = await accessToken();
  if (!planUsage()) return send(res, 403, { code: "scope", message: "Din inloggning saknar behörighet att använda ChatGPT-planen. Logga in igen och godkänn den." });
  // Ingen modell vald (t.ex. ny mobil): ta den första som kontot har tillgång till.
  const model = body.model || (await listModels())[0]?.id;
  if (!model) return send(res, 403, { code: "no_model", message: "Ditt ChatGPT-konto har ingen modell som går att använda här." });
  const payload = {
    model,
    instructions: body.instructions,
    input: body.input,
    text: body.text,
    ...(body.reasoning ? { reasoning: body.reasoning } : {}),
    store: false,
    stream: true,
  };
  const r = await fetch(`${API}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const e = mapOpenAIError(r.status, await r.json().catch(() => ({})));
    return send(res, e.status, e);
  }
  const out = await readStream(r);
  if (out.refusal) return send(res, 200, { refusal: true });
  if (out.incomplete) return send(res, 502, { code: "incomplete", message: `Svaret blev inte klart (${out.incomplete}). Försök igen.` });
  if (out.error) return send(res, 502, { code: "upstream", message: out.error.message || "OpenAI svarade med fel. Försök igen." });
  send(res, 200, { text: out.text });
}

async function listModels() {
  const token = await accessToken();
  const r = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(), mapOpenAIError(r.status, body));
  return (body.models || body.data || []).filter((m) => (m.visibility ?? "list") === "list").map((m) => ({ id: m.slug || m.id, name: m.display_name || m.slug || m.id }));
}

async function models(res) {
  send(res, 200, { models: await listModels() });
}

// ---------- statiska filer ----------

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".ico": "image/x-icon", ".woff2": "font/woff2" };

function serveStatic(res, pathname) {
  let file = normalize(join(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST)) return send(res, 403, page("Nej", "Den filen finns inte."));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  if (!existsSync(file)) return send(res, 500, page("Appen är inte byggd", "Kör <code>npm start</code> (den bygger appen först)."));
  const type = TYPES[extname(file)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable" });
  res.end(readFileSync(file));
}

// ---------- routing ----------

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  try {
    if (path === "/auth/chatgpt/start") return startLogin(req, res);
    if (path === "/auth/callback") return await callback(req, res, url);
    if (path.startsWith("/api/")) {
      if (path === "/api/local/status") {
        const ok = authorized(req);
        return send(res, 200, {
          server: "ai-coachen",
          paired: ok,
          loopback: isLoopback(req),
          chatgpt: ok ? { connected: !!creds?.refresh_token, planUsage: planUsage(), email: creds?.email || null } : null,
          pairUrls: isLoopback(req) ? lanUrls().map((u) => `${u}?pair=${local.pair_token}`) : [],
          loginUrl: `http://127.0.0.1:${PORT}/auth/chatgpt/start`,
        });
      }
      if (!authorized(req)) return send(res, 401, { code: "not_paired", message: "Den här enheten är inte kopplad. Skanna QR-koden under Inställningar på datorn." });
      if (path === "/api/chatgpt/models" && req.method === "GET") return await models(res);
      if (path === "/api/chatgpt/respond" && req.method === "POST") return await respond(req, res);
      if (path === "/api/chatgpt/logout" && req.method === "POST") {
        saveCreds({ client_id: creds?.client_id, ext_agent_host_id: local.ext_agent_host_id, id_token: creds?.id_token, email: creds?.email });
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { code: "not_found", message: "Finns inte." });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { message: "Metoden stöds inte." });
    serveStatic(res, path);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { code: e.code || "error", message: e.message || "Något gick fel." });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  const lan = lanUrls();
  console.log(`\n  AI-coachen körs.\n`);
  console.log(`  På den här datorn:  http://127.0.0.1:${PORT}`);
  if (HOST === "0.0.0.0" && lan.length) console.log(`  På mobilen (samma wifi): skanna QR-koden under Inställningar på datorn`);
  console.log(`\n  Stoppa med Ctrl+C.\n`);
});
