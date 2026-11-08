// Inloggning med OpenRouter (OAuth PKCE). Allt sker i webbläsaren:
// användaren loggar in hos OpenRouter, kommer tillbaka hit med en kod,
// och appen byter koden mot en egen nyckel som bara sparas lokalt.
import { setState } from "./store";

const VERIFIER = "ai-coachen:or-verifier";

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const appUrl = () => window.location.origin + window.location.pathname;

export async function startOpenRouterLogin() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  sessionStorage.setItem(VERIFIER, verifier);
  const q = new URLSearchParams({ callback_url: appUrl(), code_challenge: challenge, code_challenge_method: "S256" });
  window.location.href = `https://openrouter.ai/auth?${q}`;
}

/** Körs när appen laddas. Returnerar ett löfte om det fanns en kod i adressen, annars null. */
export function finishOpenRouterLogin(): Promise<void> | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return null;
  url.searchParams.delete("code");
  window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  const verifier = sessionStorage.getItem(VERIFIER);
  sessionStorage.removeItem(VERIFIER);
  return (async () => {
    if (!verifier) throw new Error("Inloggningen hann gå ut. Försök igen.");
    const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
    });
    if (!res.ok) throw new Error("Inloggningen med OpenRouter gick inte igenom. Försök igen.");
    const { key } = (await res.json()) as { key?: string };
    if (!key) throw new Error("OpenRouter skickade ingen nyckel. Försök igen.");
    setState((st) => ({ ...st, settings: { ...st.settings, apiKey: key, provider: "openrouter" } }));
  })();
}

export const openRouterModel = (id: string) => "anthropic/" + id.replace(/-(\d+)-(\d+)$/, "-$1.$2");

/** Pågående inloggning om sidan just öppnades med en kod från OpenRouter. */
export const pendingLogin = finishOpenRouterLogin();
