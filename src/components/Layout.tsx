import type { ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Heart, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/hooks/useSession";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
      <Heart className="size-6 fill-primary" /> CuidaTEA
    </Link>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useMe();
  const loc = useLocation();
  if (loading) return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;
  if (!session) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export function Layout() {
  const { profile, isPro } = useMe();
  const navigate = useNavigate();
  async function out() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo to="/panel" />
        <div className="flex items-center gap-3">
          {profile && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile.full_name} · {isPro ? "Profesional" : "Familia"}
            </span>
          )}
          <button className="btn btn-ghost btn-icon" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={out}>
            <LogOut className="size-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16"><Outlet /></main>
    </div>
  );
}
