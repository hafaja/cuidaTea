import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, type Child, type Picto } from "@/lib/supabase";
import { useMe } from "@/hooks/useSession";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import Board from "./child/Board";
import Agenda from "./child/Agenda";
import FirstThen from "./child/FirstThen";
import AddPictos from "./child/AddPictos";
import Profile from "./child/Profile";

type Tab = "board" | "agenda" | "firstthen" | "add" | "profile";

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

  const tabs: [Tab, string][] = [
    ["board", "Tablero"], ["agenda", "Agenda"], ["firstthen", "Primero / Después"], ["add", "Añadir pictos"], ["profile", "Perfil"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">{child.name[0]?.toUpperCase()}</span>
        <div>
          <h1 className="text-3xl font-bold text-primary">{child.name}</h1>
          {child.lang === "ca" && <span className="text-sm text-muted-foreground">Pictogrames i veu en català</span>}
        </div>
      </div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="inline-flex gap-1 rounded-full bg-muted p-1" role="tablist">
          {tabs.map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{label}</button>
          ))}
        </div>
      </div>
      {tab === "board" && <Board pictos={pictos} urls={urls} lang={child.lang} onChanged={loadPictos} />}
      {tab === "agenda" && <Agenda child={child} board={pictos} boardUrls={urls} />}
      {tab === "firstthen" && <FirstThen child={child} board={pictos} boardUrls={urls} />}
      {tab === "add" && <AddPictos child={child} count={pictos.length} onAdded={loadPictos} />}
      {tab === "profile" && <Profile child={child} isPro={isPro} myId={session?.user.id} onSaved={loadChild} />}
    </div>
  );
}
