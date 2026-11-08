import { useEffect, useState } from "react";
import { setFeedback } from "../ai";
import { type Feel, fmtKg, getDay, getState, updateDay, useApp } from "../store";
import { ErrorBox, Icon, Spinner, useTask, type Go } from "../ui";

const mmss = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export default function Pass({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const fb = useTask();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Håll skärmen tänd under passet.
  useEffect(() => {
    type Lock = { release(): Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<Lock> } };
    let lock: Lock | null = null;
    const get = () => nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    get();
    const onVis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (d.plan && !d.workoutStartedAt) updateDay((day) => ({ ...day, workoutStartedAt: Date.now() }));
  }, [d.plan, d.workoutStartedAt]);

  const plan = d.plan;
  if (!plan || plan.workout.exercises.length === 0) {
    return (
      <>
        <div className="top"><button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button></div>
        <h1 className="mt14">{plan ? "Vilodag" : "Inget pass än"}</h1>
        <p className="lead">{plan ? "Inget pass i dag. Vila, ät och sov bra." : "Börja med morgonens Whoop-värden så gör coachen ett pass."}</p>
        {!plan && <button type="button" className="btn mt20" onClick={() => go("morgon")}>Till morgonen</button>}
      </>
    );
  }

  const exCount = plan.workout.exercises.length;
  const exIdx = Math.min(d.currentExercise, exCount - 1);
  const ex = plan.workout.exercises[exIdx];
  const log = d.log[exIdx] ?? { sets: [] };
  const setIdx = log.sets.findIndex((st) => !st.done);
  const exDone = setIdx === -1;
  const cur = exDone ? null : log.sets[setIdx];
  const last = exIdx === exCount - 1;
  const allDone = d.log.every((l) => l.sets.every((st) => st.done));
  const resting = restEnd != null && restEnd > now;
  const progress = d.log.reduce((n, l) => n + l.sets.filter((st) => st.done).length, 0) / Math.max(1, d.log.reduce((n, l) => n + l.sets.length, 0));

  function editSet(patch: Partial<{ weightKg: number | null; reps: number; feel: Feel }>) {
    if (setIdx < 0) return;
    updateDay((day) => {
      const logCopy = day.log.map((l, i) => (i === exIdx ? { ...l, sets: l.sets.map((st, j) => (j === setIdx ? { ...st, ...patch } : st)) } : l));
      return { ...day, log: logCopy };
    });
  }

  async function completeSet() {
    if (!cur || !plan) return;
    const done = { ...cur, done: true };
    updateDay((day) => {
      const logCopy = day.log.map((l, i) => {
        if (i !== exIdx) return l;
        const sets = l.sets.map((st, j) => (j === setIdx ? done : st));
        // Nästa set börjar där det här slutade.
        if (setIdx + 1 < sets.length && !sets[setIdx + 1].done) sets[setIdx + 1] = { ...sets[setIdx + 1], weightKg: done.weightKg, reps: sets[setIdx + 1].reps };
        return { ...l, sets };
      });
      return { ...day, log: logCopy };
    });
    setRestEnd(Date.now() + ex.restSec * 1000);
    const st = getState();
    const text = await fb.run(() => setFeedback(st, plan, exIdx, getDay(st).log[exIdx]));
    if (text) updateDay((day) => ({ ...day, log: day.log.map((l, i) => (i === exIdx ? { ...l, feedback: text } : l)) }));
  }

  function moveTo(i: number) {
    updateDay((day) => ({ ...day, currentExercise: Math.max(0, Math.min(exCount - 1, i)) }));
    setRestEnd(null);
  }

  function addSet() {
    updateDay((day) => ({
      ...day,
      log: day.log.map((l, i) => {
        if (i !== exIdx) return l;
        const prev = l.sets[l.sets.length - 1];
        return { ...l, sets: [...l.sets, { weightKg: prev?.weightKg ?? ex.weightKg, reps: prev?.reps ?? ex.reps, feel: "Okej" as Feel, done: false }] };
      }),
    }));
  }

  function finish() {
    updateDay((day) => ({ ...day, workoutDoneAt: Date.now(), workoutSummary: undefined }));
    go("klart");
  }

  const step = (w: number | null, by: number) => (w == null ? null : Math.max(0, Math.round((w + by) * 4) / 4));

  return (
    <>
      <div className="top">
        <button type="button" className="icon-btn glass" aria-label="Lämna passet" onClick={() => go("idag")}><Icon.close /></button>
        <div className="pill-tag glass" style={{ height: 44, borderRadius: 22 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lime)" }} />
          {mmss(now - (d.workoutStartedAt ?? now))} · övning {exIdx + 1} av {exCount}
        </div>
      </div>
      <div className="bar mt14"><i style={{ width: `${progress * 100}%` }} /></div>

      <div className="mt20" style={{ padding: "0 8px" }}>
        <div className="eyebrow">Mål {ex.sets} × {ex.reps}{ex.weightKg ? ` @ ${fmtKg(ex.weightKg)} kg` : ""} · vila {mmss(ex.restSec * 1000)}</div>
        <h1 style={{ fontSize: 36, letterSpacing: "-.03em" }}>{ex.name}</h1>
        <div className="small muted mt8">{ex.cue}</div>
        <div className="chips">
          {log.sets.map((st, i) => (
            <span key={i} className={"chip " + (st.done ? (st.feel === "Tungt" ? "heavy" : "done") : i === setIdx ? "now" : "")}>
              {st.done ? `✓ ${st.reps}` : `Set ${i + 1}`}
            </span>
          ))}
          <button type="button" className="chip" onClick={addSet} aria-label="Lägg till ett set">+ set</button>
        </div>
      </div>

      <div className="card big glass mt20">
        {cur ? (
          <>
            <div className="grid2">
              <div className="center">
                <div className="small muted">Kilo</div>
                <div className="num" style={{ fontSize: 52, letterSpacing: "-.04em", lineHeight: 1.1 }}>{cur.weightKg == null ? "KV" : fmtKg(cur.weightKg)}</div>
                {cur.weightKg != null && (
                  <div className="stepper">
                    <button type="button" aria-label="Minska vikt" onClick={() => editSet({ weightKg: step(cur.weightKg, -2.5) })}>−</button>
                    <button type="button" aria-label="Öka vikt" onClick={() => editSet({ weightKg: step(cur.weightKg, 2.5) })}>+</button>
                  </div>
                )}
              </div>
              <div className="center">
                <div className="small muted">Reps</div>
                <div className="num" style={{ fontSize: 52, letterSpacing: "-.04em", lineHeight: 1.1 }}>{cur.reps}</div>
                <div className="stepper">
                  <button type="button" aria-label="Färre reps" onClick={() => editSet({ reps: Math.max(0, cur.reps - 1) })}>−</button>
                  <button type="button" aria-label="Fler reps" onClick={() => editSet({ reps: cur.reps + 1 })}>+</button>
                </div>
              </div>
            </div>
            <div className="center mt14">
              <div className="seg" role="group" aria-label="Känsla">
                {(["Lätt", "Okej", "Tungt"] as Feel[]).map((f) => (
                  <button key={f} type="button" className={cur.feel === f ? "on" : ""} aria-pressed={cur.feel === f} onClick={() => editSet({ feel: f })}>{f}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="center">
            <div style={{ color: "var(--mint)", display: "flex", justifyContent: "center" }}>{Icon.check(28)}</div>
            <div className="num mt8" style={{ fontSize: 22 }}>{ex.name} klar</div>
          </div>
        )}
        {(log.feedback || fb.busy) && (
          <div className="divider">
            {fb.busy ? <div className="coach"><span style={{ display: "flex", gap: 8, alignItems: "center" }}><Spinner /> Coachen kollar setet …</span></div> : <div className="coach"><span>{log.feedback}</span></div>}
          </div>
        )}
        <ErrorBox error={fb.error} />
      </div>

      <div className="grid2 mt14">
        <button type="button" className="btn ghost sm" style={{ width: "100%" }} disabled={exIdx === 0} onClick={() => moveTo(exIdx - 1)}>Förra övningen</button>
        <button type="button" className="btn ghost sm" style={{ width: "100%" }} disabled={last} onClick={() => moveTo(exIdx + 1)}>Nästa övning</button>
      </div>
      {!last && (
        <div className="tile glass mt14" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 28, padding: "16px 20px" }}>
          <span className="small muted">Nästa: {plan.workout.exercises[exIdx + 1].name}</span>
          <span className="num" style={{ fontSize: 17 }}>{plan.workout.exercises[exIdx + 1].sets} × {plan.workout.exercises[exIdx + 1].reps}</span>
        </div>
      )}

      <div className="dock">
        <button type="button" className="mic-round glass" aria-label="Prata in setet" onClick={() => go("rost-pass")}>{Icon.mic()}</button>
        {cur ? (
          <button type="button" className="btn" onClick={completeSet} disabled={resting}>
            {resting ? `Vila ${mmss(restEnd! - now)}` : `Klart set ${setIdx + 1}`}
          </button>
        ) : allDone || last ? (
          <button type="button" className="btn" onClick={finish}>Avsluta passet</button>
        ) : (
          <button type="button" className="btn" onClick={() => moveTo(exIdx + 1)}>Nästa övning</button>
        )}
      </div>
      {resting && cur && (
        <div className="center mt14"><button type="button" className="btn ghost sm" onClick={() => setRestEnd(null)}>Hoppa över vilan</button></div>
      )}
    </>
  );
}
