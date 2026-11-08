import { useEffect, useState } from "react";
import { getDay, importHealthFromUrl, useApp } from "./store";
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

// Körs en gång när appen laddas, så att data från iOS-genvägen sparas direkt.
const healthImported = importHealthFromUrl();

const WITH_NAV: Screen[] = ["idag", "mat", "kvall", "resultat"];

export default function App() {
  const s = useApp();
  const [healthToast, setHealthToast] = useState(healthImported);
  const [screen, setScreen] = useState<Screen>(s.settings.apiKey ? "idag" : "inst");
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
    </div>
  );
}
