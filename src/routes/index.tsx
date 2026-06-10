import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Library, Wind, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Librero IA — Tu estantería inteligente con IA" },
      { name: "description", content: "Organiza tus libros pendientes, sigue tu velocidad de lectura y recibe recomendaciones personalizadas según tu estado de ánimo, respetando el orden de tus sagas." },
      { property: "og:title", content: "Librero IA — Tu estantería inteligente" },
      { property: "og:description", content: "TBR, progreso, sagas y recomendaciones con IA en un único santuario lector." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="font-serif font-black tracking-tight text-lg">Librero IA</span>
        </div>
        <Link to="/auth" className="font-mono-label hover:text-accent transition-colors">
          Iniciar sesión
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <span className="font-mono-label">Santuario lector · IA editorial</span>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
          Tu estantería personal,<br />curada por una IA con <em className="text-accent not-italic">intuición literaria</em>.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl font-serif leading-relaxed">
          Organiza tu TBR con portadas reales, mide tu velocidad de lectura, respeta el orden lógico de tus sagas y recibe recomendaciones según tu estado de ánimo. Sin algoritmos opacos, sin ruido.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 transition-all"
          >
            Entrar a mi biblioteca <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Library, title: "Catálogo enriquecido", body: "Escribe un título y Lumina añade género, páginas, sinopsis y portada automáticamente." },
            { icon: Sparkles, title: "Recomendaciones por humor", body: "Describe tu estado anímico y recibe el libro perfecto de tu lista o una sugerencia externa." },
            { icon: Wind, title: "Sagas respetadas", body: "Nunca te recomendará el libro 3 si no has leído el 2. Lógica narrativa primero." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="border-t border-border pt-6">
              <Icon className="w-5 h-5 text-accent mb-3" />
              <h3 className="font-serif font-bold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center font-mono-label">
        Librero IA · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
