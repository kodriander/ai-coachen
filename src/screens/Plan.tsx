import { useState } from "react";
import { fmtKg, getDay, updateDay, useApp } from "../store";
import { Icon, type Go } from "../ui";

export default function PlanScreen({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const [tab, setTab] = useState<"allt" | "traning" | "kost">("allt");
  const p = d.plan;
  if (!p) {
    return (
      <>
        <div className="top"><button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button></div>
        <h1 className="mt14">Ingen plan än</h1>
        <p className="lead">Börja med morgonens Whoop-värden så gör coachen en plan.</p>
        <button type="button" className="btn mt20" onClick={() => go("morgon")}>Till morgonen</button>
      </>
    );
  }
  const rest = p.workout.exercises.length === 0;

  function start() {
    if (!d.workoutStartedAt) updateDay((day) => ({ ...day, workoutStartedAt: Date.now() }));
    go("pass");
  }

  return (
    <>
      <div className="top">
        <button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button>
        <div className="seg glass" role="tablist" aria-label="Plan">
          {([["allt", "Allt"], ["traning", "Träning"], ["kost", "Kost"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      <h1 className="mt20">{p.headline}</h1>
      <p className="lead">{p.motivation}</p>

      {tab !== "kost" && (
        <div className="card glass" style={{ padding: "6px 18px" }}>
          <div className="small muted" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 8px" }}>
            <span>Träning · {p.workout.title}</span><span>{p.workout.durationMin} min</span>
          </div>
          {p.workout.exercises.map((ex, i) => (
            <div key={i} className="ex-row" style={{ flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>{ex.name}</span>
                <span className="num" style={{ whiteSpace: "nowrap" }}>{ex.sets} × {ex.reps}{ex.weightKg ? ` · ${fmtKg(ex.weightKg)} kg` : ""}</span>
              </div>
              {tab === "traning" && <span className="small muted">{ex.cue} · vila {Math.round(ex.restSec / 60 * 10) / 10} min</span>}
            </div>
          ))}
          {rest && <p className="lead" style={{ paddingBottom: 12 }}>Vilodag. Gå en promenad och rör på dig lätt.</p>}
        </div>
      )}

      {tab !== "traning" && (
        <div className="card glass" style={{ padding: "6px 18px" }}>
          <div className="small muted" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 8px" }}>
            <span>Kost · {p.nutrition.kcal.toLocaleString("sv-SE")} kcal</span><span>{p.nutrition.protein} g protein</span>
          </div>
          {p.nutrition.meals.map((m, i) => (
            <div key={i} className="ex-row" style={{ fontSize: 14 }}>
              <span>{m.label} · {m.description}</span>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.protein} g</span>
            </div>
          ))}
        </div>
      )}

      <div className="dock">
        {rest ? (
          <button type="button" className="btn" onClick={() => go("idag")}>Klar</button>
        ) : (
          <button type="button" className="btn" onClick={start}>{d.workoutDoneAt ? "Se passet igen" : d.workoutStartedAt ? "Fortsätt passet" : "Starta passet"}</button>
        )}
      </div>
    </>
  );
}
