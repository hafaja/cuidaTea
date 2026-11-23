import { createClient } from "@supabase/supabase-js";
import type { Lang } from "./arasaac";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "https://placeholder.supabase.co", key ?? "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Child = { id: string; name: string; birth_date: string | null; notes: string | null; center_id: string | null; lang: Lang };
export type PictoRef = { label: string; arasaac_id: number | null; photo_path: string | null };
export type Picto = PictoRef & { id: string; position: number; category: string };
export type CenterPhoto = { id: string; label: string; path: string };
export type Routine = { id: string; title: string; position: number };
export type Step = PictoRef & { id: string; routine_id: string; position: number };
