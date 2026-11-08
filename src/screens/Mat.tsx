import { useRef, useState } from "react";
import { fileToImage, logFood } from "../ai";
import { dayNumber, foodTotals, getDay, getState, uid, updateDay, useApp } from "../store";
import { ErrorBox, Icon, Ring, Spinner, useTask, weekday, type Go } from "../ui";

export default function Mat({ go }: { go: Go }) {
  const s = useApp();
  const d = getDay(s);
  const t = foodTotals(d);
  const goal = d.plan?.nutrition;
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const task = useTask();
  const lastComment = d.foods[d.foods.length - 1]?.comment;

  async function add(image?: File) {
    if (!text.trim() && !image) return;
    const img = image ? await fileToImage(image) : undefined;
    const r = await task.run(() => logFood(getState(), { text: text.trim() || undefined, image: img }));
    if (!r) return;
    const time = new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    updateDay((day) => ({ ...day, foods: [...day.foods, { id: uid(), time, description: r.description, protein: Math.round(r.protein), kcal: Math.round(r.kcal), comment: r.comment }] }));
    setText("");
  }

  function remove(id: string) {
    updateDay((day) => ({ ...day, foods: day.foods.filter((f) => f.id !== id) }));
  }

  return (
    <>
      <div className="eyebrow">{weekday(d.date)} · dag {Math.max(1, dayNumber(s))} av 7</div>
      <h1>Mat</h1>

      <div className="card big glass grid2">
        <div className="center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Ring value={goal ? t.protein / goal.protein : 0} size={120} stroke={10} color="#DDF47A" label={`Protein ${t.protein} gram`}>
            <span className="num" style={{ fontSize: 30 }}>{t.protein}</span>
            <span className="small muted">{goal ? `av ${goal.protein} g` : "gram"}</span>
          </Ring>
          <span className="mt8" style={{ fontSize: 13, fontWeight: 500 }}>Protein</span>
        </div>
        <div className="center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Ring value={goal ? t.kcal / goal.kcal : 0} size={120} stroke={10} color="#FFB774" label={`Kalorier ${t.kcal}`}>
            <span className="num" style={{ fontSize: 26 }}>{t.kcal.toLocaleString("sv-SE")}</span>
            <span className="small muted">{goal ? `av ${goal.kcal.toLocaleString("sv-SE")} kcal` : "kcal"}</span>
          </Ring>
          <span className="mt8" style={{ fontSize: 13, fontWeight: 500 }}>Kalorier</span>
        </div>
        {(lastComment || !goal) && (
          <p className="divider center" style={{ gridColumn: "span 2", margin: "4px 0 0", fontSize: 14, lineHeight: 1.45 }}>
            {lastComment ?? "Ingen kostplan än. Gör morgonen först så får du ett mål."}
          </p>
        )}
      </div>

      {d.foods.length > 0 && (
        <div className="card glass list">
          {d.foods.map((f) => (
            <div key={f.id} className="row" style={{ minHeight: 60 }}>
              <div><div style={{ fontWeight: 500 }}>{f.description}</div><div className="small muted">{f.time} · {f.kcal} kcal</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="num" style={{ fontSize: 17 }}>{f.protein} g</span>
                <button type="button" className="icon-btn" style={{ border: 0, width: 36, height: 36 }} aria-label={`Ta bort ${f.description}`} onClick={() => remove(f.id)}><Icon.close /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {goal && d.foods.length === 0 && (
        <div className="card glass list">
          <div className="small muted" style={{ padding: "12px 0 4px" }}>Dagens kostplan</div>
          {goal.meals.map((m, i) => (
            <div key={i} className="row" style={{ fontSize: 14 }}><span>{m.label} · {m.description}</span><span style={{ fontWeight: 600 }}>{m.protein} g</span></div>
          ))}
        </div>
      )}
      <ErrorBox error={task.error} />

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) add(f); }} />
      <div className="dock above-nav">
        <form style={{ display: "flex", gap: 10, width: "100%" }} onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label style={{ flexGrow: 1 }}>
            <span className="sr">Vad åt du?</span>
            <input className="textbar glass" placeholder={task.busy ? "Coachen räknar …" : "Vad åt du?"} value={text} onChange={(e) => setText(e.target.value)} disabled={task.busy} />
          </label>
          {text.trim() ? (
            <button type="submit" className="mic-round" style={{ width: 56, height: 56, background: "var(--lime)", color: "var(--ink)", border: 0 }} aria-label="Logga måltiden" disabled={task.busy}>{task.busy ? <Spinner /> : Icon.check(22)}</button>
          ) : (
            <button type="button" className="mic-round glass" style={{ width: 56, height: 56 }} aria-label="Fota måltiden" disabled={task.busy} onClick={() => fileRef.current?.click()}>{task.busy ? <Spinner /> : <Icon.camera />}</button>
          )}
        </form>
      </div>
    </>
  );
}
