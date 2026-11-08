import { useEffect, useState } from "react";
import { localJson, refreshLocal, useLocal } from "../local";
import { setState, useApp } from "../store";

const MANAGE_USAGE = "https://chatgpt.com/#settings";

// Visas bara när appen körs från den lokala servern (npm start) på din dator.
export default function ChatGPTCard() {
  const s = useApp();
  const local = useLocal();
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const gpt = local?.chatgpt;
  const active = s.settings.provider === "chatgpt";
  const pairUrl = local?.pairUrls[0];

  useEffect(() => {
    if (!gpt?.connected) return;
    localJson<{ models: { id: string; name: string }[] }>("api/chatgpt/models")
      .then((r) => {
        setModels(r.models);
        if (r.models.length && !r.models.some((m) => m.id === s.settings.chatgptModel)) {
          setState((st) => ({ ...st, settings: { ...st.settings, chatgptModel: r.models[0].id } }));
        }
      })
      .catch((e: Error) => setErr(e.message));
  }, [gpt?.connected]);

  useEffect(() => {
    if (!pairUrl) return;
    import("qrcode").then((q) => q.toDataURL(pairUrl, { margin: 1, width: 360, color: { dark: "#0b0c10", light: "#ffffff" } })).then(setQr).catch(() => {});
  }, [pairUrl]);

  if (!local) return null;

  async function logout() {
    await localJson("api/chatgpt/logout", { method: "POST" }).catch(() => {});
    setState((st) => ({ ...st, settings: { ...st.settings, provider: "anthropic" } }));
    refreshLocal();
  }

  return (
    <>
      <div className="small muted" style={{ margin: "22px 8px 6px" }}>ChatGPT-plan</div>
      <div className="glass card" style={{ marginTop: 0 }}>
        {!local.paired ? (
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>Den här mobilen är inte kopplad till datorn. Öppna Inställningar på datorn och skanna QR-koden.</div>
        ) : gpt?.connected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{active ? "Använder din ChatGPT-plan" : "Inloggad med ChatGPT"}</div>
                {gpt.email && <div className="small muted">{gpt.email}</div>}
              </div>
              <a className="small" href={MANAGE_USAGE} target="_blank" rel="noreferrer">Hantera användning</a>
            </div>
            {!gpt.planUsage && <div className="error">Inloggningen saknar behörighet att använda planen. Logga ut och in igen och godkänn den.</div>}
            {!active && <button type="button" className="btn sm mt14" onClick={() => setState((st) => ({ ...st, settings: { ...st.settings, provider: "chatgpt" } }))}>Använd ChatGPT för coachen</button>}
            {active && models.length > 0 && (
              <label className="row mt8" style={{ borderBottom: 0 }}>Modell
                <select className="field" value={s.settings.chatgptModel} onChange={(e) => setState((st) => ({ ...st, settings: { ...st.settings, chatgptModel: e.target.value } }))}>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            )}
            {local.loopback && <button type="button" className="btn ghost sm mt8" onClick={logout}>Logga ut</button>}
          </>
        ) : local.loopback && window.location.hostname === "127.0.0.1" ? (
          <>
            <a className="btn" href="auth/chatgpt/start" style={{ textDecoration: "none" }}>Fortsätt med ChatGPT</a>
            <p className="small muted" style={{ margin: "10px 4px 0", lineHeight: 1.5 }}>Coachen använder din ChatGPT-plan (Plus eller Pro) i stället för en API-nyckel. Användningen räknas mot planens gränser och hanteras i ChatGPT.</p>
          </>
        ) : local.loopback ? (
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>
            Öppna <a href={local.loginUrl.replace("auth/chatgpt/start", "")}>{local.loginUrl.replace("/auth/chatgpt/start", "")}</a> (med 127.0.0.1, inte localhost) för att logga in med ChatGPT.
          </div>
        ) : (
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>Logga in med ChatGPT på datorn som kör AI-coachen. Sedan funkar det här också.</div>
        )}
        {err && <div className="error">{err}</div>}
      </div>

      {local.loopback && pairUrl && (
        <>
          <div className="small muted" style={{ margin: "22px 8px 6px" }}>Öppna på mobilen</div>
          <div className="glass card" style={{ marginTop: 0, display: "flex", gap: 16, alignItems: "center" }}>
            {qr && <img src={qr} alt="QR-kod till appen på mobilen" width={120} height={120} style={{ borderRadius: 14, flexShrink: 0 }} />}
            <div className="small" style={{ lineHeight: 1.5 }}>
              Skanna med kameran på mobilen. Den måste vara på samma wifi som datorn, och datorn måste vara igång.
              <div className="muted mt8" style={{ wordBreak: "break-all" }}>{pairUrl.split("?")[0]}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
