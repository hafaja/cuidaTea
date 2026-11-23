import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Delete, Maximize2, Minimize2, Pencil, Search, Trash2, UserMinus, UserPlus, Volume2, X } from "lucide-react";
import { supabase, type CenterPhoto, type Child, type Picto } from "@/lib/supabase";
import { ARASAAC_CREDIT, pictoUrl, searchArasaac, speak, type ArasaacResult } from "@/lib/arasaac";
import { useMe } from "@/hooks/useSession";
import { useSignedUrls } from "@/hooks/useSignedUrls";

type Tab = "board" | "add" | "profile";

export default function ChildPage() {
  const { id = "" } = useParams();
  const { isPro, session } = useMe();
  const [child, setChild] = useState<Child | null | undefined>(undefined);
  const [pictos, setPictos] = useState<Picto[]>([]);
  const [tab, setTab] = useState<Tab>("board");

  const loadChild = useCallback(async () => {
    const { data } = await supabase.from("children").select("*").eq("id", id).maybeSingle();
    setChild((data as Child) ?? null);
    if (data) document.title = `${data.name} — CuidaTEA`;
  }, [id]);
  const loadPictos = useCallback(async () => {
    const { data } = await supabase.from("child_pictos").select("*").eq("child_id", id).order("position").order("created_at");
    setPictos((data as Picto[]) ?? []);
  }, [id]);
  useEffect(() => { void loadChild(); void loadPictos(); }, [loadChild, loadPictos]);

  const urls = useSignedUrls(pictos.filter((p) => p.photo_path).map((p) => p.photo_path!));

  if (child === undefined) return <p className="text-muted-foreground">Cargando…</p>;
  if (child === null) return <p className="text-muted-foreground">Este perfil no existe o no tienes acceso.</p>;

  const tabs: [Tab, string][] = [["board", "Tablero"], ["add", "Añadir pictos"], ["profile", "Perfil"]];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">{child.name[0]?.toUpperCase()}</span>
        <h1 className="text-3xl font-bold text-primary">{child.name}</h1>
      </div>
      <div className="inline-flex gap-1 rounded-full bg-muted p-1" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {tab === "board" && <Board pictos={pictos} urls={urls} onChanged={loadPictos} />}
      {tab === "add" && <AddPictos childId={id} centerId={child.center_id} count={pictos.length} onAdded={loadPictos} />}
      {tab === "profile" && <Profile child={child} isPro={isPro} myId={session?.user.id} onSaved={loadChild} />}
    </div>
  );
}

function Board({ pictos, urls, onChanged }: { pictos: Picto[]; urls: Record<string, string>; onChanged: () => void }) {
  const [strip, setStrip] = useState<Picto[]>([]);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  const src = (p: Picto) => (p.arasaac_id ? pictoUrl(p.arasaac_id) : p.photo_path ? urls[p.photo_path] : undefined);

  async function remove(p: Picto) {
    if (!confirm(`¿Quitar “${p.label}” del tablero?`)) return;
    const { error } = await supabase.from("child_pictos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  const wrap = full ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-6" : "";

  return (
    <div className={`space-y-4 ${wrap}`}>
      <div className="card flex min-h-24 items-center gap-2 overflow-x-auto p-3">
        {strip.length === 0 && <span className="px-2 text-muted-foreground">Toca pictogramas para formar una frase</span>}
        {strip.map((p, i) => (
          <div key={i} className="w-20 shrink-0 text-center">
            <img src={src(p)} alt="" className="mx-auto size-16 rounded-lg object-contain" />
            <span className="text-xs font-semibold">{p.label}</span>
          </div>
        ))}
        <div className="ml-auto flex shrink-0 gap-2">
          <button className="btn btn-secondary btn-icon" aria-label="Borrar último" onClick={() => setStrip(strip.slice(0, -1))}><Delete className="size-5" /></button>
          <button className="btn btn-primary btn-icon" aria-label="Leer frase" onClick={() => speak(strip.map((p) => p.label).join(" "))}><Volume2 className="size-5" /></button>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {!full && pictos.length > 0 && (
          <button className={`btn ${edit ? "btn-primary" : "btn-ghost"} text-sm`} onClick={() => setEdit(!edit)}>
            <Pencil className="size-4" /> {edit ? "Terminar" : "Editar"}
          </button>
        )}
        <button className="btn btn-ghost text-sm" onClick={() => { setFull(!full); setEdit(false); }}>
          {full ? <><Minimize2 className="size-4" /> Salir</> : <><Maximize2 className="size-4" /> Modo niño</>}
        </button>
      </div>
      {pictos.length === 0 && <p className="text-muted-foreground">Este tablero está vacío. Añade pictogramas en la pestaña “Añadir pictos”.</p>}
      <ul className={`grid gap-3 ${full ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"}`}>
        {pictos.map((p) => (
          <li key={p.id} className="relative">
            <button onClick={() => { speak(p.label); setStrip((s) => [...s, p]); }}
              className="w-full rounded-3xl border-2 border-border bg-card p-2 shadow-sm transition active:scale-95">
              <div className="aspect-square overflow-hidden rounded-2xl">
                {src(p) && <img src={src(p)} alt="" className={`size-full ${p.arasaac_id ? "object-contain" : "object-cover"}`} />}
              </div>
              <span className={`mt-1 block truncate font-bold ${full ? "text-lg" : ""}`}>{p.label}</span>
            </button>
            {edit && (
              <button aria-label={`Quitar ${p.label}`} onClick={() => remove(p)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-1.5 text-white shadow"><X className="size-4" /></button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddPictos({ childId, centerId, count, onAdded }: { childId: string; centerId: string | null; count: number; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArasaacResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<CenterPhoto[]>([]);
  const urls = useSignedUrls(photos.map((p) => p.path));

  useEffect(() => {
    if (!centerId) return;
    supabase.from("center_photos").select("id,label,path").eq("center_id", centerId).order("label")
      .then(({ data }) => setPhotos((data as CenterPhoto[]) ?? []));
  }, [centerId]);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim() || q.trim().length > 50) return;
    setLoading(true);
    setResults(await searchArasaac(q));
    setLoading(false);
  }
  async function add(row: { label: string; arasaac_id?: number; photo_path?: string }) {
    const label = (prompt("Texto que se leerá en voz alta:", row.label) ?? "").trim().slice(0, 40);
    if (!label) return;
    const { error } = await supabase.from("child_pictos").insert({ child_id: childId, position: count, ...row, label });
    if (error) return toast.error(error.message);
    toast.success(`“${label}” añadido`);
    onAdded();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-xl font-bold">Biblioteca ARASAAC</h2>
        <form onSubmit={search} className="flex gap-2">
          <input className="field" value={q} maxLength={50} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: comer, agua, parque…" />
          <button className="btn btn-primary shrink-0" disabled={loading}><Search className="size-4" /> Buscar</button>
        </form>
        {results?.length === 0 && <p className="mt-3 text-muted-foreground">No hay resultados para “{q}”.</p>}
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {results?.map((r) => {
            const label = r.keywords[0]?.keyword ?? q;
            return (
              <li key={r._id}>
                <button onClick={() => add({ label, arasaac_id: r._id })} className="card w-full p-2 hover:ring-2 hover:ring-ring">
                  <img src={pictoUrl(r._id)} alt={label} className="aspect-square w-full object-contain" loading="lazy" />
                  <span className="block truncate text-sm font-semibold">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{ARASAAC_CREDIT}</p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">Fotos del centro</h2>
        {!centerId ? <p className="text-muted-foreground">Este perfil no está vinculado a un centro.</p>
          : photos.length === 0 ? <p className="text-muted-foreground">El centro aún no ha subido fotos.</p> : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {photos.map((p) => (
                <li key={p.id}>
                  <button onClick={() => add({ label: p.label, photo_path: p.path })} className="card w-full p-2 hover:ring-2 hover:ring-ring">
                    <div className="aspect-square overflow-hidden rounded-xl bg-muted">{urls[p.path] && <img src={urls[p.path]} alt={p.label} className="size-full object-cover" />}</div>
                    <span className="block truncate text-sm font-semibold">{p.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}

type Member = { user_id: string; full_name: string | null; relation: string };

function Profile({ child, isPro, myId, onSaved }: { child: Child; isPro: boolean; myId?: string; onSaved: () => void }) {
  const [notes, setNotes] = useState(child.notes ?? "");
  const [birth, setBirth] = useState(child.birth_date ?? "");
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.rpc("list_child_members", { _child: child.id });
    setMembers((data as Member[]) ?? []);
  }, [child.id]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function save() {
    const { error } = await supabase.from("children").update({ notes: notes.slice(0, 2000), birth_date: birth || null }).eq("id", child.id);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    onSaved();
  }
  async function invite(e: FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return toast.error("Email no válido");
    const { data, error } = await supabase.rpc("add_member_by_email", { _child: child.id, _email: em });
    if (error) return toast.error(error.message);
    if (data === "not_found") return toast.error("Esa persona aún no tiene cuenta en CuidaTEA. Pídele que se registre primero.");
    setEmail("");
    toast.success("Acceso concedido");
    void loadMembers();
  }
  async function revoke(m: Member) {
    if (!confirm(`¿Quitar el acceso de ${m.full_name ?? "esta persona"}?`)) return;
    const { error } = await supabase.from("child_members").delete().eq("child_id", child.id).eq("user_id", m.user_id);
    if (error) return toast.error(error.message);
    void loadMembers();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Datos</h2>
        <label className="block text-sm font-semibold">Fecha de nacimiento
          <input className="field mt-1" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} disabled={!isPro} />
        </label>
        <label className="block text-sm font-semibold">Notas (gustos, rutinas, señales de calma)
          <textarea className="field mt-1" rows={6} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isPro} />
        </label>
        {isPro && <button onClick={save} className="btn btn-primary">Guardar</button>}
      </div>
      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Quién tiene acceso</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2">
              <span>{m.full_name}</span>
              <span className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                {m.relation}
                {isPro && m.user_id !== myId && (
                  <button aria-label={`Quitar acceso a ${m.full_name}`} onClick={() => revoke(m)} className="text-destructive"><UserMinus className="size-4" /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {isPro && (
          <form onSubmit={invite} className="flex gap-2">
            <input className="field" placeholder="Email de la familia o profesional" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary btn-icon shrink-0" aria-label="Dar acceso"><UserPlus className="size-5" /></button>
          </form>
        )}
      </div>
      {isPro && <DeleteChild child={child} />}
    </div>
  );
}

function DeleteChild({ child }: { child: Child }) {
  async function del() {
    if (prompt(`Esto borra el perfil y su tablero para todos. Escribe el nombre “${child.name}” para confirmar:`) !== child.name) return;
    const { error } = await supabase.from("children").delete().eq("id", child.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil borrado");
    location.assign("/panel");
  }
  return (
    <div className="md:col-span-2">
      <button onClick={del} className="btn btn-ghost text-sm text-destructive"><Trash2 className="size-4" /> Borrar este perfil</button>
    </div>
  );
}
