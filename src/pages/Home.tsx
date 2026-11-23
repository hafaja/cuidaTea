import { Link } from "react-router-dom";
import { Heart, Users, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { Logo } from "@/components/Layout";
import { ARASAAC_CREDIT, pictoUrl } from "@/lib/arasaac";
import { useMe } from "@/hooks/useSession";

const demo = [2349, 2617, 6964, 32464, 2462, 7179];

const features = [
  { icon: ImageIcon, t: "Pictogramas ARASAAC", d: "Miles de pictogramas libres para construir tableros." },
  { icon: Heart, t: "Fotos del centro", d: "Imágenes reales de cada aula, patio o persona." },
  { icon: Users, t: "Familias y profesionales", d: "Cada uno con su acceso y sus permisos." },
  { icon: ShieldCheck, t: "Datos protegidos", d: "Solo quien cuida al niño puede ver su perfil." },
];

export default function Home() {
  const { session } = useMe();
  const target = session ? "/panel" : "/auth";
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link to={target} className="btn btn-ghost">{session ? "Mi panel" : "Entrar"}</Link>
        </header>
        <section className="mt-10 grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-5xl font-bold leading-tight text-primary">Comunicar es cuidar.</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Tableros de pictogramas personalizados para cada niño y adolescente autista, compartidos entre la familia y el centro.
            </p>
            <Link to={target} className="btn btn-primary mt-8 px-6 py-3 text-lg">Empezar</Link>
          </div>
          <div className="bg-warm shadow-soft grid grid-cols-3 gap-3 rounded-[2rem] p-6">
            {demo.map((id) => (
              <div key={id} className="aspect-square rounded-2xl bg-card p-2 shadow-sm">
                <img src={pictoUrl(id)} alt="" className="size-full object-contain" />
              </div>
            ))}
          </div>
        </section>
        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="card p-5">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
        <footer className="mt-12 space-y-2 text-center text-xs text-muted-foreground">
          <p>{ARASAAC_CREDIT}</p>
          <p>Un proyecto de CuidarConSentido · <Link to="/privacidad" className="underline">Privacidad</Link></p>
        </footer>
      </div>
    </main>
  );
}
