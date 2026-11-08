import { useEffect, useRef, useState } from "react";
import { pendingLogin as openRouterLogin, startOpenRouterLogin } from "../openrouter";
import { MODELS } from "../ai";
import { type AppState, getState, replaceState, resetAll, setState, useApp } from "../store";
import { Icon, type Go } from "../ui";

export default function Inst({ go }: { go: Go }) {
  const s = useApp();
  const firstRun = !s.settings.apiKey;
  const [key, setKey] = useState(s.settings.apiKey);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [orBusy, setOrBusy] = useState(!!openRouterLogin);
  const [orError, setOrError] = useState<string | null>(null);
  const viaOR = s.settings.provider === "openrouter" && !!s.settings.apiKey;
  useEffect(() => {
    if (!openRouterLogin) return;
    openRouterLogin
      .then(() => go("idag"))
      .catch((e: Error) => setOrError(e.message))
      .finally(() => setOrBusy(false));
  }, []);
  const appUrl = window.location.origin + window.location.pathname;
  const template = `${appUrl}?steps=[STEG]&weight=[VIKT]&kcal=[AKTIVA KCAL]`;

  const prof = <K extends keyof AppState["profile"]>(k: K, v: AppState["profile"][K]) => setState((st) => ({ ...st, profile: { ...st.profile, [k]: v } }));
  const sett = <K extends keyof AppState["settings"]>(k: K, v: AppState["settings"][K]) => setState((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));
  const numOrNull = (v: string) => (v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...getState(), settings: { ...getState().settings, apiKey: "" } }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-coachen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importData(f: File | undefined) {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (data.v !== 1 || !data.days) throw new Error();
      replaceState({ ...data, settings: { ...data.settings, apiKey: getState().settings.apiKey } });
    } catch {
      alert("Filen gick inte att läsa.");
    }
  }

  function saveKey() {
    sett("apiKey", key.trim());
    sett("provider", "anthropic");
    if (firstRun && key.trim()) go("idag");
  }

  return (
    <>
      <div className="top" style={{ justifyContent: "flex-start" }}>
        {!firstRun && <button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button>}
        <h1 style={{ margin: 0, fontSize: 24 }}>{firstRun ? "Kom igång" : "Inställningar"}</h1>
      </div>
      {firstRun && <p className="lead">Logga in så att coachen kan svara, och berätta lite om dig. Allt sparas bara i den här webbläsaren.</p>}

      <div className="small muted" style={{ margin: "22px 8px 6px" }}>Koppla in coachen</div>
      {viaOR ? (
        <div className="glass card" style={{ marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15 }}>Inloggad med OpenRouter</span>
          <button type="button" className="btn ghost sm" onClick={() => { setState((st) => ({ ...st, settings: { ...st.settings, apiKey: "", provider: "anthropic" } })); setKey(""); }}>Logga ut</button>
        </div>
      ) : (
        <div className="glass card" style={{ marginTop: 0 }}>
          <button type="button" className="btn" disabled={orBusy} onClick={() => { setOrError(null); startOpenRouterLogin().catch(() => setOrError("Det gick inte att starta inloggningen.")); }}>
            {orBusy ? "Loggar in …" : "Logga in med OpenRouter"}
          </button>
          <p className="small muted" style={{ margin: "10px 4px 0", lineHeight: 1.5 }}>Enklast. Logga in med Google eller mejl och fyll på några dollar. En vecka med coachen kostar ungefär en kaffe.</p>
          {orError && <div className="error">{orError}</div>}
        </div>
      )}
      <div className="glass list mt14" style={{ borderRadius: 28 }}>
        {!viaOR && (
          <label className="row">Egen Claude-nyckel
            <input className="field" type="password" autoComplete="off" value={key} placeholder="sk-ant-…" onChange={(e) => setKey(e.target.value)} onBlur={() => { if (!firstRun) { sett("apiKey", key.trim()); sett("provider", "anthropic"); } }} style={{ width: 150 }} />
          </label>
        )}
        <label className="row">Modell
          <select className="field" value={s.settings.model} onChange={(e) => sett("model", e.target.value)}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="row">Dag 1 var
          <input className="field" type="date" value={s.settings.startDate} onChange={(e) => e.target.value && sett("startDate", e.target.value)} style={{ width: 150 }} />
        </label>
        <label className="row">Testvikt bänk
          <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><input className="field" inputMode="decimal" value={String(s.settings.benchTestKg).replace(".", ",")} onChange={(e) => { const n = numOrNull(e.target.value); if (n != null) sett("benchTestKg", n); }} style={{ width: 60 }} /><span className="small muted">kg</span></span>
        </label>
      </div>
      {!viaOR && <p className="small muted" style={{ margin: "8px 8px 0", lineHeight: 1.5 }}>
        Har du redan ett konto hos Claude? Skapa en nyckel på <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">platform.claude.com</a>. Du betalar själv för det du använder. Opus 5.5 ger bäst coachning, Haiku 5.5 är billigast.
      </p>}

      <div className="small muted" style={{ margin: "22px 8px 6px" }}>Du</div>
      <div className="glass list" style={{ borderRadius: 28 }}>
        <label className="row">Ålder<input className="field" inputMode="numeric" value={s.profile.age ?? ""} placeholder="–" onChange={(e) => prof("age", numOrNull(e.target.value))} style={{ width: 80 }} /></label>
        <label className="row">Längd (cm)<input className="field" inputMode="numeric" value={s.profile.heightCm ?? ""} placeholder="–" onChange={(e) => prof("heightCm", numOrNull(e.target.value))} style={{ width: 80 }} /></label>
        <label className="row">Vikt (kg)<input className="field" inputMode="decimal" value={s.profile.weightKg ?? ""} placeholder="–" onChange={(e) => prof("weightKg", numOrNull(e.target.value))} style={{ width: 80 }} /></label>
        <label className="row">Mål
          <select className="field" value={s.profile.goal} onChange={(e) => prof("goal", e.target.value)}>
            {["Mer styrka", "Bygga muskler", "Gå ner i fett", "Bättre kondition"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="row">Tränar
          <select className="field" value={s.profile.training} onChange={(e) => prof("training", e.target.value)}>
            {["Gym, fria vikter och maskiner", "Gym, mest maskiner", "Hemma med hantlar", "Hemma, bara kroppsvikt"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label style={{ display: "block", padding: "12px 0" }}>
          <span className="small muted">Bra för coachen att veta (skador, mat du inte äter, hur mycket du tränat)</span>
          <textarea className="textbox mt8" value={s.profile.notes} onChange={(e) => prof("notes", e.target.value)} placeholder="Tränat seriöst förut, tillbaka sen tre månader. Äter allt." />
        </label>
      </div>

      <div className="small muted" style={{ margin: "22px 8px 6px" }}>Apple Hälsa</div>
      <div className="glass card" style={{ marginTop: 0 }}>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>Steg, vikt från vågen och aktiva kalorier kan skickas in automatiskt med en iOS-genväg.</div>
        <button type="button" className="btn ghost sm mt14" onClick={() => setShowGuide((v) => !v)}>{showGuide ? "Dölj guiden" : "Visa hur"}</button>
        {showGuide && (
          <ol style={{ margin: "14px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
            <li>Öppna appen <strong>Genvägar</strong> och skapa en ny genväg.</li>
            <li>Lägg till <strong>Hitta hälsoexempel</strong> (Find Health Samples): typ <em>Steg</em>, startdatum <em>i dag</em>. Lägg sedan till <strong>Beräkna statistik</strong> med <em>Summa</em>.</li>
            <li>Lägg till <strong>Hitta hälsoexempel</strong> igen: typ <em>Vikt</em>, sortera på startdatum med senaste först, gräns 1.</li>
            <li>Gör samma sak för <em>Aktiv energi</em> om du vill ha med kalorier.</li>
            <li>Lägg till <strong>URL</strong> och klistra in adressen här under. Byt ut [STEG], [VIKT] och [AKTIVA KCAL] mot resultaten från stegen ovan.</li>
            <li>Avsluta med <strong>Öppna URL:er</strong>. Under Automation kan du köra genvägen varje morgon och kväll.</li>
          </ol>
        )}
        {showGuide && (
          <div className="mt14" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, fontSize: 12, wordBreak: "break-all", padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,.3)" }}>{template}</code>
            <button type="button" className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(template); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* kopiering blockerad */ } }}>{copied ? "Kopierad" : "Kopiera"}</button>
          </div>
        )}
        {showGuide && <p className="small muted mt14" style={{ lineHeight: 1.5 }}>Whoop skriver sömn, HRV och vilopuls till Hälsa. De kan följa med som &amp;hrv=, &amp;rhr= och &amp;sleep= (timmar). Recovery-procenten tas från skärmdumpen.</p>}
      </div>

      {!firstRun && (
        <>
          <div className="small muted" style={{ margin: "22px 8px 6px" }}>Data</div>
          <div className="glass list" style={{ borderRadius: 28 }}>
            <button type="button" className="row" style={{ width: "100%", background: "transparent", border: 0, borderBottom: "1px solid var(--line)", padding: 0 }} onClick={exportData}>Exportera all data<span className="muted">JSON</span></button>
            <button type="button" className="row" style={{ width: "100%", background: "transparent", border: 0, borderBottom: "1px solid var(--line)", padding: 0 }} onClick={() => importRef.current?.click()}>Importera data<span className="muted">JSON</span></button>
            <button type="button" className="row" style={{ width: "100%", background: "transparent", border: 0, padding: 0, color: "var(--danger)" }}
              onClick={() => { if (confirm("Radera alla dagar och tester och börja om från dag 1? Profilen och nyckeln sparas.")) { resetAll(); go("idag"); } }}>Börja om från dag 1</button>
          </div>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} />
        </>
      )}

      <p className="small muted" style={{ margin: "16px 8px 0", lineHeight: 1.5 }}>Nyckeln och all data sparas bara i den här webbläsaren och skickas bara till Claude (via OpenRouter om du loggat in där). Det här är inte medicinsk rådgivning. Värm alltid upp och lyssna på kroppen.</p>

      {firstRun && key.trim() && (
        <div className="dock">
          <button type="button" className="btn" disabled={!key.trim()} onClick={saveKey}>Spara och börja</button>
        </div>
      )}
    </>
  );
}
