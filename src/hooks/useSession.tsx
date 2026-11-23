import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; full_name: string | null; center_id: string | null };
type Me = { session: Session | null; profile: Profile | null; isPro: boolean; loading: boolean; refresh: () => Promise<void> };

const Ctx = createContext<Me>({ session: null, profile: null, isPro: false, loading: true, refresh: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setIsPro(false); return; }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, center_id").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p ?? null);
    setIsPro(!!roles?.some((r) => r.role === "profesional"));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // diferido para no bloquear el callback de Supabase
      setTimeout(() => { void loadProfile(s); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(session), [loadProfile, session]);

  return <Ctx.Provider value={{ session, profile, isPro, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useMe = () => useContext(Ctx);
