import { Link } from "react-router-dom";
import { Logo } from "@/components/Layout";

// BORRADOR: revisar y completar los datos del responsable antes de publicar.
export default function Legal() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
      <Logo />
      <h1 className="text-3xl font-bold text-primary">Política de privacidad</h1>
      <p className="text-muted-foreground">Última actualización: noviembre de 2026.</p>
      <section className="card space-y-3 p-6 text-sm leading-relaxed">
        <p><strong>Responsable:</strong> Jean Marie Vianney Hafashimana (CuidarConSentido). Contacto: [email de contacto].</p>
        <p><strong>Qué datos tratamos:</strong> nombre y email de las personas usuarias; y, de cada niño o adolescente, el nombre, la fecha de nacimiento opcional, notas de cuidado y su tablero de pictogramas. Los centros pueden subir fotos de sus espacios.</p>
        <p><strong>Para qué:</strong> únicamente para crear y compartir tableros de comunicación entre la familia y los profesionales que acompañan al menor.</p>
        <p><strong>Base legal:</strong> el consentimiento de quien ejerce la patria potestad o tutela, y, en el caso de los centros, el desarrollo de su labor educativa o asistencial.</p>
        <p><strong>Quién accede:</strong> solo las personas a las que un profesional ha dado acceso a cada perfil. No vendemos ni cedemos datos a terceros.</p>
        <p><strong>Dónde se guardan:</strong> en servidores de Supabase en la Unión Europea, con acceso restringido por reglas de seguridad a nivel de fila.</p>
        <p><strong>Tus derechos:</strong> acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a [email de contacto]. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
        <p><strong>Pictogramas:</strong> Sergio Palao. Origen: ARASAAC (arasaac.org). Licencia CC BY-NC-SA. Propiedad: Gobierno de Aragón.</p>
      </section>
      <Link to="/" className="btn btn-secondary">Volver</Link>
    </main>
  );
}
