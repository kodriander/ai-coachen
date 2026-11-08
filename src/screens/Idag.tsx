import { dayNumber, fmtKg, fmtSleep, foodTotals, getDay, useApp, workoutVolume } from "../store";
import { Icon, Ring, recoveryColor, weekday, type Go } from "../ui";

export default function Idag({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const n = dayNumber(s);
  const w = d.whoop;
  const plan = d.plan;
  const food = foodTotals(d);
  const vol = workoutVolume(d);
  const testDue = (n <= 1 && !s.tests.day1) || (n >= 7 && !s.tests.day7);
  const hour = new Date().getHours();
  const first = plan?.workout.exercises[0];

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">{weekday(d.date)} · dag {Math.max(1, n)} av 7</div>
          <h1>{hour < 10 ? "God morgon" : hour < 18 ? "Hej" : "God kväll"}</h1>
        </div>
        <button type="button" className="icon-btn glass" aria-label="Inställningar" onClick={() => go("inst")}><Icon.gear /></button>
      </div>

      {!w ? (
        <button type="button" className="card big glass" style={{ width: "100%", textAlign: "left", marginTop: 24 }} onClick={() => go("morgon")}>
          <div className="eyebrow">Börja dagen</div>
          <div className="num" style={{ fontSize: 26, marginTop: 4 }}>Hur sov du?</div>
          <p className="lead">Ladda upp din Whoop-skärmdump så gör coachen dagens pass och kostplan.</p>
          <div className="btn mt14">Ladda upp skärmdump</div>
        </button>
      ) : (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Ring value={(w.recovery ?? 0) / 100} color={recoveryColor(w.recovery)} label={`Recovery ${w.recovery ?? "okänd"} procent`}>
            <span className="num" style={{ fontSize: 64, letterSpacing: "-.04em", lineHeight: 1 }}>
              {w.recovery ?? "–"}<span style={{ fontSize: 28 }}>%</span>
            </span>
            <span className="eyebrow" style={{ marginTop: 4 }}>Recovery</span>
          </Ring>
          <div style={{ marginTop: 14, display: "flex", gap: 24, fontSize: 13 }} className="muted">
            <span>Sömn <strong style={{ color: "var(--text)", fontWeight: 600 }}>{fmtSleep(w.sleepMinutes)}</strong></span>
            <span>HRV <strong style={{ color: "var(--text)", fontWeight: 600 }}>{w.hrv ?? "–"} ms</strong></span>
            <span>Puls <strong style={{ color: "var(--text)", fontWeight: 600 }}>{w.rhr ?? "–"}</strong></span>
          </div>
          {d.health && (
            <div className="pill-tag glass mt14" style={{ height: 40, borderRadius: 20, gap: 14 }}>
              <span>{d.health.steps != null ? `${d.health.steps.toLocaleString("sv-SE")} steg` : "– steg"}</span>
              <span className="muted">·</span>
              <span>{d.health.weightKg != null ? `${fmtKg(d.health.weightKg)} kg` : "– kg"}</span>
              {d.health.activeKcal != null && (<><span className="muted">·</span><span>{d.health.activeKcal} kcal aktivt</span></>)}
            </div>
          )}
          {plan && <p className="lead center" style={{ margin: "14px 16px 0" }}>{plan.motivation}</p>}
        </div>
      )}

      {testDue && (
        <button type="button" className="card glass" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }} onClick={() => go("test")}>
          <div style={{ flexGrow: 1 }}>
            <div className="eyebrow">Testdag</div>
            <div className="num" style={{ fontSize: 20, marginTop: 2 }}>{n >= 7 ? "Dag 7: samma test igen" : "Dag 1: gör testet"}</div>
            <div className="small muted mt8">Bänk max reps @ {fmtKg(s.settings.benchTestKg)} kg, chins och kroppsvikt</div>
          </div>
          <span className="pill-tag" style={{ background: "var(--lime)", color: "var(--ink)" }}>Öppna</span>
        </button>
      )}

      {w && !plan && (
        <button type="button" className="btn mt20" onClick={() => go("morgon")}>Ge mig dagens plan</button>
      )}

      {plan && (
        <button type="button" className="card glass" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, marginTop: 22 }}
          onClick={() => go(d.workoutDoneAt ? "klart" : plan.workout.exercises.length ? "pass" : "plan")}>
          <div style={{ flexGrow: 1 }}>
            <div className="small muted">
              {d.workoutDoneAt ? "Klart i dag" : `Dagens pass · ${plan.workout.durationMin} min · ${plan.workout.exercises.length} övningar`}
            </div>
            <div className="num" style={{ fontSize: 21, marginTop: 4 }}>{plan.workout.title}</div>
            <div className="small muted mt8">
              {d.workoutDoneAt
                ? `${vol.done} set · ${vol.volume.toLocaleString("sv-SE")} kg volym`
                : first ? `${first.name} ${first.sets} × ${first.reps}${first.weightKg ? ` @ ${fmtKg(first.weightKg)} kg` : ""}` : plan.headline}
            </div>
          </div>
          <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: "50%", background: "var(--lime)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {d.workoutDoneAt ? Icon.check(22) : <Icon.play />}
          </span>
        </button>
      )}

      {plan && (
        <div className="grid2 mt14">
          <button type="button" className="tile glass" style={{ textAlign: "left" }} onClick={() => go("mat")}>
            <div className="small muted">Protein</div>
            <div className="num" style={{ fontSize: 22, marginTop: 2 }}>{food.protein} <span className="muted" style={{ fontSize: 14 }}>/ {plan.nutrition.protein} g</span></div>
            <div className="bar mt8"><i style={{ width: `${Math.min(100, (food.protein / Math.max(1, plan.nutrition.protein)) * 100)}%` }} /></div>
          </button>
          <button type="button" className="tile glass" style={{ textAlign: "left" }} onClick={() => go("kvall")}>
            <div className="small muted">Kväll</div>
            <div className="num" style={{ fontSize: 22, marginTop: 2 }}>{d.checkin?.reply ? "Klart" : "Check-in"}</div>
            <div className="small muted mt8">{d.checkin?.reply ? "Bra jobbat i dag" : hour >= 18 ? "Dags nu" : "Gör den i kväll"}</div>
          </button>
        </div>
      )}

      {plan && (
        <button type="button" className="btn ghost sm mt14" style={{ width: "100%" }} onClick={() => go("plan")}>Se hela planen</button>
      )}
    </>
  );
}
