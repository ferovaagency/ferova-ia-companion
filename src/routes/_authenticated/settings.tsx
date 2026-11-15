import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/koa/UI";
import { FeedbackForm } from "@/components/koa/FeedbackForm";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Ajustes y ayuda — Lee con Koa" }, { name: "description", content: "Preferencias de lectura, ayuda y novedades de Lee con Koa." },
    { property: "og:title", content: "Ajustes y ayuda — Lee con Koa" }, { property: "og:description", content: "Tu espacio de preferencias y ayuda lectora." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: Settings,
});
function Settings() {
  return <>
    <PageTitle eyebrow="A tu ritmo" title="Ajustes y ayuda" />
    <section className="border-t border-border py-6"><h2>Mis preferencias</h2><p className="koa-muted my-4">Tu ritmo y las atmósferas que prefieres pueden cambiar.</p><Link className="koa-secondary" to="/onboarding">Cambiar preferencias lectoras</Link></section>
    <section className="border-t border-border py-6"><h2>Privacidad actual</h2><p className="koa-muted mt-3">Tu biblioteca, cuaderno y conversaciones siguen siendo privados. En Mi refugio eliges por separado quién ve tu perfil y cada libro, lista, estrellas o bingo. Compartir un perfil no publica la estantería. Las listas compartidas muestran sus títulos actuales y futuros.</p><Link className="koa-secondary mt-4" to="/refuge">Perfil, amistades y clubes</Link></section>
    <section className="border-t border-border py-6"><h2>Ayuda para tus lecturas</h2><div className="space-y-3 mt-4">
      <details><summary className="cursor-pointer font-semibold">Descubrir con el Oráculo</summary><p className="koa-muted mt-2">Cuenta qué te apetece leer y cuánto tiempo tienes. Recibirás tres opciones; elige una para empezar, guarda una externa en deseos o pide otras tres.</p><Link to="/discover" className="text-primary">Ir a Descubrir</Link></details>
      <details><summary className="cursor-pointer font-semibold">Biblioteca, escáner e importación</summary><p className="koa-muted mt-2">Añade títulos manualmente, usa ISBN o foto de portada, o importa tu archivo de Goodreads. Revisa la edición y las páginas. Los libros en deseos son independientes de los que ya tienes.</p><Link to="/library" className="text-primary">Ir a Biblioteca</Link></details>
      <details><summary className="cursor-pointer font-semibold">Progreso, rachas y relecturas</summary><p className="koa-muted mt-2">Desde Leer registra la página inicial y final o termina un libro que estaba leyendo. Solo el avance real o esa finalización cuenta para la racha; el temporizador sin avance no cuenta. Volver a leer conserva los ciclos anteriores.</p><Link to="/read" search={{ book: undefined }} className="text-primary">Ir a Leer</Link></details>
      <details><summary className="cursor-pointer font-semibold">Cuaderno, citas y conversaciones</summary><p className="koa-muted mt-2">Abre el cuaderno desde Leer o desde cada libro. Las fotos generan un borrador que puedes revisar antes de guardar. Conserva la página y la fuente de las citas; puedes conversar con Koa sobre tu propio libro.</p><Link to="/notebook" search={{ book: undefined }} className="text-primary">Ir al Cuaderno</Link></details>
      <details><summary className="cursor-pointer font-semibold">Crear y completar un bingo</summary><p className="koa-muted mt-2">Personaliza un borrador de 3 × 3, 4 × 4 o 5 × 5. Actívalo cuando esté listo: sus condiciones quedan fijas. Asigna un libro compatible y registra su finalización real antes de completar la casilla. Las experiencias se completan manualmente y no conceden racha.</p><Link to="/adventures" className="text-primary">Ir a Aventuras</Link></details>
      <details><summary className="cursor-pointer font-semibold">Valorar un libro</summary><p className="koa-muted mt-2">Abre el libro en tu biblioteca y elige «Editar libro y reseña» para guardar estrellas opcionales y tu opinión. Tus reseñas ayudan al Oráculo a afinar las recomendaciones.</p></details>
    </div></section>
    <section className="border-t border-border py-6"><h2>Sobre la creadora</h2><p className="koa-muted mt-3">María Fernanda Calderón / Ferova. Lee con Koa busca ayudarte a elegir una lectura para tu contexto, acompañarte mientras lees y conservar tu progreso real.</p></section>
    <section className="border-t border-border py-6"><h2>Novedades · versión 2026.11.15.1</h2><ul className="list-disc pl-5 koa-muted mt-3"><li>Bingos privados con borradores, cinco plantillas originales y validación del historial.</li><li>Ajustes, ayuda y contacto disponibles desde la navegación.</li><li>Se conserva la corrección del retorno de Google y las funciones lectoras existentes.</li></ul></section>
    <section className="border-t border-border py-6 max-w-2xl"><h2 className="mb-5">Sugerencias y ayuda</h2><FeedbackForm /></section>
  </>;
}