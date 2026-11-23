import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { isConfigured, supabase } from "@/lib/supabase";
import { useMe } from "@/hooks/useSession";

type Mode = "in" | "up" | "reset";
const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e) && e.length <= 255;

export default function Auth() {
  const navigate = useNavigate();
  const { session } = useMe();
  const [mode, setMode] = useState<Mode>("in");
  const [role, setRole] = useState<"familia" | "profesional">("familia");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) navigate("/panel", { replace: true }); }, [session, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const email = form.email.trim();
    if (!emailOk(email)) return toast.error("Email no válido");
    if (mode === "reset") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth` });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Si el email existe, recibirás un enlace para cambiar la contraseña.");
      return setMode("in");
    }
    if (form.password.length < 8 || form.password.length > 72) return toast.error("La contraseña debe tener entre 8 y 72 caracteres");
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
      setBusy(false);
      if (error) return toast.error("Email o contraseña incorrectos");
      navigate("/panel");
    } else {
      if (!accept) { setBusy(false); return toast.error("Debes aceptar la política de privacidad"); }
      const { error } = await supabase.auth.signUp({
        email, password: form.password,
        options: { emailRedirectTo: location.origin + "/panel", data: { full_name: form.name.trim().slice(0, 100), role } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Revisa tu correo para confirmar la cuenta.");
      setMode("in");
    }
  }

  const title = mode === "in" ? "Bienvenido" : mode === "up" ? "Crear cuenta" : "Recuperar contraseña";

  return (
    <main className="grid min-h-dvh place-items-center bg-warm px-5">
      <form onSubmit={submit} className="shadow-soft w-full max-w-sm space-y-4 rounded-[2rem] bg-card p-7">
        <div className="text-center">
          <Link to="/" aria-label="Inicio"><Heart className="mx-auto size-8 fill-primary text-primary" /></Link>
          <h1 className="mt-2 text-3xl font-bold text-primary">{title}</h1>
        </div>
        {!isConfigured && (
          <p className="rounded-2xl bg-accent p-3 text-sm text-accent-foreground">
            Falta configurar Supabase: crea el archivo <code>.env</code> (ver README).
          </p>
        )}
        {mode === "up" && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1" role="radiogroup" aria-label="Tipo de cuenta">
              {(["familia", "profesional"] as const).map((r) => (
                <button type="button" key={r} role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                  className={`rounded-full py-2 text-sm font-semibold capitalize ${role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{r}</button>
              ))}
            </div>
            <label className="block text-sm font-semibold">Nombre
              <input className="field mt-1" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          </>
        )}
        <label className="block text-sm font-semibold">Email
          <input className="field mt-1" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        {mode !== "reset" && (
          <label className="block text-sm font-semibold">Contraseña
            <input className="field mt-1" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        )}
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>He leído y acepto la <Link to="/privacidad" className="text-primary underline">política de privacidad</Link>.</span>
          </label>
        )}
        <button disabled={busy} className="btn btn-primary w-full py-3">
          {mode === "in" ? "Entrar" : mode === "up" ? "Registrarme" : "Enviar enlace"}
        </button>
        <div className="space-y-1 text-center text-sm">
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-primary hover:underline">
            {mode === "in" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
          </button>
          {mode === "in" && (
            <button type="button" onClick={() => setMode("reset")} className="block w-full text-muted-foreground hover:underline">¿Olvidaste la contraseña?</button>
          )}
        </div>
      </form>
    </main>
  );
}
