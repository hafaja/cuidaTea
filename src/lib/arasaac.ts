export type Lang = "es" | "ca";

export const pictoUrl = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

export type ArasaacResult = { _id: number; keywords: { keyword: string }[] };

export async function searchArasaac(q: string, lang: Lang = "es"): Promise<ArasaacResult[]> {
  const term = q.trim();
  if (!term) return [];
  try {
    const r = await fetch(`https://api.arasaac.org/v1/pictograms/${lang}/search/${encodeURIComponent(term)}`);
    if (!r.ok) return [];
    const data = (await r.json()) as ArasaacResult[];
    return data.slice(0, 30);
  } catch {
    return [];
  }
}

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => { voices = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

export function speak(text: string, lang: Lang = "es") {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ca" ? "ca-ES" : "es-ES";
  const v = voices.find((x) => x.lang.toLowerCase().startsWith(lang));
  if (v) u.voice = v;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export const firstThenPhrase = (a: string, b: string, lang: Lang) =>
  lang === "ca" ? `Primer ${a}, després ${b}` : `Primero ${a}, después ${b}`;

export const CATEGORIES = [
  { id: "general", es: "General", ca: "General" },
  { id: "necesidades", es: "Necesidades", ca: "Necessitats" },
  { id: "comida", es: "Comida", ca: "Menjar" },
  { id: "acciones", es: "Acciones", ca: "Accions" },
  { id: "lugares", es: "Lugares", ca: "Llocs" },
  { id: "personas", es: "Personas", ca: "Persones" },
  { id: "emociones", es: "Emociones", ca: "Emocions" },
  { id: "juego", es: "Juego", ca: "Joc" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string, lang: Lang) => CATEGORIES.find((c) => c.id === id)?.[lang] ?? id;

export const ARASAAC_CREDIT = "Pictogramas: Sergio Palao. Origen: ARASAAC (arasaac.org). Licencia CC BY-NC-SA. Propiedad: Gobierno de Aragón.";
