import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Devuelve URLs temporales (1 h) para fotos del bucket privado. */
export function useSignedUrls(paths: string[]) {
  const key = [...new Set(paths)].sort().join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) { setUrls({}); return; }
    let alive = true;
    supabase.storage.from("center-photos").createSignedUrls(key.split("|"), 3600).then(({ data }) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      setUrls(map);
    });
    return () => { alive = false; };
  }, [key]);
  return urls;
}
