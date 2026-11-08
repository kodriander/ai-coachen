import { useEffect, useRef, useState } from "react";

// Web Speech API finns i Chrome, Edge och Safari (även iOS). Firefox saknar den: då skriver man i stället.
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => Rec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const voiceSupported = () => typeof window !== "undefined" && getCtor() !== null;

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const wanted = useRef(false);

  useEffect(() => () => rec.current?.abort(), []);

  function start() {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Din webbläsare kan inte lyssna. Skriv i stället.");
      return;
    }
    setError(null);
    setFinalText("");
    setInterim("");
    const r = new Ctor();
    r.lang = "sv-SE";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let fin = "";
      let mid = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else mid += res[0].transcript;
      }
      if (fin) setFinalText((t) => (t + " " + fin).trim());
      setInterim(mid);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setError("Mikrofonen är blockerad. Tillåt den i webbläsaren.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Kunde inte lyssna. Försök igen.");
    };
    r.onend = () => {
      // Safari och Chrome slutar lyssna efter en paus; starta om så länge användaren inte tryckt stopp.
      if (wanted.current) {
        try {
          r.start();
          return;
        } catch {
          /* faller igenom till stopp */
        }
      }
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    wanted.current = true;
    r.start();
    setListening(true);
  }

  function stop() {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
  }

  const transcript = (finalText + " " + interim).trim();
  return { listening, transcript, finalText, error, start, stop, setFinalText };
}
