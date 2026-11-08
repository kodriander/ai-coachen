import { useRef, useState } from "react";
import { fileToImage, makePlan, readWhoop } from "../ai";
import { type Whoop, dayNumber, getDay, getState, logFromPlan, updateDay, useApp } from "../store";
import { ErrorBox, Icon, Spinner, useTask, type Go } from "../ui";

function parseSleep(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const m = t.match(/^(\d+)\s*[:h ]\s*(\d{1,2})/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 60) : null;
}
const sleepStr = (min: number | null | undefined) =>
  min == null ? "" : `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;
const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : null;
};

export default function Morgon({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [recovery, setRecovery] = useState(d.whoop?.recovery?.toString() ?? "");
  const [sleep, setSleep] = useState(sleepStr(d.whoop?.sleepMinutes));
  const [hrv, setHrv] = useState(d.whoop?.hrv?.toString() ?? "");
  const [rhr, setRhr] = useState(d.whoop?.rhr?.toString() ?? "");
  const [feeling, setFeeling] = useState(d.feeling ?? "Okej");
  const read = useTask();
  const plan = useTask();

  async function onFile(f: File | undefined) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    const r = await read.run(async () => readWhoop(getState(), await fileToImage(f)));
    if (!r) return;
    setFound(r.found);
    if (r.recovery != null) setRecovery(String(Math.round(r.recovery)));
    if (r.sleepMinutes != null) setSleep(sleepStr(r.sleepMinutes));
    if (r.hrv != null) setHrv(String(Math.round(r.hrv)));
    if (r.rhr != null) setRhr(String(Math.round(r.rhr)));
  }

  async function makeTodaysPlan() {
    const whoop: Whoop = { recovery: num(recovery), sleepMinutes: parseSleep(sleep), hrv: num(hrv), rhr: num(rhr) };
    updateDay((day) => ({ ...day, whoop, feeling }));
    const p = await plan.run(() => makePlan(getState()));
    if (!p) return;
    updateDay((day) => ({ ...day, plan: p, log: logFromPlan(p), currentExercise: 0, workoutDoneAt: undefined, workoutSummary: undefined }));
    go("plan");
  }

  const hasValues = recovery || sleep || hrv;

  return (
    <>
      <div className="top">
        <button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button>
        <span className="eyebrow">Dag {Math.max(1, dayNumber(s))} av 7</span>
        <span style={{ width: 44 }} />
      </div>
      <h1 className="mt14">Hur sov du?</h1>
      <p className="lead">Ladda upp skärmdumpen från Whoop. Coachen läser av siffrorna, du kollar att de stämmer.</p>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="card big glass" style={{ display: "flex", gap: 14, alignItems: "center", padding: 16 }}>
        <div style={{ width: 72, height: 112, flexShrink: 0, borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {preview ? <img src={preview} alt="Din skärmdump" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon.camera />}
        </div>
        <div style={{ flexGrow: 1 }}>
          {read.busy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Spinner /> Läser av …</div>
          ) : found != null ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--mint)" }}>{Icon.check()} {found} värden hittade</div>
              <div className="small muted mt8">Kolla att de stämmer.</div>
            </>
          ) : (
            <div className="small muted">Ingen bild än. Eller fyll i för hand här under.</div>
          )}
          <button type="button" className="btn ghost sm mt14" onClick={() => fileRef.current?.click()}>{preview ? "Byt bild" : "Välj skärmdump"}</button>
        </div>
      </div>
      <ErrorBox error={read.error} />

      <div className="card glass list">
        <label className="row">Recovery<span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><input className="field big" inputMode="numeric" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="–" /><span className="small muted">%</span></span></label>
        <label className="row">Sömn<span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><input className="field big" inputMode="text" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7:30" /><span className="small muted">h</span></span></label>
        <label className="row">HRV<span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><input className="field big" inputMode="numeric" value={hrv} onChange={(e) => setHrv(e.target.value)} placeholder="–" /><span className="small muted">ms</span></span></label>
        <label className="row">Vilopuls<span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><input className="field big" inputMode="numeric" value={rhr} onChange={(e) => setRhr(e.target.value)} placeholder="–" /><span className="small muted">bpm</span></span></label>
        <div className="row">
          <span>Känsla</span>
          <div className="seg">
            {["Pigg", "Okej", "Seg"].map((f) => (
              <button key={f} type="button" className={feeling === f ? "on" : ""} aria-pressed={feeling === f} onClick={() => setFeeling(f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>
      <ErrorBox error={plan.error} />

      <div className="dock">
        <button type="button" className="btn" disabled={!hasValues || plan.busy || read.busy} onClick={makeTodaysPlan}>
          {plan.busy ? <><Spinner /> Coachen planerar …</> : d.plan ? "Gör om dagens plan" : "Ge mig dagens plan"}
        </button>
      </div>
    </>
  );
}
