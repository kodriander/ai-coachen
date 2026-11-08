import { useEffect, useState } from "react";
import { getDay, hasCoach, importHealthFromUrl, useApp } from "./store";
import { Aura, Nav, recoveryTone, type Screen } from "./ui";
import Idag from "./screens/Idag";
import Morgon from "./screens/Morgon";
import PlanScreen from "./screens/Plan";
import Pass from "./screens/Pass";
import Klart from "./screens/Klart";
import Rost from "./screens/Rost";
import Mat from "./screens/Mat";
import Kvall from "./screens/Kvall";
import Test from "./screens/Test";
import Resultat from "./screens/Resultat";
import Inst from "./screens/Inst";
import "./openrouter"; // läser inloggningskoden innan adressen städas
import { takeWelcome } from "./local"; // läser parkoppling och ChatGPT-inloggning innan adressen städas

// Körs en gång när appen laddas, så att data från iOS-genvägen sparas direkt.
const healthImported = importHealthFromUrl();
const chatgptWelcome = takeWelcome();

const WITH_NAV: Screen[] = ["idag", "mat", "kvall", "resultat"];

export default function App() {
  const s = useApp();
  const [healthToast, setHealthToast] = useState(healthImported);
  const [welcome, setWelcome] = useState(chatgptWelcome);
  const [screen, setScreen] = useState<Screen>(hasCoach(s) ? "idag" : "inst");
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (!healthToast) return;
    const t = setTimeout(() => setHealthToast(false), 3500);
    return () => clearTimeout(t);
  }, [healthToast]);

  const day = getDay(s);
  const tone =
    screen === "kvall" || screen === "rost-kvall" || screen === "inst" || screen === "test"
      ? "violet"
      : screen === "mat" || screen === "morgon"
        ? "amber"
        : screen === "pass" || screen === "klart" || screen === "rost-pass" || screen === "resultat"
          ? "lime"
          : recoveryTone(day.whoop?.recovery);

  const nav = WITH_NAV.includes(screen);
  return (
    <div className={"app" + (nav ? "" : " no-nav")}>
      <Aura tone={tone} />
      <main className="screen">
        {screen === "idag" && <Idag go={go} />}
        {screen === "morgon" && <Morgon go={go} />}
        {screen === "plan" && <PlanScreen go={go} />}
        {screen === "pass" && <Pass go={go} />}
        {screen === "klart" && <Klart go={go} />}
        {screen === "rost-pass" && <Rost go={go} mode="pass" />}
        {screen === "rost-kvall" && <Rost go={go} mode="kvall" />}
        {screen === "mat" && <Mat go={go} />}
        {screen === "kvall" && <Kvall go={go} />}
        {screen === "test" && <Test go={go} />}
        {screen === "resultat" && <Resultat go={go} />}
        {screen === "inst" && <Inst go={go} />}
      </main>
      {nav && <Nav screen={screen} go={go} />}
      {healthToast && (
        <div role="status" className="glass" style={{ position: "fixed", zIndex: 10, top: "calc(env(safe-area-inset-top) + 12px)", left: "50%", transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 22, fontSize: 14, fontWeight: 500 }}>
          Apple Hälsa uppdaterad
        </div>
      )}
      {welcome && (
        <div role="dialog" aria-modal="true" aria-labelledby="gpt-welcome" style={{ position: "fixed", inset: 0, zIndex: 20, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}>
          <div className="glass card big" style={{ maxWidth: 420, background: "rgba(20,22,30,.92)" }}>
            <h1 id="gpt-welcome" style={{ fontSize: 24 }}>Du använder din ChatGPT-plan</h1>
            <p className="lead">Coachens frågor använder nu din ChatGPT-plan i stället för en API-nyckel. Det kostar inget extra utöver planen, men räknas mot dess gränser. Användningen hanterar du i ChatGPT.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <a className="btn ghost sm" href="https://chatgpt.com/#settings" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Hantera användning</a>
              <button type="button" className="btn sm" onClick={() => setWelcome(false)}>Okej</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
