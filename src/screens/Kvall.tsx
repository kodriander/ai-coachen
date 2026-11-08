import { checkinReply } from "../ai";
import { type Checkin, dayNumber, foodTotals, getDay, getState, updateDay, useApp, workoutVolume } from "../store";
import { ErrorBox, Icon, Spinner, useTask, type Go } from "../ui";

export default function Kvall({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const c: Checkin = d.checkin ?? { energy: null, soreness: null, text: "" };
  const v = workoutVolume(d);
  const t = foodTotals(d);
  const task = useTask();

  const set = (patch: Partial<Checkin>) => updateDay((day) => ({ ...day, checkin: { ...(day.checkin ?? { energy: null, soreness: null, text: "" }), ...patch, reply: undefined } }));

  async function send() {
    const r = await task.run(() => checkinReply(getState()));
    if (r) updateDay((day) => ({ ...day, checkin: { ...(day.checkin ?? { energy: null, soreness: null, text: "" }), reply: r } }));
  }

  const scale = (label: string, value: number | null, key: "energy" | "soreness") => (
    <fieldset className="row" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="sr">{label}</legend>
      <span aria-hidden="true">{label}</span>
      <div className="scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n}`} aria-pressed={value === n} className={value === n ? "on" : ""} onClick={() => set({ [key]: n })}>{n}</button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <>
      <div className="eyebrow">{new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })} · dag {Math.max(1, dayNumber(s))} av 7</div>
      <h1>Hur gick dagen?</h1>

      <div className="grid3 mt14">
        <div className="tile glass"><div className="small muted">Pass</div><div className="num">{d.plan?.workout.exercises.length ? `${v.done} / ${v.total} set` : "Vila"}</div></div>
        <div className="tile glass"><div className="small muted">Protein</div><div className="num">{t.protein} g</div></div>
        <div className="tile glass"><div className="small muted">Steg</div><div className="num">{d.health?.steps != null ? d.health.steps.toLocaleString("sv-SE") : "–"}</div></div>
      </div>

      <div className="card big glass center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <button type="button" aria-label="Berätta med rösten" onClick={() => go("rost-kvall")}
          style={{ width: 88, height: 88, borderRadius: "50%", border: 0, background: "var(--lime)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 10px rgba(221,244,122,.12), 0 0 0 22px rgba(221,244,122,.06)" }}>
          {Icon.mic(32)}
        </button>
        <div style={{ marginTop: 22, fontSize: 16, fontWeight: 500 }}>Berätta med rösten</div>
        <div className="small muted mt8">Energi, ömhet, hunger, humör. Prata som vanligt.</div>
      </div>

      <div className="card glass list">
        {scale("Energi", c.energy, "energy")}
        {scale("Ömhet", c.soreness, "soreness")}
        <label style={{ display: "block", padding: "12px 0" }}>
          <span className="small muted">Något mer?</span>
          <textarea className="textbox mt8" value={c.text} onChange={(e) => set({ text: e.target.value })} placeholder="Axeln kändes lite stel på sista setet." />
        </label>
      </div>

      {d.notes.length > 0 && (
        <div className="card glass">
          <div className="small muted">Anteckningar från i dag</div>
          {d.notes.map((n, i) => <div key={i} className="mt8" style={{ fontSize: 14 }}>{n}</div>)}
        </div>
      )}

      {c.reply && <div className="card glass"><div className="coach"><span>{c.reply}</span></div></div>}
      <ErrorBox error={task.error} />

      <div className="dock above-nav">
        <button type="button" className="btn" disabled={task.busy || (!c.text && c.energy == null)} onClick={send}>
          {task.busy ? <><Spinner /> Coachen läser …</> : c.reply ? "Skicka igen" : "Skicka till coachen"}
        </button>
      </div>
    </>
  );
}
