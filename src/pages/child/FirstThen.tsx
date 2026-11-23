import { useEffect, useState } from "react";
import { ArrowRight, Maximize2, Minimize2, RotateCcw, Volume2 } from "lucide-react";
import type { Child, Picto, PictoRef } from "@/lib/supabase";
import { firstThenPhrase, speak } from "@/lib/arasaac";
import { FullScreenable, Modal, PictoChooser, PictoImg } from "@/components/Picto";
import { useSignedUrls } from "@/hooks/useSignedUrls";

type Pair = { first: PictoRef | null; then: PictoRef | null };
const key = (id: string) => `cuidatea:firstthen:${id}`;

export default function FirstThen({ child, board, boardUrls }: { child: Child; board: Picto[]; boardUrls: Record<string, string> }) {
  const lang = child.lang;
  const [pair, setPair] = useState<Pair>(() => {
    try { return JSON.parse(localStorage.getItem(key(child.id)) ?? "") as Pair; } catch { return { first: null, then: null }; }
  });
  const [choosing, setChoosing] = useState<"first" | "then" | null>(null);
  const [full, setFull] = useState(false);
  const [firstDone, setFirstDone] = useState(false);
  const urls = useSignedUrls([pair.first?.photo_path, pair.then?.photo_path].filter(Boolean) as string[]);
  const allUrls = { ...boardUrls, ...urls };

  useEffect(() => {
    try { localStorage.setItem(key(child.id), JSON.stringify(pair)); } catch { /* sin almacenamiento */ }
  }, [pair, child.id]);

  const L = lang === "ca" ? { first: "Primer", then: "Després" } : { first: "Primero", then: "Después" };
  const ready = pair.first && pair.then;

  function Slot({ which }: { which: "first" | "then" }) {
    const p = pair[which];
    const dim = which === "first" && firstDone;
    return (
      <div className="flex flex-1 flex-col items-center gap-3">
        <span className={`rounded-full px-5 py-1 font-bold ${which === "first" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"} ${full ? "text-3xl" : "text-xl"}`}>{L[which]}</span>
        <button
          onClick={() => (p && full ? speak(p.label, lang) : setChoosing(which))}
          className={`w-full max-w-xs rounded-[2rem] border-4 bg-card p-3 shadow-soft transition active:scale-95 ${which === "first" && !firstDone ? "border-primary" : "border-transparent"} ${dim ? "opacity-40" : ""}`}>
          {p ? (
            <>
              <PictoImg p={p} urls={allUrls} className="aspect-square w-full rounded-2xl" />
              <span className={`mt-2 block truncate font-bold ${full ? "text-3xl" : "text-xl"}`}>{p.label}</span>
            </>
          ) : (
            <span className="grid aspect-square w-full place-items-center rounded-2xl bg-muted text-muted-foreground">Toca para elegir</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <FullScreenable full={full}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-end gap-2">
          {ready && (
            <>
              <button className="btn btn-primary" onClick={() => speak(firstThenPhrase(pair.first!.label, pair.then!.label, lang), lang)}><Volume2 className="size-4" /> Escuchar</button>
              <button className={`btn ${firstDone ? "btn-secondary" : "btn-ghost"}`} onClick={() => {
                const v = !firstDone; setFirstDone(v);
                if (v) speak(lang === "ca" ? `Molt bé! Ara, ${pair.then!.label}` : `¡Muy bien! Ahora, ${pair.then!.label}`, lang);
              }}>{firstDone ? <><RotateCcw className="size-4" /> Desmarcar</> : <>✓ {L.first} hecho</>}</button>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => setFull(!full)}>
            {full ? <><Minimize2 className="size-4" /> Salir</> : <><Maximize2 className="size-4" /> Modo niño</>}
          </button>
        </div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Slot which="first" />
          <ArrowRight className={`shrink-0 text-muted-foreground max-sm:rotate-90 sm:mt-40 ${full ? "size-16" : "size-10"}`} />
          <Slot which="then" />
        </div>
        {!full && <p className="text-center text-sm text-muted-foreground">Toca cada casilla para cambiar el pictograma. En modo niño, tocarla lo lee en voz alta.</p>}
      </div>

      {choosing && (
        <Modal title={`Elegir “${L[choosing]}”`} onClose={() => setChoosing(null)}>
          <PictoChooser lang={lang} centerId={child.center_id} board={board} boardUrls={boardUrls} editLabel={false}
            onPick={(p) => { setPair((x) => ({ ...x, [choosing]: p })); setFirstDone(false); setChoosing(null); }} />
        </Modal>
      )}
    </FullScreenable>
  );
}
