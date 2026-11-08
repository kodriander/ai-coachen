import { useEffect } from "react";
import { workoutSummary } from "../ai";
import { type AppState, type Day, fmtKg, getDay, getState, sortedDays, updateDay, useApp, workoutVolume } from "../store";
import { ErrorBox, Icon, Spinner, useTask, type Go } from "../ui";

function bestSet(d: Day) {
  let best: { name: string; weightKg: number; reps: number } | null = null;
  d.plan?.workout.exercises.forEach((ex, i) =>
    d.log[i]?.sets.forEach((st) => {
      if (!st.done || st.weightKg == null) return;
      const score = st.weightKg * (1 + st.reps / 30);
      if (!best || score > best.weightKg * (1 + best.reps / 30)) best = { name: ex.name, weightKg: st.weightKg, reps: st.reps };
    }),
  );
  return best as { name: string; weightKg: number; reps: number } | null;
}

/** Är det här setet bättre än samma övning tidigare dagar (Epley-uppskattning)? */
function isRecord(s: AppState, d: Day, b: { name: string; weightKg: number; reps: number }) {
  const score = b.weightKg * (1 + b.reps / 30);
  let prev = 0;
  sortedDays(s)
    .filter((x) => x.date < d.date)
    .forEach((x) => x.plan?.workout.exercises.forEach((ex, i) => {
      if (ex.name.toLowerCase() !== b.name.toLowerCase()) return;
      x.log[i]?.sets.forEach((st) => { if (st.done && st.weightKg != null) prev = Math.max(prev, st.weightKg * (1 + st.reps / 30)); });
    }));
  return prev > 0 && score > prev;
}

export default function Klart({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const sum = useTask();
  const v = workoutVolume(d);
  const minutes = d.workoutStartedAt && d.workoutDoneAt ? Math.round((d.workoutDoneAt - d.workoutStartedAt) / 60000) : null;
  const best = bestSet(d);

  useEffect(() => {
    if (d.workoutDoneAt && !d.workoutSummary && !sum.busy) {
      sum.run(() => workoutSummary(getState())).then((t) => t && updateDay((day) => ({ ...day, workoutSummary: t })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.workoutDoneAt]);

  return (
    <>
      <div className="center" style={{ paddingTop: 48 }}>
        <div style={{ width: 72, height: 72, margin: "0 auto", borderRadius: "50%", background: "var(--lime)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.check(34)}</div>
        <h1 style={{ marginTop: 20, fontSize: 40, letterSpacing: "-.03em" }}>Pass klart</h1>
        <div className="eyebrow">{d.plan?.workout.title}</div>
      </div>

      <div className="grid3 mt20">
        <div className="tile glass center"><div className="num" style={{ fontSize: 24 }}>{minutes ?? "–"}</div><div className="small muted">minuter</div></div>
        <div className="tile glass center"><div className="num" style={{ fontSize: 24 }}>{v.volume.toLocaleString("sv-SE")}</div><div className="small muted">kg volym</div></div>
        <div className="tile glass center"><div className="num" style={{ fontSize: 24 }}>{v.done} / {v.total}</div><div className="small muted">set</div></div>
      </div>

      {best && (
        <div className="card glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div><div className="small muted">Bästa set</div><div className="num" style={{ fontSize: 20, marginTop: 2 }}>{best.name} {fmtKg(best.weightKg)} kg × {best.reps}</div></div>
          {isRecord(s, d, best) && <span className="pill-tag" style={{ height: 30, background: "var(--lime)", color: "var(--ink)", fontSize: 12, fontWeight: 700 }}>NYTT REKORD</span>}
        </div>
      )}

      <div className="card glass">
        {sum.busy ? <div className="coach"><span style={{ display: "flex", gap: 8, alignItems: "center" }}><Spinner /> Coachen sammanfattar …</span></div> : d.workoutSummary ? <div className="coach"><span>{d.workoutSummary}</span></div> : <span className="small muted">Ingen sammanfattning än.</span>}
        <ErrorBox error={sum.error} />
      </div>

      <div className="dock">
        <button type="button" className="mic-round glass" aria-label="Säg något om passet" onClick={() => go("rost-pass")}>{Icon.mic()}</button>
        <button type="button" className="btn" onClick={() => go("idag")}>Klar</button>
      </div>
    </>
  );
}
