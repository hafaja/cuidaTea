import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Maximize2, Minimize2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { supabase, type Child, type Picto, type PictoRef, type Routine, type Step } from "@/lib/supabase";
import { speak } from "@/lib/arasaac";
import { FullScreenable, Modal, PictoChooser, PictoImg } from "@/components/Picto";
import { useSignedUrls } from "@/hooks/useSignedUrls";

// Los pasos hechos se guardan en este dispositivo y se reinician cada día.
const today = () => new Date().toISOString().slice(0, 10);
const doneKey = (rid: string) => `cuidatea:done:${rid}:${today()}`;
function readDone(rid: string): string[] {
  try { return JSON.parse(localStorage.getItem(doneKey(rid)) ?? "[]"); } catch { return []; }
}
function writeDone(rid: string, ids: string[]) {
  try { localStorage.setItem(doneKey(rid), JSON.stringify(ids)); } catch { /* sin almacenamiento */ }
}

export default function Agenda({ child, board, boardUrls }: { child: Child; board: Picto[]; boardUrls: Record<string, string> }) {
  const lang = child.lang;
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const urls = useSignedUrls(steps.filter((s) => s.photo_path).map((s) => s.photo_path!));

  const loadRoutines = useCallback(async () => {
    const { data } = await supabase.from("routines").select("id,title,position").eq("child_id", child.id).order("position").order("created_at");
    const list = (data as Routine[]) ?? [];
    setRoutines(list);
    setCurrent((c) => (c && list.some((r) => r.id === c) ? c : list[0]?.id ?? null));
  }, [child.id]);
  const loadSteps = useCallback(async (rid: string | null) => {
    if (!rid) { setSteps([]); return; }
    const { data } = await supabase.from("routine_steps").select("*").eq("routine_id", rid).order("position").order("created_at");
    setSteps((data as Step[]) ?? []);
    setDone(readDone(rid));
  }, []);
  useEffect(() => { void loadRoutines(); }, [loadRoutines]);
  useEffect(() => { void loadSteps(current); }, [current, loadSteps]);

  const routine = routines?.find((r) => r.id === current);
  const nextIdx = steps.findIndex((s) => !done.includes(s.id));

  function toggle(s: Step) {
    if (!current || edit) return;
    const isDone = done.includes(s.id);
    if (!isDone) speak(s.label, lang);
    const next = isDone ? done.filter((d) => d !== s.id) : [...done, s.id];
    setDone(next); writeDone(current, next);
    if (!isDone && next.length === steps.length && steps.length > 0) {
      setTimeout(() => speak(lang === "ca" ? "Molt bé! Has acabat!" : "¡Muy bien! ¡Has terminado!", lang), 900);
    }
  }
  function reset() {
    if (!current) return;
    setDone([]); writeDone(current, []);
  }

  async function createRoutine(e: FormEvent) {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    const { data, error } = await supabase.from("routines").insert({ child_id: child.id, title: t.slice(0, 60), position: routines?.length ?? 0 }).select("id").single();
    if (error) return toast.error(error.message);
    setNewTitle("");
    await loadRoutines();
    setCurrent(data.id);
    setEdit(true);
  }
  async function renameRoutine() {
    if (!routine) return;
    const t = prompt("Nombre de la rutina:", routine.title)?.trim();
    if (!t) return;
    const { error } = await supabase.from("routines").update({ title: t.slice(0, 60) }).eq("id", routine.id);
    if (error) return toast.error(error.message);
    void loadRoutines();
  }
  async function deleteRoutine() {
    if (!routine || !confirm(`¿Borrar la rutina “${routine.title}” y todos sus pasos?`)) return;
    const { error } = await supabase.from("routines").delete().eq("id", routine.id);
    if (error) return toast.error(error.message);
    setCurrent(null); setEdit(false);
    void loadRoutines();
  }
  async function addStep(p: PictoRef) {
    if (!current) return;
    const { error } = await supabase.from("routine_steps").insert({ routine_id: current, position: steps.length, label: p.label, arasaac_id: p.arasaac_id, photo_path: p.photo_path });
    if (error) return toast.error(error.message);
    toast.success(`Paso “${p.label}” añadido`);
    void loadSteps(current);
  }
  async function removeStep(s: Step) {
    const { error } = await supabase.from("routine_steps").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    void loadSteps(current);
  }
  async function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const a = steps[i], b = steps[j];
    const reordered = [...steps]; reordered[i] = b; reordered[j] = a;
    setSteps(reordered);
    await Promise.all(reordered.map((s, k) => s.position === k ? null : supabase.from("routine_steps").update({ position: k }).eq("id", s.id)));
    void loadSteps(current);
  }

  if (routines === null) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <FullScreenable full={full}>
      <div className="space-y-4">
        {/* Selector de rutina */}
        {!full && (
          <div className="flex flex-wrap items-center gap-2">
            {routines.map((r) => (
              <button key={r.id} onClick={() => { setCurrent(r.id); setEdit(false); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${r.id === current ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"}`}>{r.title}</button>
            ))}
            <form onSubmit={createRoutine} className="flex gap-2">
              <input className="field w-48 py-2 text-sm" placeholder="Nueva rutina (ej. Mañana)" value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} />
              <button className="btn btn-secondary btn-icon" aria-label="Crear rutina"><Plus className="size-4" /></button>
            </form>
          </div>
        )}

        {routines.length === 0 && (
          <div className="card space-y-2 p-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Aún no hay rutinas.</p>
            <p>Una rutina es una secuencia de pasos con pictogramas, por ejemplo <em>Mañana</em>: levantarse → lavarse → vestirse → desayunar → mochila. Escribe un nombre arriba y pulsa <strong>+</strong>.</p>
          </div>
        )}

        {routine && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`font-bold text-primary ${full ? "text-4xl" : "text-2xl"}`}>{routine.title}</h2>
              <div className="flex flex-wrap gap-2">
                {!edit && steps.length > 0 && <button className="btn btn-ghost text-sm" onClick={reset}><RotateCcw className="size-4" /> Reiniciar</button>}
                {!full && (
                  <button className={`btn ${edit ? "btn-primary" : "btn-ghost"} text-sm`} onClick={() => setEdit(!edit)}>
                    <Pencil className="size-4" /> {edit ? "Terminar" : "Editar"}
                  </button>
                )}
                {!edit && (
                  <button className="btn btn-ghost text-sm" onClick={() => setFull(!full)}>
                    {full ? <><Minimize2 className="size-4" /> Salir</> : <><Maximize2 className="size-4" /> Modo niño</>}
                  </button>
                )}
              </div>
            </div>

            {edit && (
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" /> Añadir paso</button>
                <button className="btn btn-ghost text-sm" onClick={renameRoutine}>Cambiar nombre</button>
                <button className="btn btn-ghost text-sm text-destructive" onClick={deleteRoutine}><Trash2 className="size-4" /> Borrar rutina</button>
              </div>
            )}

            {steps.length === 0 && <p className="text-muted-foreground">Esta rutina no tiene pasos. Pulsa <strong>Editar → Añadir paso</strong>.</p>}

            <ol className={`grid gap-3 ${full ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"}`}>
              {steps.map((s, i) => {
                const isDone = done.includes(s.id);
                const isNext = i === nextIdx && !edit;
                return (
                  <li key={s.id} className="relative">
                    <button onClick={() => toggle(s)} aria-pressed={isDone} aria-label={`${i + 1}. ${s.label}${isDone ? " (hecho)" : ""}`}
                      className={`relative w-full rounded-3xl border-4 bg-card p-2 shadow-sm transition active:scale-95 ${isNext ? "border-primary" : "border-transparent"} ${isDone ? "opacity-40" : ""}`}>
                      <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-secondary text-sm font-bold">{i + 1}</span>
                      <PictoImg p={s} urls={urls} className="aspect-square w-full rounded-2xl" />
                      <span className={`mt-1 block truncate font-bold ${full ? "text-xl" : ""}`}>{s.label}</span>
                      {isDone && <span className="absolute inset-0 grid place-items-center"><Check className="size-20 text-primary" strokeWidth={3} /></span>}
                    </button>
                    {edit && (
                      <div className="mt-1 flex justify-center gap-1">
                        <button className="btn btn-ghost btn-icon" aria-label="Mover antes" disabled={i === 0} onClick={() => moveStep(i, -1)}><ArrowUp className="size-4 -rotate-90" /></button>
                        <button className="btn btn-ghost btn-icon" aria-label="Mover después" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)}><ArrowDown className="size-4 -rotate-90" /></button>
                        <button className="btn btn-ghost btn-icon text-destructive" aria-label={`Quitar ${s.label}`} onClick={() => removeStep(s)}><X className="size-4" /></button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!edit && steps.length > 0 && done.length === steps.length && (
              <p className={`text-center font-bold text-primary ${full ? "text-3xl" : "text-xl"}`}>{lang === "ca" ? "Molt bé! 🎉" : "¡Muy bien! 🎉"}</p>
            )}
          </>
        )}
      </div>

      {adding && (
        <Modal title="Añadir paso" onClose={() => setAdding(false)}>
          <PictoChooser lang={lang} centerId={child.center_id} board={board} boardUrls={boardUrls} onPick={(p) => { void addStep(p); }} />
        </Modal>
      )}
    </FullScreenable>
  );
}
