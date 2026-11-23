import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { supabase, type Child } from "@/lib/supabase";
import { useMe } from "@/hooks/useSession";

export default function Panel() {
  const { profile, isPro } = useMe();
  const [kids, setKids] = useState<Child[] | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("children").select("*").order("name");
    setKids((data as Child[]) ?? []);
  }, []);
  useEffect(() => { document.title = "Mis niños — CuidaTEA"; void load(); }, [load]);

  async function addChild() {
    const n = name.trim();
    if (!n) return;
    if (n.length > 80) return toast.error("Máximo 80 caracteres");
    const { error } = await supabase.from("children").insert({ name: n, center_id: profile?.center_id ?? null });
    if (error) return toast.error(error.message);
    setName("");
    void load();
  }

  return (
    <div className="space-y-8">
      <section className="bg-warm shadow-soft rounded-[2rem] p-6">
        <p className="text-muted-foreground">Hola,</p>
        <h1 className="text-3xl font-bold text-primary">{profile?.full_name ?? ""}</h1>
        {isPro && (
          <Link to="/centro" className="btn btn-secondary mt-4"><Building2 className="size-4" /> Mi centro y fotos</Link>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Perfiles</h2>
        {isPro && (
          <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addChild(); }}>
            <input className="field" placeholder="Nombre del niño o adolescente" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-primary shrink-0"><Plus className="size-4" /> Añadir</button>
          </form>
        )}
        {kids === null && <p className="text-muted-foreground">Cargando…</p>}
        {kids?.length === 0 && (
          <p className="text-muted-foreground">
            {isPro ? "Aún no hay perfiles. Crea el primero." : "Todavía no tienes acceso a ningún perfil. Pide al profesional del centro que te invite con tu email."}
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {kids?.map((k) => (
            <li key={k.id}>
              <Link to={`/nino/${k.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
                <span className="grid size-12 place-items-center rounded-full bg-accent text-xl font-bold text-accent-foreground">{k.name[0]?.toUpperCase()}</span>
                <span className="flex-1 text-lg font-semibold">{k.name}</span>
                <ChevronRight className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
