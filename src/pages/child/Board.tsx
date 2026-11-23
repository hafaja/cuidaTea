import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Delete, Maximize2, Minimize2, Pencil, Volume2, X } from "lucide-react";
import { supabase, type Picto } from "@/lib/supabase";
import { CATEGORIES, categoryLabel, speak, type Lang } from "@/lib/arasaac";
import { FullScreenable, PictoImg } from "@/components/Picto";

export default function Board({ pictos, urls, lang, onChanged }: { pictos: Picto[]; urls: Record<string, string>; lang: Lang; onChanged: () => void }) {
  const [strip, setStrip] = useState<Picto[]>([]);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  const [cat, setCat] = useState<string>("all");

  // Solo se muestran las categorías que tienen pictos
  const used = useMemo(() => CATEGORIES.filter((c) => pictos.some((p) => p.category === c.id)), [pictos]);
  const shown = cat === "all" ? pictos : pictos.filter((p) => p.category === cat);

  async function remove(p: Picto) {
    if (!confirm(`¿Quitar “${p.label}” del tablero?`)) return;
    const { error } = await supabase.from("child_pictos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged();
  }
  async function move(p: Picto, category: string) {
    const { error } = await supabase.from("child_pictos").update({ category }).eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  const chip = (active: boolean) => `whitespace-nowrap rounded-full px-4 py-2 font-semibold ${full ? "text-lg" : "text-sm"} ${active ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"}`;

  return (
    <FullScreenable full={full}>
      <div className="space-y-4">
        <div className="card flex min-h-24 items-center gap-2 overflow-x-auto p-3">
          {strip.length === 0 && <span className="px-2 text-muted-foreground">Toca pictogramas para formar una frase</span>}
          {strip.map((p, i) => (
            <div key={i} className="w-20 shrink-0 text-center">
              <PictoImg p={p} urls={urls} className="mx-auto size-16 rounded-lg" />
              <span className="text-xs font-semibold">{p.label}</span>
            </div>
          ))}
          <div className="ml-auto flex shrink-0 gap-2">
            <button className="btn btn-secondary btn-icon" aria-label="Borrar último" onClick={() => setStrip(strip.slice(0, -1))}><Delete className="size-5" /></button>
            <button className="btn btn-primary btn-icon" aria-label="Leer frase" onClick={() => speak(strip.map((p) => p.label).join(" "), lang)}><Volume2 className="size-5" /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {used.length > 1 ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button className={chip(cat === "all")} onClick={() => setCat("all")}>{lang === "ca" ? "Tots" : "Todos"}</button>
              {used.map((c) => <button key={c.id} className={chip(cat === c.id)} onClick={() => setCat(c.id)}>{c[lang]}</button>)}
            </div>
          ) : <span />}
          <div className="flex gap-2">
            {!full && pictos.length > 0 && (
              <button className={`btn ${edit ? "btn-primary" : "btn-ghost"} text-sm`} onClick={() => setEdit(!edit)}>
                <Pencil className="size-4" /> {edit ? "Terminar" : "Editar"}
              </button>
            )}
            <button className="btn btn-ghost text-sm" onClick={() => { setFull(!full); setEdit(false); }}>
              {full ? <><Minimize2 className="size-4" /> Salir</> : <><Maximize2 className="size-4" /> Modo niño</>}
            </button>
          </div>
        </div>

        {pictos.length === 0 && <p className="text-muted-foreground">Este tablero está vacío. Añade pictogramas en la pestaña “Añadir pictos”.</p>}
        <ul className={`grid gap-3 ${full ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"}`}>
          {shown.map((p) => (
            <li key={p.id} className="relative">
              <button onClick={() => { speak(p.label, lang); setStrip((s) => [...s, p]); }}
                className="w-full rounded-3xl border-2 border-border bg-card p-2 shadow-sm transition active:scale-95">
                <PictoImg p={p} urls={urls} className="aspect-square w-full rounded-2xl" />
                <span className={`mt-1 block truncate font-bold ${full ? "text-lg" : ""}`}>{p.label}</span>
              </button>
              {edit && (
                <>
                  <button aria-label={`Quitar ${p.label}`} onClick={() => remove(p)}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-1.5 text-white shadow"><X className="size-4" /></button>
                  <select aria-label={`Categoría de ${p.label}`} value={p.category} onChange={(e) => move(p, e.target.value)}
                    className="mt-1 w-full rounded-full border bg-card px-2 py-1 text-xs">
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.id, lang)}</option>)}
                  </select>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </FullScreenable>
  );
}
