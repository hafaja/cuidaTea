import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { pictoUrl, searchArasaac, type ArasaacResult, type Lang } from "@/lib/arasaac";
import { supabase, type CenterPhoto, type PictoRef } from "@/lib/supabase";
import { useSignedUrls } from "@/hooks/useSignedUrls";

/** Imagen de un picto: ARASAAC o foto del centro (URL firmada). */
export function PictoImg({ p, urls, className = "" }: { p: Pick<PictoRef, "arasaac_id" | "photo_path">; urls: Record<string, string>; className?: string }) {
  const src = p.arasaac_id ? pictoUrl(p.arasaac_id) : p.photo_path ? urls[p.photo_path] : undefined;
  if (!src) return <div className={`bg-muted ${className}`} />;
  return <img src={src} alt="" draggable={false} className={`${p.arasaac_id ? "object-contain" : "object-cover"} ${className}`} />;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-background p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">{title}</h2>
          <button className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={onClose}><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Source = "arasaac" | "board" | "photos";

/**
 * Selector de pictos: buscar en ARASAAC, elegir del tablero del niño o de las fotos del centro.
 * Devuelve un PictoRef con la etiqueta propuesta (se puede editar antes de añadir).
 */
export function PictoChooser({ lang, centerId, board, boardUrls, onPick, editLabel = true }: {
  lang: Lang; centerId: string | null; board?: PictoRef[]; boardUrls?: Record<string, string>;
  onPick: (p: PictoRef) => void; editLabel?: boolean;
}) {
  const [src, setSrc] = useState<Source>(board?.length ? "board" : "arasaac");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArasaacResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<CenterPhoto[]>([]);
  const photoUrls = useSignedUrls(src === "photos" ? photos.map((p) => p.path) : []);

  useEffect(() => {
    if (src !== "photos" || !centerId) return;
    supabase.from("center_photos").select("id,label,path").eq("center_id", centerId).order("label")
      .then(({ data }) => setPhotos((data as CenterPhoto[]) ?? []));
  }, [src, centerId]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || q.trim().length > 50) return;
    setLoading(true);
    setResults(await searchArasaac(q, lang));
    setLoading(false);
  }
  function pick(p: PictoRef) {
    const label = editLabel ? (prompt(lang === "ca" ? "Text que es llegirà en veu alta:" : "Texto que se leerá en voz alta:", p.label) ?? "").trim().slice(0, 40) : p.label;
    if (label) onPick({ ...p, label });
  }

  const tabs: [Source, string][] = [
    ...(board?.length ? [["board", "Del tablero"] as [Source, string]] : []),
    ["arasaac", "Buscar ARASAAC"],
    ...(centerId ? [["photos", "Fotos del centro"] as [Source, string]] : []),
  ];
  const tile = "card w-full p-2 hover:ring-2 hover:ring-ring";

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
          {tabs.map(([t, l]) => (
            <button key={t} onClick={() => setSrc(t)} className={`rounded-full px-3 py-1 text-sm font-semibold ${src === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      )}

      {src === "arasaac" && (
        <>
          <form onSubmit={search} className="flex gap-2">
            <input className="field" autoFocus value={q} maxLength={50} onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "ca" ? "Cercar: menjar, aigua, parc…" : "Buscar: comer, agua, parque…"} />
            <button className="btn btn-primary shrink-0" disabled={loading}><Search className="size-4" /> {loading ? "…" : "Buscar"}</button>
          </form>
          {results?.length === 0 && <p className="text-muted-foreground">No hay resultados para “{q}”.</p>}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {results?.map((r) => {
              const label = r.keywords[0]?.keyword ?? q;
              return (
                <li key={r._id}><button className={tile} onClick={() => pick({ label, arasaac_id: r._id, photo_path: null })}>
                  <img src={pictoUrl(r._id)} alt={label} loading="lazy" className="aspect-square w-full object-contain" />
                  <span className="block truncate text-sm font-semibold">{label}</span>
                </button></li>
              );
            })}
          </ul>
        </>
      )}

      {src === "board" && board && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {board.map((p, i) => (
            <li key={i}><button className={tile} onClick={() => onPick(p)}>
              <PictoImg p={p} urls={boardUrls ?? {}} className="aspect-square w-full rounded-xl" />
              <span className="block truncate text-sm font-semibold">{p.label}</span>
            </button></li>
          ))}
        </ul>
      )}

      {src === "photos" && (
        photos.length === 0 ? <p className="text-muted-foreground">El centro aún no ha subido fotos.</p> : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((p) => (
              <li key={p.id}><button className={tile} onClick={() => pick({ label: p.label, arasaac_id: null, photo_path: p.path })}>
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">{photoUrls[p.path] && <img src={photoUrls[p.path]} alt={p.label} className="size-full object-cover" />}</div>
                <span className="block truncate text-sm font-semibold">{p.label}</span>
              </button></li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** Contenedor que puede pasar a pantalla completa ("modo niño"). */
export function FullScreenable({ full, children }: { full: boolean; children: ReactNode }) {
  return <div className={full ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-6" : ""}>{children}</div>;
}
