import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, UserMinus, UserPlus } from "lucide-react";
import { supabase, type Child } from "@/lib/supabase";
import type { Lang } from "@/lib/arasaac";

type Member = { user_id: string; full_name: string | null; relation: string };

export default function Profile({ child, isPro, myId, onSaved }: { child: Child; isPro: boolean; myId?: string; onSaved: () => void }) {
  const [notes, setNotes] = useState(child.notes ?? "");
  const [birth, setBirth] = useState(child.birth_date ?? "");
  const [lang, setLang] = useState<Lang>(child.lang);
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.rpc("list_child_members", { _child: child.id });
    setMembers((data as Member[]) ?? []);
  }, [child.id]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function save() {
    const { error } = await supabase.from("children").update({ notes: notes.slice(0, 2000), birth_date: birth || null, lang }).eq("id", child.id);
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
  async function del() {
    if (prompt(`Esto borra el perfil, su tablero y sus rutinas para todos. Escribe el nombre “${child.name}” para confirmar:`) !== child.name) return;
    const { error } = await supabase.from("children").delete().eq("id", child.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil borrado");
    location.assign("/panel");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Datos</h2>
        <label className="block text-sm font-semibold">Idioma de pictogramas y voz
          <select className="field mt-1" value={lang} onChange={(e) => setLang(e.target.value as Lang)} disabled={!isPro}>
            <option value="es">Castellano</option>
            <option value="ca">Català</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Fecha de nacimiento
          <input className="field mt-1" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} disabled={!isPro} />
        </label>
        <label className="block text-sm font-semibold">Notas (gustos, rutinas, señales de calma)
          <textarea className="field mt-1" rows={6} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isPro} />
        </label>
        {isPro && <button onClick={save} className="btn btn-primary">Guardar</button>}
        {lang !== child.lang && <p className="text-xs text-muted-foreground">Los pictos ya añadidos mantienen su texto; los nuevos se buscarán en el idioma elegido.</p>}
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
      {isPro && (
        <div className="md:col-span-2">
          <button onClick={del} className="btn btn-ghost text-sm text-destructive"><Trash2 className="size-4" /> Borrar este perfil</button>
        </div>
      )}
    </div>
  );
}
