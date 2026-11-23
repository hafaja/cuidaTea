import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Copy, Trash2, Upload } from "lucide-react";
import { supabase, type CenterPhoto } from "@/lib/supabase";
import { useMe } from "@/hooks/useSession";
import { useSignedUrls } from "@/hooks/useSignedUrls";

export default function Centro() {
  const { profile, isPro, refresh } = useMe();
  const centerId = profile?.center_id ?? null;
  const [centerName, setCenterName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CenterPhoto[]>([]);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const urls = useSignedUrls(photos.map((p) => p.path));

  const load = useCallback(async () => {
    if (!centerId) return;
    const [{ data: c }, { data: k }, { data: ph }] = await Promise.all([
      supabase.from("centers").select("name").eq("id", centerId).maybeSingle(),
      supabase.rpc("my_center_code"),
      supabase.from("center_photos").select("id,label,path").eq("center_id", centerId).order("created_at", { ascending: false }),
    ]);
    setCenterName(c?.name ?? "");
    setCode((k as string) ?? null);
    setPhotos((ph as CenterPhoto[]) ?? []);
  }, [centerId]);
  useEffect(() => { document.title = "Mi centro — CuidaTEA"; void load(); }, [load]);

  if (!isPro) return <p className="text-muted-foreground">Esta sección es para profesionales.</p>;

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = newName.trim();
    if (!n || n.length > 100) return;
    const { error } = await supabase.rpc("create_center", { _name: n });
    if (error) return toast.error(error.message);
    await refresh();
  }
  async function join(e: FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("join_center", { _code: joinCode });
    if (error) return toast.error(error.message);
    if (data === "not_found") return toast.error("Código no válido");
    await refresh();
  }
  async function leave() {
    if (!confirm("¿Salir de este centro? Dejarás de ver sus fotos.")) return;
    await supabase.rpc("leave_center");
    await refresh();
  }
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !centerId || !label.trim()) return toast.error("Elige una foto y escribe su nombre");
    if (!file.type.startsWith("image/")) return toast.error("Solo imágenes");
    if (file.size > 5 * 1024 * 1024) return toast.error("Máximo 5 MB por foto");
    setBusy(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${centerId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("center-photos").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("center_photos").insert({ center_id: centerId, label: label.trim().slice(0, 60), path });
    setBusy(false);
    if (error) return toast.error(error.message);
    setLabel(""); setFile(null);
    (e.target as HTMLFormElement).reset();
    toast.success("Foto añadida");
    void load();
  }
  async function remove(p: CenterPhoto) {
    if (!confirm(`¿Borrar la foto “${p.label}”? Desaparecerá de los tableros que la usen.`)) return;
    await supabase.storage.from("center-photos").remove([p.path]);
    await supabase.from("center_photos").delete().eq("id", p.id);
    void load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Mi centro</h1>
      {!centerId ? (
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={join} className="card space-y-3 p-6">
            <h2 className="text-xl font-bold">Unirme a un centro</h2>
            <p className="text-sm text-muted-foreground">Pide el código a un profesional de tu centro.</p>
            <div className="flex gap-2">
              <input className="field uppercase" placeholder="Código" value={joinCode} maxLength={12} onChange={(e) => setJoinCode(e.target.value)} />
              <button className="btn btn-primary shrink-0">Unirme</button>
            </div>
          </form>
          <form onSubmit={create} className="card space-y-3 p-6">
            <h2 className="text-xl font-bold">Crear mi centro</h2>
            <p className="text-sm text-muted-foreground">Después podrás compartir su código con tu equipo.</p>
            <div className="flex gap-2">
              <input className="field" placeholder="Nombre del centro" value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)} />
              <button className="btn btn-primary shrink-0">Crear</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-lg font-semibold">{centerName}</p>
              {code && (
                <p className="text-sm text-muted-foreground">Código para tu equipo: <strong className="font-mono text-foreground">{code}</strong>
                  <button className="ml-2 align-middle" aria-label="Copiar código" onClick={() => { void navigator.clipboard.writeText(code); toast.success("Código copiado"); }}><Copy className="inline size-4" /></button>
                </p>
              )}
            </div>
            <button onClick={leave} className="btn btn-ghost text-sm">Salir del centro</button>
          </div>
          <p className="text-sm text-muted-foreground">Las fotos solo las ven los profesionales del centro y las familias de sus niños. Evita fotos en las que se reconozca a niños.</p>
          <form onSubmit={upload} className="card flex flex-wrap items-end gap-2 p-5">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="max-w-xs text-sm" />
            <input className="field max-w-xs" placeholder="Nombre (ej. Patio, Aula azul)" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
            <button className="btn btn-primary" disabled={busy}><Upload className="size-4" /> {busy ? "Subiendo…" : "Subir"}</button>
          </form>
          {photos.length === 0 && <p className="text-muted-foreground">Aún no hay fotos.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id} className="card overflow-hidden">
                <div className="aspect-square bg-muted">{urls[p.path] && <img src={urls[p.path]} alt={p.label} className="size-full object-cover" />}</div>
                <div className="flex items-center justify-between p-2 pl-3">
                  <span className="font-semibold">{p.label}</span>
                  <button className="btn btn-ghost btn-icon" aria-label={`Borrar ${p.label}`} onClick={() => remove(p)}><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
