// Koppling till den lokala servern (npm start). Finns bara när appen körs från
// din egen dator; på GitHub Pages svarar ingen server och allt annat funkar som vanligt.
import { useSyncExternalStore } from "react";
import { getState, setState } from "./store";

export interface LocalStatus {
  server: "ai-coachen";
  paired: boolean;
  loopback: boolean;
  chatgpt: { connected: boolean; planUsage: boolean; email: string | null } | null;
  pairUrls: string[];
  loginUrl: string;
}

let welcome = false;

// Läs parkopplingskoden från QR-länken (?pair=...) innan något annat städar adressen.
(() => {
  const url = new URL(window.location.href);
  const pair = url.searchParams.get("pair");
  const chatgpt = url.searchParams.get("chatgpt");
  if (!pair && !chatgpt) return;
  url.searchParams.delete("pair");
  url.searchParams.delete("chatgpt");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  setState((st) => ({
    ...st,
    settings: {
      ...st.settings,
      ...(pair ? { serverToken: pair } : {}),
      // Parkoppling och ChatGPT-inloggning betyder båda: kör coachen via datorns ChatGPT-plan.
      provider: "chatgpt" as const,
    },
  }));
  if (chatgpt === "welcome") welcome = true;
})();

export const takeWelcome = () => {
  const w = welcome;
  welcome = false;
  return w;
};

let status: LocalStatus | null = null;
const listeners = new Set<() => void>();

export const localHeaders = (): Record<string, string> => {
  const t = getState().settings.serverToken;
  return t ? { "X-Coach-Token": t } : {};
};

export async function refreshLocal() {
  try {
    const r = await fetch("api/local/status", { headers: localHeaders(), cache: "no-store" });
    const j = r.ok && (r.headers.get("content-type") || "").includes("json") ? ((await r.json()) as LocalStatus) : null;
    status = j?.server === "ai-coachen" ? j : null;
  } catch {
    status = null;
  }
  listeners.forEach((l) => l());
  return status;
}

export function useLocal() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

export const localReady = refreshLocal();

export async function localJson<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...localHeaders(), ...(init?.headers ?? {}) } });
  } catch {
    throw new Error("Får ingen kontakt med AI-coachen på datorn. Är den igång, och är du på samma wifi?");
  }
  const j = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (!r.ok) throw new Error(j.message || `Fel från datorn (${r.status}).`);
  return j;
}
