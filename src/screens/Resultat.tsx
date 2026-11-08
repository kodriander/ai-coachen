import { useState } from "react";
import { weekSummary } from "../ai";
import { type AppState, dayNumber, fmtKg, fmtSleep, foodTotals, getState, sortedDays, useApp } from "../store";
import { ErrorBox, Icon, Spinner, recoveryColor, useTask, type Go } from "../ui";

function weekDays(s: AppState) {
  const byNum = new Map<number, ReturnType<typeof sortedDays>[number]>();
  sortedDays(s).forEach((d) => {
    const n = dayNumber(s, d.date);
    if (n >= 1 && n <= 7) byNum.set(n, d);
  });
  return [1, 2, 3, 4, 5, 6, 7].map((n) => byNum.get(n));
}

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

async function shareImage(s: AppState) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d")!;
  g.fillStyle = "#07080C";
  g.fillRect(0, 0, c.width, c.height);
  const grad = g.createRadialGradient(300, 260, 0, 300, 260, 700);
  grad.addColorStop(0, "rgba(221,244,122,.45)");
  grad.addColorStop(1, "rgba(221,244,122,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#F4F5F7";
  g.font = "600 56px Inter, sans-serif";
  g.fillText("7 dagar med AI-coachen", 80, 160);
  g.fillStyle = "rgba(244,245,247,.64)";
  g.font = "500 40px Inter, sans-serif";
  g.fillText(`Bänkpress, max reps på ${fmtKg(s.settings.benchTestKg)} kg`, 80, 330);
  g.fillStyle = "#F4F5F7";
  g.font = "600 280px 'Inter Tight', Inter, sans-serif";
  g.fillText(String(s.tests.day1?.benchReps ?? "–"), 80, 620);
  g.fillStyle = "#DDF47A";
  g.fillText(String(s.tests.day7?.benchReps ?? "?"), 600, 620);
  g.fillStyle = "rgba(244,245,247,.5)";
  g.font = "500 120px Inter, sans-serif";
  g.fillText("→", 410, 580);
  g.fillStyle = "#F4F5F7";
  g.font = "500 44px Inter, sans-serif";
  g.fillText(`Chins  ${s.tests.day1?.chins ?? "–"} → ${s.tests.day7?.chins ?? "?"}`, 80, 800);
  g.fillText(`Kroppsvikt  ${fmtKg(s.tests.day1?.bodyweight)} → ${fmtKg(s.tests.day7?.bodyweight)} kg`, 80, 880);
  g.fillStyle = "rgba(244,245,247,.64)";
  g.font = "500 34px Inter, sans-serif";
  g.fillText("Öppen källkod. Testa själv.", 80, 1250);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "ai-coachen-resultat.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "AI-coachen" });
      return;
    } catch {
      /* avbrutet: ladda ner i stället */
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function Resultat({ go }: { go: Go }) {
  const s = useApp();
  const days = weekDays(s);
  const today = Math.min(7, Math.max(1, dayNumber(s)));
  const t1 = s.tests.day1;
  const t7 = s.tests.day7;
  const recAvg = avg(days.map((d) => d?.whoop?.recovery));
  const sleepAvg = avg(days.map((d) => d?.whoop?.sleepMinutes));
  const protAvg = avg(days.filter((d) => d && d.foods.length).map((d) => foodTotals(d!).protein));
  const passes = days.filter((d) => d?.workoutDoneAt).length;
  const weights = days.map((d) => d?.health?.weightKg ?? null);
  const wVals = weights.filter((x): x is number => x != null);
  const sum = useTask();
  const [summary, setSummary] = useState<string | null>(null);

  const wMin = Math.min(...wVals) - 0.5;
  const wMax = Math.max(...wVals) + 0.5;
  const pts = weights
    .map((w, i) => (w == null ? null : `${(i / 6) * 300 + 10},${70 - ((w - wMin) / Math.max(0.1, wMax - wMin)) * 60}`))
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">7 dagar med AI-coachen</div>
          <h1>Resultat</h1>
        </div>
        <button type="button" className="icon-btn glass" aria-label="Inställningar" onClick={() => go("inst")}><Icon.gear /></button>
      </div>

      <div className="card big glass">
        <div className="small muted">Bänkpress · max reps på {fmtKg(s.settings.benchTestKg)} kg</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 16 }}>
          <div><div className="small muted">Dag 1</div><div className="num" style={{ fontSize: 76, letterSpacing: "-.05em", lineHeight: 1 }}>{t1?.benchReps ?? "–"}</div></div>
          <svg aria-hidden="true" width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="rgba(244,245,247,.5)" strokeWidth="2"><path d="M2 12h34M28 4l8 8-8 8" /></svg>
          <div><div className="small" style={{ color: "var(--lime)" }}>Dag 7</div><div className="num" style={{ fontSize: 76, letterSpacing: "-.05em", lineHeight: 1, color: "var(--lime)" }}>{t7?.benchReps ?? "?"}</div></div>
        </div>
        <div className="divider grid2">
          <div><div className="small muted">Chins</div><div className="num" style={{ fontSize: 20 }}>{t1?.chins ?? "–"} → {t7?.chins ?? "?"}</div></div>
          <div><div className="small muted">Kroppsvikt</div><div className="num" style={{ fontSize: 20 }}>{fmtKg(t1?.bodyweight)} → {t7 ? fmtKg(t7.bodyweight) : "?"}</div></div>
        </div>
        {!t1 && <button type="button" className="btn ghost sm mt14" onClick={() => go("test")}>Gör test dag 1</button>}
        {t1 && !t7 && today >= 7 && <button type="button" className="btn sm mt14" onClick={() => go("test")}>Gör test dag 7</button>}
      </div>

      <div className="card glass">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Recovery</span><span className="muted">{recAvg != null ? `snitt ${Math.round(recAvg)} %` : ""}</span></div>
        <div className="bars7">
          {days.map((d, i) => {
            const r = d?.whoop?.recovery;
            return <i key={i} title={r != null ? `${r} %` : "ingen data"} style={{ height: r != null ? `${Math.max(8, r)}%` : 8, background: r != null ? recoveryColor(r) : "rgba(255,255,255,.10)" }} />;
          })}
        </div>
        <div className="labels7">{[1, 2, 3, 4, 5, 6, 7].map((n) => <span key={n} style={n === today ? { color: "var(--text)", fontWeight: 600 } : undefined}>{n}</span>)}</div>
      </div>

      {wVals.length >= 2 && (
        <div className="card glass">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Vikt från Apple Hälsa</span><span className="muted">{fmtKg(wVals[0])} → {fmtKg(wVals[wVals.length - 1])} kg</span></div>
          <svg role="img" aria-label="Viktkurva" width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none" style={{ marginTop: 8 }}>
            <polyline points={pts} fill="none" stroke="#DDF47A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}

      <div className="grid3 mt14">
        <div className="tile glass"><div className="small muted">Pass</div><div className="num">{passes}</div></div>
        <div className="tile glass"><div className="small muted">Protein/dag</div><div className="num">{protAvg != null ? `${Math.round(protAvg)} g` : "–"}</div></div>
        <div className="tile glass"><div className="small muted">Sömn/natt</div><div className="num">{fmtSleep(sleepAvg)}</div></div>
      </div>

      <div className="card glass">
        {summary ? <div className="coach"><span>{summary}</span></div> : (
          <button type="button" className="btn ghost sm" style={{ width: "100%" }} disabled={sum.busy} onClick={async () => { const r = await sum.run(() => weekSummary(getState())); if (r) setSummary(r); }}>
            {sum.busy ? <><Spinner /> Coachen sammanfattar …</> : "Coachens dom om veckan"}
          </button>
        )}
        <ErrorBox error={sum.error} />
      </div>

      <div className="dock above-nav">
        <button type="button" className="btn" onClick={() => shareImage(s)}>Dela resultatbild</button>
      </div>
    </>
  );
}
