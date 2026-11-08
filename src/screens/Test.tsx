import { useState } from "react";
import { type TestResult, dayNumber, fmtKg, getDay, setState, todayISO, useApp } from "../store";
import { Icon, type Go } from "../ui";

export default function Test({ go }: { go: Go }) {
  const s = useApp();
  const n = dayNumber(s);
  const [which, setWhich] = useState<"day1" | "day7">(n >= 7 || s.tests.day1 ? "day7" : "day1");
  const existing = s.tests[which];
  const healthWeight = getDay(s).health?.weightKg ?? null;
  const [bench, setBench] = useState<number | null>(existing?.benchReps ?? null);
  const [chins, setChins] = useState<number | null>(existing?.chins ?? null);
  const [weight, setWeight] = useState(existing?.bodyweight?.toString().replace(".", ",") ?? (healthWeight != null ? fmtKg(healthWeight) : ""));
  const [checks, setChecks] = useState([!!existing, !!existing, !!existing]);

  function switchTo(w: "day1" | "day7") {
    setWhich(w);
    const e = s.tests[w];
    setBench(e?.benchReps ?? null);
    setChins(e?.chins ?? null);
    setWeight(e?.bodyweight?.toString().replace(".", ",") ?? (healthWeight != null ? fmtKg(healthWeight) : ""));
  }

  function save() {
    const bw = Number(weight.replace(",", "."));
    const r: TestResult = { benchReps: bench, chins, bodyweight: weight.trim() && Number.isFinite(bw) ? bw : null, date: todayISO() };
    setState((st) => ({ ...st, tests: { ...st.tests, [which]: r } }));
    go(which === "day7" ? "resultat" : "idag");
  }

  const counter = (label: string, sub: string, value: number | null, setV: (v: number | null) => void) => (
    <div className="row" style={{ minHeight: 76 }}>
      <div><div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div><div className="small muted">{sub}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="round" style={{ width: 40, height: 40, fontSize: 20 }} aria-label={`Färre ${label}`} onClick={() => setV(value == null ? 0 : Math.max(0, value - 1))}>−</button>
        <span className="num" aria-live="polite" style={{ width: 44, textAlign: "center", fontSize: 30, color: value == null ? "rgba(244,245,247,.4)" : undefined }}>{value ?? "–"}</span>
        <button type="button" className="round" style={{ width: 40, height: 40, fontSize: 20 }} aria-label={`Fler ${label}`} onClick={() => setV(value == null ? 1 : value + 1)}>+</button>
      </div>
    </div>
  );

  const warm = ["5 min cykel eller rodd", `Bänk 10 × 20 kg, sen 5 × ${Math.round(s.settings.benchTestKg * 0.7)} kg`, "Spotter eller säkerhetsstopp på plats"];

  return (
    <>
      <div className="top">
        <button type="button" className="icon-btn glass" aria-label="Tillbaka" onClick={() => go("idag")}><Icon.back /></button>
        <div className="seg glass" role="tablist" aria-label="Vilket test">
          <button type="button" role="tab" aria-selected={which === "day1"} className={which === "day1" ? "on" : ""} onClick={() => switchTo("day1")}>Dag 1</button>
          <button type="button" role="tab" aria-selected={which === "day7"} className={which === "day7" ? "on" : ""} onClick={() => switchTo("day7")}>Dag 7</button>
        </div>
      </div>
      <h1 className="mt20">Testdag</h1>
      <p className="lead">{which === "day1" ? "Samma test görs på dag 7. Så ser vi om det funkade." : "Samma test som dag 1. Nu får vi svaret."}</p>

      <div className="card glass list">
        <div className="small muted" style={{ padding: "10px 0 2px" }}>Uppvärmning först</div>
        {warm.map((w, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, fontSize: 14 }}>
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? e.target.checked : x)))} style={{ width: 22, height: 22, accentColor: "#DDF47A" }} />
            {w}
          </label>
        ))}
      </div>

      <div className="card glass list">
        {counter("Bänkpress", `max reps på ${fmtKg(s.settings.benchTestKg)} kg`, bench, setBench)}
        {counter("Chins", "max strikta reps", chins, setChins)}
        <label className="row" style={{ minHeight: 76 }}>
          <span><span style={{ display: "block", fontSize: 16, fontWeight: 500 }}>Kroppsvikt</span><span className="small muted">{healthWeight != null ? "från Apple Hälsa, ändra om du vill" : "morgon, fastande"}</span></span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <input className="field num" style={{ fontSize: 30, width: 90 }} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="–" aria-label="Kroppsvikt i kg" />
            <span className="small muted">kg</span>
          </span>
        </label>
      </div>

      <div className="dock">
        <button type="button" className="btn" disabled={!checks.every(Boolean) || bench == null} onClick={save}>
          {!checks.every(Boolean) ? "Värm upp först" : "Spara testet"}
        </button>
      </div>
    </>
  );
}
