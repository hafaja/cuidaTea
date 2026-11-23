import { useState } from "react";
import { toast } from "sonner";
import { supabase, type Child, type PictoRef } from "@/lib/supabase";
import { ARASAAC_CREDIT, CATEGORIES } from "@/lib/arasaac";
import { PictoChooser } from "@/components/Picto";

export default function AddPictos({ child, count, onAdded }: { child: Child; count: number; onAdded: () => void }) {
  const [category, setCategory] = useState<string>("general");
  const [n, setN] = useState(count);

  async function add(p: PictoRef) {
    const { error } = await supabase.from("child_pictos").insert({ child_id: child.id, position: n, category, ...p });
    if (error) return toast.error(error.message);
    setN((x) => x + 1);
    toast.success(`“${p.label}” añadido`);
    onAdded();
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-2 font-semibold">
        Añadir a la categoría
        <select className="field w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c[child.lang]}</option>)}
        </select>
      </label>
      <PictoChooser lang={child.lang} centerId={child.center_id} onPick={add} />
      <p className="text-xs text-muted-foreground">{ARASAAC_CREDIT}</p>
    </div>
  );
}
