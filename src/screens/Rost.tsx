import { useState } from "react";
import { parseCheckinVoice, parseWorkoutVoice } from "../ai";
import { type Feel, fmtKg, getDay, getState, updateDay, useApp } from "../store";
import { ErrorBox, Icon, Spinner, useTask, type Go } from "../ui";
import { useVoice, voiceSupported } from "../voice";

type Parsed = Awaited<ReturnType<typeof parseWorkoutVoice>>;

export default function Rost({ go, mode }: { go: Go; mode: "pass" | "kvall" }) {
  const s = useApp();
  const d = getDay(s);
  const v = useVoice();
  const task = useTask();
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Parsed | null>(null);
  const [typing, setTyping] = useState(!voiceSupported());
  const supported = !typing;
  const back = mode === "pass" ? (d.workoutDoneAt ? "klart" : "pass") : "kvall";
  const text = (supported ? v.transcript : typed).trim();
  const plan = d.plan;

  async function interpret() {
    if (v.listening) v.stop();
    if (!text) return;
    if (mode === "kvall") {
      const r = await task.run(() => parseCheckinVoice(getState(), text));
      if (!r) return;
      updateDay((day) => ({ ...day, checkin: { energy: r.energy, soreness: r.soreness, text: r.text, reply: undefined } }));
      go("kvall");
      return;
    }
    if (!plan) {
      updateDay((day) => ({ ...day, notes: [...day.notes, text] }));
      go(back);
      return;
    }
    const r = await task.run(() => parseWorkoutVoice(getState(), plan, getDay(getState()).log, d.currentExercise, text));
    if (r) setResult(r);
  }

  function save() {
    if (!result || !plan) return;
    updateDay((day) => {
      const log = day.log.map((l) => ({ ...l, sets: [...l.sets] }));
      let lastEx = day.currentExercise;
      result.sets.forEach((st) => {
        const i = Math.max(0, Math.min(plan.workout.exercises.length - 1, st.exerciseIndex));
        const sets = log[i].sets;
        const j = sets.findIndex((x) => !x.done);
        const entry = { weightKg: st.weightKg ?? plan.workout.exercises[i].weightKg, reps: st.reps, feel: st.feel as Feel, done: true };
        if (j === -1) sets.push(entry);
        else sets[j] = entry;
        lastEx = i;
      });
      return {
        ...day,
        log,
        currentExercise: lastEx,
        notes: result.note ? [...day.notes, result.note] : day.notes,
        workoutStartedAt: day.workoutStartedAt ?? Date.now(),
      };
    });
    go(back);
  }

  return (
    <>
      <div className="top">
        <button type="button" className="icon-btn glass" aria-label="Stäng" onClick={() => { v.stop(); go(back); }}><Icon.close /></button>
        <span className="eyebrow">{mode === "pass" ? (plan?.workout.exercises[d.currentExercise]?.name ?? "Passet") : "Kvällens check-in"}</span>
        <span style={{ width: 44 }} />
      </div>

      {!result && (
        <>
          <div className="center mt20" style={{ paddingTop: 12 }}>
            {supported ? (
              <>
                <button type="button" aria-label={v.listening ? "Sluta lyssna" : "Börja prata"} onClick={() => (v.listening ? v.stop() : v.start())}
                  style={{ width: 112, height: 112, borderRadius: "50%", border: 0, background: v.listening ? "var(--lime)" : "rgba(255,255,255,.12)", color: v.listening ? "var(--ink)" : "var(--text)", boxShadow: v.listening ? "0 0 0 14px rgba(221,244,122,.12), 0 0 0 30px rgba(221,244,122,.06)" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {Icon.mic(40)}
                </button>
                {v.listening ? (
                  <div className="wave mt14" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</div>
                ) : (
                  <div className="mt14 small muted" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>{text ? "Tryck igen för att fortsätta prata" : "Tryck och prata som vanligt"}</div>
                )}
                <div className="small" style={{ color: "var(--lime)", fontWeight: 500 }}>{v.listening ? "Lyssnar …" : ""}</div>
              </>
            ) : (
              <p className="lead">{voiceSupported() ? "Skriv det du vill säga:" : "Din webbläsare kan inte lyssna (testa Chrome eller Safari). Skriv i stället:"}</p>
            )}
          </div>

          {supported ? (
            <p className="num" style={{ margin: "22px 8px 0", fontWeight: 500, fontSize: 24, lineHeight: 1.3, minHeight: 64 }}>
              {text ? `”${text}”` : <span className="muted">{mode === "pass" ? "”Körde 52,5 sex gånger, sista var tungt …”" : "”Ganska pigg, lite öm i axlarna, åt bra …”"}</span>}
            </p>
          ) : (
            <textarea className="textbox mt14" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={mode === "pass" ? "Körde 52,5 sex gånger, sista var tungt" : "Ganska pigg, lite öm i axlarna"} aria-label="Vad vill du säga?" />
          )}
          <div className="center mt8" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {supported && text && !v.listening && <button type="button" className="btn ghost sm" onClick={() => v.setFinalText("")}>Börja om</button>}
            {voiceSupported() && (
              <button type="button" className="btn ghost sm" onClick={() => { v.stop(); setTyped(typing ? "" : v.transcript); setTyping(!typing); }}>{typing ? "Prata i stället" : "Skriv i stället"}</button>
            )}
          </div>
          <ErrorBox error={v.error ?? task.error} />
        </>
      )}

      {result && (
        <>
          <p className="num" style={{ margin: "22px 8px 0", fontWeight: 500, fontSize: 20, lineHeight: 1.35, color: "rgba(244,245,247,.7)" }}>”{text}”</p>
          <div className="card glass">
            <div className="small muted">Coachen fyller i</div>
            <div className="mt8" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.sets.length === 0 && <div className="small muted">Inga set hittades i det du sa.</div>}
              {result.sets.map((st, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 15 }}>
                  <span style={{ flex: 1 }}>{plan?.workout.exercises[st.exerciseIndex]?.name ?? "Set"}</span>
                  <span className="num">{fmtKg(st.weightKg ?? plan?.workout.exercises[st.exerciseIndex]?.weightKg)} kg × {st.reps}</span>
                  <span className={"chip " + (st.feel === "Tungt" ? "heavy" : "done")} style={{ height: 26 }}>{st.feel}</span>
                </div>
              ))}
              {result.note && <div className="divider small" style={{ marginTop: 6, color: "rgba(244,245,247,.75)" }}>Anteckning: {result.note}</div>}
            </div>
          </div>
          <div className="coach mt14" style={{ padding: "0 8px" }}><span>{result.reply}</span></div>
        </>
      )}

      <div className="dock">
        {result ? (
          <>
            <button type="button" className="btn ghost" style={{ width: 120 }} onClick={() => { setResult(null); v.setFinalText(""); }}>Ångra</button>
            <button type="button" className="btn" onClick={save}>Spara {result.sets.length} set</button>
          </>
        ) : (
          <button type="button" className="btn" disabled={!text || task.busy} onClick={interpret}>
            {task.busy ? <><Spinner /> Coachen lyssnar …</> : mode === "pass" ? "Fyll i passet" : "Använd det här"}
          </button>
        )}
      </div>
    </>
  );
}
