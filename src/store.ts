import { useSyncExternalStore } from "react";

export type Feel = "Lätt" | "Okej" | "Tungt";

export interface Whoop {
  recovery: number | null;
  sleepMinutes: number | null;
  hrv: number | null;
  rhr: number | null;
}

export interface PlanExercise {
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSec: number;
  cue: string;
}

export interface Meal {
  label: string;
  description: string;
  protein: number;
  kcal: number;
}

export interface Plan {
  headline: string;
  motivation: string;
  intensity: "vila" | "lätt" | "normal" | "tung";
  workout: { title: string; durationMin: number; exercises: PlanExercise[] };
  nutrition: { kcal: number; protein: number; meals: Meal[] };
}

export interface LoggedSet {
  weightKg: number | null;
  reps: number;
  feel: Feel;
  done: boolean;
}

export interface ExerciseLog {
  sets: LoggedSet[];
  feedback?: string;
}

export interface Food {
  id: string;
  time: string;
  description: string;
  protein: number;
  kcal: number;
  comment?: string;
}

export interface Checkin {
  energy: number | null;
  soreness: number | null;
  text: string;
  reply?: string;
}

export interface Health {
  steps: number | null;
  weightKg: number | null;
  activeKcal: number | null;
  updatedAt: number;
}

export interface Day {
  date: string;
  whoop?: Whoop;
  health?: Health;
  feeling?: string;
  plan?: Plan;
  log: ExerciseLog[];
  currentExercise: number;
  workoutStartedAt?: number;
  workoutDoneAt?: number;
  workoutSummary?: string;
  notes: string[];
  foods: Food[];
  checkin?: Checkin;
}

export interface TestResult {
  benchReps: number | null;
  chins: number | null;
  bodyweight: number | null;
  date: string;
}

export interface Profile {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string;
  training: string;
  notes: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  startDate: string;
  benchTestKg: number;
}

export interface AppState {
  v: 1;
  settings: Settings;
  profile: Profile;
  days: Record<string, Day>;
  tests: { day1?: TestResult; day7?: TestResult };
}

const KEY = "ai-coachen:v1";

export function todayISO(d = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function initial(): AppState {
  return {
    v: 1,
    settings: { apiKey: "", model: "claude-opus-5-5", startDate: todayISO(), benchTestKg: 50 },
    profile: { age: null, heightCm: null, weightKg: null, goal: "Mer styrka", training: "Gym, fria vikter och maskiner", notes: "" },
    days: {},
    tests: {},
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.v === 1) return { ...initial(), ...parsed };
    }
  } catch {
    /* tom eller blockerad lagring: börja om */
  }
  return initial();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* lagringen kan vara full eller avstängd; appen fortsätter i minnet */
  }
}

export function getState() {
  return state;
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(next: AppState) {
  state = { ...initial(), ...next };
  persist();
  listeners.forEach((l) => l());
}

export function resetAll() {
  state = { ...initial(), settings: { ...state.settings, startDate: todayISO() }, profile: state.profile };
  persist();
  listeners.forEach((l) => l());
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function emptyDay(date: string): Day {
  return { date, log: [], currentExercise: 0, notes: [], foods: [] };
}

export function getDay(s: AppState, date = todayISO()): Day {
  return s.days[date] ?? emptyDay(date);
}

export function updateDay(fn: (d: Day) => Day, date = todayISO()) {
  setState((s) => ({ ...s, days: { ...s.days, [date]: fn(getDay(s, date)) } }));
}

export function dayNumber(s: AppState, date = todayISO()): number {
  const a = new Date(s.settings.startDate + "T00:00:00");
  const b = new Date(date + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export function sortedDays(s: AppState): Day[] {
  return Object.values(s.days).sort((a, b) => a.date.localeCompare(b.date));
}

export function foodTotals(d: Day) {
  return d.foods.reduce((t, f) => ({ protein: t.protein + f.protein, kcal: t.kcal + f.kcal }), { protein: 0, kcal: 0 });
}

export function workoutVolume(d: Day) {
  let volume = 0;
  let done = 0;
  let total = 0;
  d.log.forEach((ex) =>
    ex.sets.forEach((st) => {
      total++;
      if (st.done) {
        done++;
        volume += (st.weightKg ?? 0) * st.reps;
      }
    }),
  );
  return { volume: Math.round(volume), done, total };
}

/** Bygg en tom logg från planen: varje set förifyllt med målvikt och målreps. */
export function logFromPlan(plan: Plan): ExerciseLog[] {
  return plan.workout.exercises.map((ex) => ({
    sets: Array.from({ length: ex.sets }, () => ({ weightKg: ex.weightKg, reps: ex.reps, feel: "Okej" as Feel, done: false })),
  }));
}

export function fmtSleep(min: number | null | undefined) {
  if (min == null) return "–";
  return `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
}

export function fmtKg(kg: number | null | undefined) {
  if (kg == null) return "–";
  return String(kg).replace(".", ",");
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const n = (v: string | null) => {
  if (v == null || v.trim() === "") return null;
  const x = Number(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(x) ? x : null;
};

/**
 * Tar emot data från iOS-genvägen: appen öppnas med t.ex.
 * ?steps=8432&weight=69,2&kcal=520&hrv=61&rhr=54&sleep=7,4
 * Returnerar true om något sparades.
 */
export function importHealthFromUrl(): boolean {
  const q = new URLSearchParams(window.location.search);
  const keys = ["steps", "weight", "kcal", "hrv", "rhr", "sleep"];
  if (!keys.some((k) => q.has(k))) return false;
  const steps = n(q.get("steps"));
  const weight = n(q.get("weight"));
  const kcal = n(q.get("kcal"));
  const hrv = n(q.get("hrv"));
  const rhr = n(q.get("rhr"));
  const sleepRaw = n(q.get("sleep"));
  // Sömn kan komma i timmar (7,4) eller minuter (444).
  const sleep = sleepRaw == null ? null : sleepRaw > 24 ? Math.round(sleepRaw) : Math.round(sleepRaw * 60);
  updateDay((d) => {
    const prev = d.health;
    const health: Health = {
      steps: steps ?? prev?.steps ?? null,
      weightKg: weight != null ? Math.round(weight * 10) / 10 : prev?.weightKg ?? null,
      activeKcal: kcal != null ? Math.round(kcal) : prev?.activeKcal ?? null,
      updatedAt: Date.now(),
    };
    const w = d.whoop ?? { recovery: null, sleepMinutes: null, hrv: null, rhr: null };
    const whoop = hrv != null || rhr != null || sleep != null
      ? { ...w, hrv: w.hrv ?? (hrv != null ? Math.round(hrv) : null), rhr: w.rhr ?? (rhr != null ? Math.round(rhr) : null), sleepMinutes: w.sleepMinutes ?? sleep }
      : d.whoop;
    return { ...d, health, whoop };
  });
  if (weight != null) {
    setState((s) => ({ ...s, profile: { ...s.profile, weightKg: Math.round(weight * 10) / 10 } }));
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  return true;
}
