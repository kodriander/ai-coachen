import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  type AppState,
  type Day,
  type ExerciseLog,
  type Plan,
  dayNumber,
  foodTotals,
  getDay,
  sortedDays,
  todayISO,
  workoutVolume,
} from "./store";

export const MODELS = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5" },
];

const SYSTEM = `Du är en personlig tränings- och kostcoach i en app där användaren låter AI styra sin träning och kost i 7 dagar.
Skriv alltid på svenska. Var kort, tydlig, personlig och rak, som en coach som står bredvid. Inga emoji. Inga utropstecken i rad.
Säkerhet går först: inga extrema dieter eller stora kaloriunderskott, inga maxtester utan uppvärmning, och tung träning bara när kroppen klarar det.
Låg recovery (under ca 34 %) betyder vila eller lätt rörlighet. Medel (34–66 %) betyder normal eller lite lättare träning. Hög (67 % och uppåt) betyder att det går att pressa.
Använd det användaren faktiskt loggat (set, mat, kvällsrapporter) när du planerar. Progressiv överbelastning: höj vikt eller reps när förra passet gick lätt.
Du är inte läkare. Vid smärta (inte vanlig träningsvärk) ska användaren vila den delen och söka vård om det inte går över.`;

function client(s: AppState) {
  if (!s.settings.apiKey) throw new Error("Lägg in din API-nyckel under Inställningar först.");
  return new Anthropic({ apiKey: s.settings.apiKey, dangerouslyAllowBrowser: true });
}

async function ask<T extends z.ZodType>(
  s: AppState,
  schema: T,
  content: Anthropic.Beta.Messages.BetaContentBlockParam[] | string,
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<T>> {
  const model = s.settings.model || "claude-opus-5-5";
  // Haiku har ingen fallback på servern; övriga modeller får fallback om en förfrågan nekas.
  const withFallback = !model.startsWith("claude-haiku");
  try {
    const res = await client(s).beta.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content }],
      ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (res.stop_reason === "refusal") throw new Error("Coachen kunde inte svara på det här. Försök formulera om.");
    if (res.parsed_output == null) throw new Error("Coachen gav ett svar som inte gick att läsa. Försök igen.");
    return res.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("API-nyckeln fungerar inte. Kolla den under Inställningar.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("För många förfrågningar just nu. Vänta en minut och försök igen.");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Ingen kontakt med Claude. Kolla internet och försök igen.");
    throw e;
  }
}

function daySummary(d: Day) {
  const t = foodTotals(d);
  const v = workoutVolume(d);
  return {
    datum: d.date,
    whoop: d.whoop,
    apple_halsa: d.health ? { steg: d.health.steps, vikt_kg: d.health.weightKg, aktiva_kcal: d.health.activeKcal } : null,
    kansla_morgon: d.feeling,
    pass: d.plan
      ? {
          titel: d.plan.workout.title,
          intensitet: d.plan.intensity,
          loggat: d.plan.workout.exercises.map((ex, i) => ({
            ovning: ex.name,
            mal: `${ex.sets}x${ex.reps} @ ${ex.weightKg ?? "kroppsvikt"} kg`,
            set: (d.log[i]?.sets ?? []).filter((st) => st.done).map((st) => `${st.weightKg ?? 0}kg x${st.reps} (${st.feel})`),
          })),
          volym_kg: v.volume,
          klart: !!d.workoutDoneAt,
        }
      : null,
    anteckningar: d.notes,
    mat: { protein_g: t.protein, kcal: t.kcal, mal: d.plan?.nutrition },
    kvall: d.checkin,
  };
}

function context(s: AppState) {
  const today = todayISO();
  const history = sortedDays(s)
    .filter((d) => d.date < today)
    .slice(-4)
    .map(daySummary);
  return JSON.stringify(
    {
      dag: `${dayNumber(s)} av 7`,
      profil: s.profile,
      test_dag1: s.tests.day1,
      tidigare_dagar: history,
    },
    null,
    1,
  );
}

// ---------- Whoop-skärmdump ----------

const WhoopSchema = z.object({
  recovery: z.number().nullable().describe("Recovery i procent, 0-100"),
  sleepMinutes: z.number().nullable().describe("Total sömntid i minuter"),
  hrv: z.number().nullable().describe("HRV i ms"),
  rhr: z.number().nullable().describe("Vilopuls i slag per minut"),
  found: z.number().describe("Antal av de fyra värdena som syntes i bilden"),
});

export async function readWhoop(s: AppState, image: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }) {
  return ask(
    s,
    WhoopSchema,
    [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
      {
        type: "text",
        text: "Det här är en skärmdump från Whoop (eller liknande). Läs av recovery %, total sömntid, HRV och vilopuls. Sätt null på det som inte syns. Gissa inte.",
      },
    ],
    "low",
  );
}

// ---------- Dagens plan ----------

const PlanSchema = z.object({
  headline: z.string().describe("Kort rubrik för dagen, max 5 ord"),
  motivation: z.string().describe("1-2 meningar: varför dagen ser ut så här, kopplat till sömn och recovery"),
  intensity: z.enum(["vila", "lätt", "normal", "tung"]),
  workout: z.object({
    title: z.string().describe("t.ex. 'Bröst, axlar, triceps' eller 'Vila och rörlighet'"),
    durationMin: z.number(),
    exercises: z.array(
      z.object({
        name: z.string(),
        sets: z.number(),
        reps: z.number(),
        weightKg: z.number().nullable().describe("null för kroppsvikt eller rörlighet"),
        restSec: z.number(),
        cue: z.string().describe("En kort teknik- eller fokusrad"),
      }),
    ),
  }),
  nutrition: z.object({
    kcal: z.number(),
    protein: z.number().describe("gram protein för dagen"),
    meals: z.array(
      z.object({
        label: z.string().describe("Frukost, Lunch, Före pass, Middag, Kvällsmål ..."),
        description: z.string(),
        protein: z.number(),
        kcal: z.number(),
      }),
    ),
  }),
});

export async function makePlan(s: AppState): Promise<Plan> {
  const d = getDay(s);
  return ask(
    s,
    PlanSchema,
    `Gör dagens plan: ett träningspass (övningar, set, reps, vikt, vila) och en kostplan (kalorier, protein, måltider).
Dagens Whoop: ${JSON.stringify(d.whoop ?? null)}. Apple Hälsa i dag (steg, vikt från våg): ${JSON.stringify(d.health ?? null)}. Känsla i kroppen: ${d.feeling ?? "okänd"}.
Planera passet så att det passar veckans mål och vad som tränades de senaste dagarna (variera muskelgrupper).
Är det dag 1 eller dag 7: håll passet lätt, eftersom testet (bänk max reps på ${s.settings.benchTestKg} kg, chins, kroppsvikt) görs den dagen.

Bakgrund:
${context(s)}`,
    "medium",
  );
}

// ---------- Feedback på set i realtid ----------

const ShortSchema = z.object({ text: z.string().describe("Max två korta meningar") });

export async function setFeedback(s: AppState, plan: Plan, exIndex: number, log: ExerciseLog) {
  const ex = plan.workout.exercises[exIndex];
  const done = log.sets.filter((st) => st.done);
  const r = await ask(
    s,
    ShortSchema,
    `Användaren är mitt i passet. Övning: ${ex.name}, mål ${ex.sets}x${ex.reps} @ ${ex.weightKg ?? "kroppsvikt"} kg.
Gjorda set: ${done.map((st, i) => `set ${i + 1}: ${st.weightKg ?? 0} kg x ${st.reps} (${st.feel})`).join("; ")}.
Set kvar: ${ex.sets - done.length}.
Ge en kort kommentar och säg vad nästa set ska vara (vikt och reps). Är övningen klar, säg det kort och peppa inför nästa.`,
    "low",
  );
  return r.text;
}

// ---------- Röst: prata in passet ----------

const VoiceWorkoutSchema = z.object({
  sets: z.array(
    z.object({
      exerciseIndex: z.number().describe("Index i övningslistan"),
      weightKg: z.number().nullable(),
      reps: z.number(),
      feel: z.enum(["Lätt", "Okej", "Tungt"]),
    }),
  ),
  note: z.string().nullable().describe("Allt annat användaren sa som är värt att minnas (smärta, energi, känsla). null om inget."),
  reply: z.string().describe("Kort bekräftelse från coachen, max en mening"),
});

export async function parseWorkoutVoice(s: AppState, plan: Plan, log: ExerciseLog[], current: number, transcript: string) {
  const list = plan.workout.exercises.map((ex, i) => ({
    index: i,
    namn: ex.name,
    mal: `${ex.sets}x${ex.reps} @ ${ex.weightKg ?? "kroppsvikt"}`,
    gjorda_set: (log[i]?.sets ?? []).filter((st) => st.done).length,
  }));
  return ask(
    s,
    VoiceWorkoutSchema,
    `Användaren pratade in det här under passet (transkriberat, kan innehålla hörfel):
"${transcript}"

Övningar i passet: ${JSON.stringify(list)}
Övningen användaren står på nu har index ${current}.
Gör om det användaren sa till set i ordning. Om ingen övning nämns, gäller det övningen användaren står på nu. Om vikt inte nämns, använd målvikten.
"Tungt", "jobbigt", "sista var segt" = Tungt. "Lätt", "flöt på" = Lätt. Annars Okej.`,
    "low",
  );
}

// ---------- Mat ----------

const FoodSchema = z.object({
  description: z.string().describe("Kort namn på måltiden"),
  protein: z.number(),
  kcal: z.number(),
  comment: z.string().describe("En kort kommentar om hur dagen ligger till mot målet"),
});

export async function logFood(s: AppState, input: { text?: string; image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } }) {
  const d = getDay(s);
  const t = foodTotals(d);
  const goal = d.plan?.nutrition;
  const blocks: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  if (input.image) blocks.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
  blocks.push({
    type: "text",
    text: `Uppskatta protein (g) och kalorier för den här måltiden. ${input.text ? `Användaren skrev: "${input.text}".` : ""}
Hittills i dag: ${t.protein} g protein, ${t.kcal} kcal. Mål: ${goal ? `${goal.protein} g protein, ${goal.kcal} kcal` : "okänt"}.
Kommentaren ska räkna in den här måltiden.`,
  });
  return ask(s, FoodSchema, blocks, "low");
}

// ---------- Pass klart ----------

export async function workoutSummary(s: AppState) {
  const d = getDay(s);
  const r = await ask(
    s,
    ShortSchema,
    `Passet är klart. Ge en kort sammanfattning (max två meningar): vad som gick bra jämfört med planen, och vad användaren ska göra närmast (t.ex. äta, protein kvar).
Dagens data: ${JSON.stringify(daySummary(d))}`,
    "low",
  );
  return r.text;
}

// ---------- Kväll ----------

const VoiceCheckinSchema = z.object({
  energy: z.number().nullable().describe("1-5, null om det inte framgår"),
  soreness: z.number().nullable().describe("1-5, null om det inte framgår"),
  text: z.string().describe("Användarens rapport, sammanfattad i första person"),
});

export async function parseCheckinVoice(s: AppState, transcript: string) {
  return ask(
    s,
    VoiceCheckinSchema,
    `Användaren berättade om sin dag (transkriberat, kan innehålla hörfel): "${transcript}". Plocka ut energi och ömhet på en skala 1-5 om det går, och sammanfatta resten.`,
    "low",
  );
}

export async function checkinReply(s: AppState) {
  const d = getDay(s);
  const r = await ask(
    s,
    ShortSchema,
    `Kvällscheck-in. Ge en kort reaktion på dagen och säg vad som händer i morgon (vilken typ av pass, ett tips för sömn eller mat). Max två meningar.
Dagens data: ${JSON.stringify(daySummary(d))}
Bakgrund: ${context(s)}`,
    "medium",
  );
  return r.text;
}

// ---------- Resultat ----------

export async function weekSummary(s: AppState) {
  const r = await ask(
    s,
    z.object({ text: z.string().describe("3-5 meningar") }),
    `Experimentet är slut eller nästan slut. Sammanfatta veckan ärligt: vad som förändrades (testen dag 1 och dag 7), vad som funkade, vad som inte funkade, och ett förslag för nästa vecka.
Test dag 1: ${JSON.stringify(s.tests.day1 ?? null)}. Test dag 7: ${JSON.stringify(s.tests.day7 ?? null)}.
Alla dagar: ${JSON.stringify(sortedDays(s).map(daySummary))}`,
    "medium",
  );
  return r.text;
}

// ---------- Bilder ----------

/** Skala ner en bild till max 1280 px och returnera base64 (JPEG). */
export async function fileToImage(file: File): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Kunde inte läsa bilden."));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.85).split(",")[1];
    return { data, mediaType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
