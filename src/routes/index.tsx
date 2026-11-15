import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Sparkles, NotebookPen, ScanLine } from "lucide-react";
import { PublicOracleDemo } from "@/components/koa/PublicOracleDemo";
import { Koa } from "@/components/koa/UI";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lee con Koa — Descubre tu próxima lectura" },
      {
        name: "description",
        content:
          "Cuéntale a Koa cómo estás y descubre tres libros para tu momento. Organiza tu biblioteca, guarda tus citas y vuelve a disfrutar de leer.",
      },
      { property: "og:title", content: "Lee con Koa — Tu próxima lectura empieza contigo" },
      { property: "og:description", content: "Tres lecturas para tu momento, una biblioteca privada y tu progreso real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://librero-ia.ferova.com.co/koa/read.webp" },
      { name: "twitter:image", content: "https://librero-ia.ferova.com.co/koa/read.webp" },
    ],
    links: [{ rel: "canonical", href: "https://librero-ia.ferova.com.co/" }],
  }),
  component: Home,
});
function Home() {
  return (
    <div className="koa-app">
      <header className="koa-header">
        <Link to="/" className="koa-brand">
          <img src="/koa/icon.webp" width={44} height={44} alt="" />
          <span>Lee con Koa</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/faq" className="koa-muted">Ayuda</Link>
          <a className="koa-muted hidden sm:block" href="#como-funciona">
            Cómo funciona
          </a>
          <Link to="/auth" className="koa-secondary">
            Entrar
          </Link>
        </nav>
      </header>
      <main className="koa-container">
        <section className="koa-hero min-h-[490px]">
          <div>
            <p className="koa-eyebrow">Tu compañero para volver a leer</p>
            <h1>
              ¿No sabes qué leer?
              <br />
              <span className="text-primary">Descúbrelo con Koa.</span>
            </h1>
            <p className="koa-muted text-base mt-6 max-w-xl">
              Hay un libro para cada momento. Cuéntale a Koa cómo estás, qué te apetece y cuánto
              tiempo tienes. Descubre tres historias por las que empezar.
            </p>
            <Link to="/auth" className="koa-button mt-7">
              Encontrar mi próxima lectura <ArrowRight size={18} />
            </Link>
            <p className="koa-muted mt-4 text-xs">Tu ritmo. Tus gustos. Tu próxima historia.</p>
          </div>
          <Koa pose="read" className="!max-h-[440px]" />
        </section>
        <PublicOracleDemo/>
        <section id="como-funciona" className="py-10">
          <p className="koa-eyebrow">Del «no sé qué leer» a la primera página</p>
          <h2 className="text-3xl mb-7">Tu próxima lectura empieza contigo.</h2>
          <div className="koa-recs">
            {[
              [
                "01",
                "Cuéntale tu momento",
                "Algo ligero después de un día largo. Intriga para desconectar. Una historia que te saque del bloqueo.",
              ],
              [
                "02",
                "Descubre tus tres opciones",
                "Koa considera tus pendientes y preferencias, y explica por qué cada libro podría encajar contigo.",
              ],
              [
                "03",
                "Haz espacio para leer",
                "Elige tu historia, guarda tu avance y conserva las palabras que te acompañan.",
              ],
            ].map(([n, t, d]) => (
              <article className="koa-card" key={n}>
                <span className="text-accent text-sm">{n}</span>
                <h3 className="text-xl font-bold my-4">{t}</h3>
                <p className="koa-muted">{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="grid md:grid-cols-2 gap-6 py-8">
          <div className="koa-card">
            <p className="koa-eyebrow">Una biblioteca que va contigo</p>
            <h2>
              Las historias que tienes.
              <br />
              Las que aún te esperan.
            </h2>
            <p className="koa-muted my-5">
              Añade libros por ISBN, importa tus lecturas de Goodreads y organiza tus pendientes,
              pausas y relecturas.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="koa-chip">
                <ScanLine size={16} />
                Escáner ISBN
              </span>
              <span className="koa-chip">
                <BookOpen size={16} />
                Historial de lectura
              </span>
            </div>
          </div>
          <div className="koa-card">
            <p className="koa-eyebrow">Las palabras que se quedan</p>
            <h2>Un cuaderno para tus descubrimientos.</h2>
            <p className="koa-muted my-5">
              Guarda citas, dicta una reflexión o transcribe un fragmento con una foto. Conversa con
              Koa sobre lo que estás leyendo.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="koa-chip">
                <NotebookPen size={16} />
                Tu cuaderno privado
              </span>
              <span className="koa-chip">
                <Sparkles size={16} />
                Koa te acompaña
              </span>
            </div>
          </div>
        </section>
        <section className="koa-message my-10">
          <Koa pose="welcome" className="!w-24 !h-24" />
          <div>
            <h2>Volver también es parte de leer.</h2>
            <p className="koa-muted mt-3">
              Registra tus avances y celebra tu constancia. Si necesitas una pausa, tu biblioteca y
              tu historia siguen aquí.
            </p>
          </div>
        </section>
        <div className="text-center py-10">
          <h2 className="text-3xl">Una historia para quien eres hoy.</h2>
          <Link to="/auth" className="koa-button mt-6">
            Elegir con Koa <ArrowRight size={18} />
          </Link>
        </div>
      </main>
      <footer className="koa-footer">
        <span>Lee con Koa · Un producto de Ferova</span>
        <Link to="/blog/mejores-recomendadores-libros-ia">Lecturas y recomendaciones</Link>
        <Link to="/faq">Preguntas y contacto</Link>
      </footer>
    </div>
  );
}
