export const pictoUrl = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

export type ArasaacResult = { _id: number; keywords: { keyword: string }[] };

export async function searchArasaac(q: string): Promise<ArasaacResult[]> {
  const term = q.trim();
  if (!term) return [];
  try {
    const r = await fetch(`https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(term)}`);
    if (!r.ok) return [];
    const data = (await r.json()) as ArasaacResult[];
    return data.slice(0, 30);
  } catch {
    return [];
  }
}

export function speak(text: string) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export const ARASAAC_CREDIT = "Pictogramas: Sergio Palao. Origen: ARASAAC (arasaac.org). Licencia CC BY-NC-SA. Propiedad: Gobierno de Aragón.";
