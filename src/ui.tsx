import { useState, type ReactNode } from "react";

export type Screen =
  | "idag" | "morgon" | "plan" | "pass" | "klart" | "rost-pass" | "mat" | "kvall" | "rost-kvall" | "test" | "resultat" | "inst";

export type Go = (s: Screen) => void;

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Icon = {
  home: () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7v9H3z" /></svg>,
  dumbbell: () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>,
  mic: (s = 24) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  food: () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M17 3c-2 2-2 6 0 8v10" /></svg>,
  chart: () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  back: () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M15 5l-7 7 7 7" /></svg>,
  close: () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  check: (s = 16) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.5}><path d="M5 12l5 5 9-10" /></svg>,
  play: () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  camera: () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  gear: () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
};

const AURAS: Record<string, [string, string]> = {
  mint: ["rgba(94,242,184,.5)", "rgba(139,124,255,.42)"],
  amber: ["rgba(255,183,116,.45)", "rgba(94,242,184,.28)"],
  red: ["rgba(255,110,90,.42)", "rgba(139,124,255,.35)"],
  violet: ["rgba(139,124,255,.55)", "rgba(94,242,184,.25)"],
  lime: ["rgba(221,244,122,.45)", "rgba(139,124,255,.35)"],
};

export function Aura({ tone = "mint" }: { tone?: keyof typeof AURAS }) {
  const [a, b] = AURAS[tone];
  return (
    <div className="aura" aria-hidden="true">
      <span style={{ width: 440, height: 440, left: -80, top: -40, background: `radial-gradient(circle, ${a}, transparent 65%)` }} />
      <span style={{ width: 380, height: 380, right: -150, top: 420, background: `radial-gradient(circle, ${b}, transparent 65%)` }} />
    </div>
  );
}

export function recoveryTone(r: number | null | undefined): keyof typeof AURAS {
  if (r == null) return "violet";
  if (r >= 67) return "mint";
  if (r >= 34) return "amber";
  return "red";
}

export function recoveryColor(r: number | null | undefined) {
  if (r == null) return "rgba(244,245,247,.55)";
  if (r >= 67) return "#5EF2B8";
  if (r >= 34) return "#FFB774";
  return "#FF8A7A";
}

export function Ring({ value, size = 210, stroke = 14, color, label, children }: { value: number; size?: number; stroke?: number; color: string; label: string; children: ReactNode }) {
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

export function Nav({ screen, go }: { screen: Screen; go: Go }) {
  const item = (s: Screen, label: string, icon: ReactNode, on: boolean) => (
    <button type="button" aria-label={label} className={on ? "on" : ""} onClick={() => go(s)}>{icon}</button>
  );
  return (
    <nav className="nav glass" aria-label="Huvudmeny">
      {item("idag", "Idag", <Icon.home />, screen === "idag")}
      {item("pass", "Pass", <Icon.dumbbell />, screen === "pass" || screen === "plan")}
      <button type="button" aria-label="Prata med coachen" className="mic" onClick={() => go(new Date().getHours() >= 18 ? "rost-kvall" : "rost-pass")}>{Icon.mic()}</button>
      {item("mat", "Mat", <Icon.food />, screen === "mat")}
      {item("resultat", "Resultat", <Icon.chart />, screen === "resultat")}
    </nav>
  );
}

export function Coach({ children }: { children: ReactNode }) {
  return <div className="coach"><span>{children}</span></div>;
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="error" role="alert">{error}</div>;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/** Kör ett asynkront anrop och håll koll på laddning och fel. */
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}

export const weekday = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("sv-SE", { weekday: "long" }).replace(/^./, (c) => c.toUpperCase());
