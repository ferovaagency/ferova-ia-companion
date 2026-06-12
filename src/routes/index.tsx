import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Library, Wind, ArrowRight, Loader2, Wand2, ExternalLink, CheckCircle2, Quote, Layers, Heart, Clock, ShieldCheck, Star, ShoppingCart, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recommendBook } from "@/lib/books.functions";
import { submitFeedback } from "@/lib/feedback.functions";
import { amazonWishlistUrl } from "@/lib/amazon";
import type { RecommendationResult } from "@/types";

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
        <nav className="flex items-center gap-6">
          <a href="#como-funciona" className="font-mono-label hover:text-accent transition-colors hidden sm:inline">Cómo funciona</a>
          <a href="#precio" className="font-mono-label hover:text-accent transition-colors hidden sm:inline">Precio</a>
          <Link to="/auth" className="font-mono-label hover:text-accent transition-colors">
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <Hero />
      <SocialProof />
      <PainSection />
      <HowItWorks />
      <FeaturesGrid />
      <DemoOracle />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FeedbackSection />
      <FinalCTA />

      <footer className="border-t border-border py-8 text-center font-mono-label">
        Librero IA · {new Date().getFullYear()} · Hecho para lectores devotos
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-16 sm:pb-20">
      <span className="font-mono-label">Santuario lector · IA editorial</span>
      <h1 className="mt-4 font-serif text-4xl sm:text-7xl font-black tracking-tight leading-[1.05] sm:leading-[1.02]">
        Nunca más mires tu estantería sin saber <em className="text-accent not-italic">qué leer</em>.
      </h1>
      <p className="mt-5 sm:mt-6 text-base sm:text-2xl text-muted-foreground max-w-3xl font-serif leading-relaxed">
        Librero IA organiza tu TBR con portadas reales, recuerda el orden de tus sagas y consulta al <strong className="text-foreground">Oráculo</strong> para recomendarte el libro perfecto según tu estado de ánimo de hoy.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-foreground text-background px-7 py-4 font-mono-label rounded-sm hover:opacity-90 transition-all"
        >
          Suscribirme · $7/mes <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <a href="#demo" className="inline-flex items-center gap-2 px-7 py-4 font-mono-label border border-foreground rounded-sm hover:bg-foreground hover:text-background transition-all">
          Probar el Oráculo
        </a>
        <div className="flex items-center gap-1 ml-1">
          {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-accent text-accent" />)}
          <span className="ml-2 text-sm text-muted-foreground font-serif italic">"Por fin sé qué leer."</span>
        </div>
      </div>

      <p className="mt-6 text-xs font-mono-label">Prueba el Oráculo sin registro · Cancela cuando quieras · Sin permanencia</p>
    </main>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-border bg-card/40 py-6">
      <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center">
        <span className="font-mono-label">+1.200 lectores</span>
        <span className="font-mono-label">+18.000 libros catalogados</span>
        <span className="font-mono-label">Sagas respetadas siempre</span>
        <span className="font-mono-label">IA entrenada para literatura</span>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    "Tu estantería tiene 40 libros sin leer y aún así no sabes cuál empezar.",
    "Pierdes la cuenta de qué tomo de la saga ibas y no quieres spoilers.",
    "Las apps genéricas te recomiendan bestsellers, no lo que de verdad te gusta.",
    "Anotas tus lecturas en hojas sueltas, fotos del móvil o no las anotas.",
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <span className="font-mono-label">¿Te suena?</span>
      <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight max-w-3xl">
        Lees mucho, pero leer <em className="text-accent not-italic">bien</em> cuesta.
      </h2>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {pains.map((p) => (
          <div key={p} className="border border-border p-5 rounded-sm bg-card/40">
            <p className="font-serif text-lg leading-snug">"{p}"</p>
          </div>
        ))}
      </div>
      <p className="mt-10 font-serif text-xl max-w-2xl">
        Librero IA pone orden, contexto y criterio en tu vida lectora. Como tener un librero de confianza, disponible 24/7.
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Añade tus libros", body: "Escribe el título. El catálogo añade autor, género, páginas, sinopsis y portada real automáticamente." },
    { n: "02", title: "Marca tu progreso", body: "Indica si lo leíste, lo estás leyendo o está pendiente. Sigue tu velocidad sin esfuerzo." },
    { n: "03", title: "Consulta al Oráculo", body: "Cuéntale cómo te sientes hoy. Te recomienda de tu estantería —o un libro externo— respetando tus sagas." },
  ];
  return (
    <section id="como-funciona" className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <span className="font-mono-label">Cómo funciona</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">Tres pasos. Ningún ruido.</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="font-mono-label text-accent">{s.n}</div>
              <h3 className="mt-2 font-serif text-2xl font-black">{s.title}</h3>
              <p className="mt-3 text-muted-foreground font-serif leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { icon: Library, title: "Catálogo enriquecido", body: "Portadas reales, sinopsis, género y páginas. Sin teclear metadatos a mano." },
    { icon: Sparkles, title: "Oráculo con criterio", body: "Una IA entrenada para hablar de literatura, no de algoritmos virales." },
    { icon: Layers, title: "Sagas respetadas", body: "Nunca te sugerirá el libro 3 antes que el 2. Lógica narrativa primero." },
    { icon: Heart, title: "Recomendaciones por humor", body: "Triste, eufórico, agotado, curioso… cada estado tiene su libro." },
    { icon: Clock, title: "Velocidad lectora", body: "Mide cuánto tardas en terminar y descubre tu ritmo real." },
    { icon: ShieldCheck, title: "Privado y sin anuncios", body: "Tus lecturas son tuyas. No se venden, no se trackean, no se monetizan." },
  ];
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <span className="font-mono-label">Lo que te llevas</span>
      <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">Todo lo que un lector serio necesita.</h2>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="border-t border-border pt-6">
            <Icon className="w-5 h-5 text-accent mb-3" />
            <h3 className="font-serif font-bold text-lg">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const tests = [
    { quote: "Tengo 200 libros sin leer y por primera vez sé exactamente cuál abrir esta noche.", name: "Carolina V.", role: "Lectora de fantasía" },
    { quote: "El Oráculo me recomendó releer un Murakami antes de saltar a otro autor. Acertó. Da escalofríos.", name: "Andrés P.", role: "Lector compulsivo" },
    { quote: "Por fin una app que entiende que el orden de Sanderson importa.", name: "Lucía M.", role: "Booktoker" },
  ];
  return (
    <section className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <span className="font-mono-label">Lo que dicen los lectores</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">Curado por lectores. Para lectores.</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {tests.map((t) => (
            <figure key={t.name} className="border border-border p-6 rounded-sm bg-background flex flex-col">
              <Quote className="w-5 h-5 text-accent mb-3" />
              <blockquote className="font-serif text-lg leading-snug flex-1">"{t.quote}"</blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border">
                <div className="font-serif font-bold">{t.name}</div>
                <div className="font-mono-label">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "¿Puedo probar antes de pagar?", a: "Sí. Puedes consultar al Oráculo aquí mismo, sin registro, cuantas veces quieras. Para guardar tu estantería y desbloquear todo, necesitas la suscripción." },
    { q: "¿Cómo me cobran?", a: "A través de PayPal: $7 USD al mes, cancelas con un clic desde tu cuenta PayPal. Sin permanencia ni letra pequeña." },
    { q: "¿Y mis libros en papel?", a: "Funciona igual con libros físicos y digitales. La app no es una tienda, es tu estantería personal." },
    { q: "¿La IA respeta el orden de las sagas?", a: "Sí. El Oráculo nunca te sugerirá el siguiente tomo si no has terminado el anterior. Es la primera regla del sistema." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Cuando quieras, desde PayPal. Tus datos y tu biblioteca se mantienen por si vuelves." },
  ];
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <span className="font-mono-label">Preguntas frecuentes</span>
      <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">Lo que suelen preguntarnos.</h2>
      <div className="mt-10 divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer font-serif text-lg font-bold list-none">
              {f.q}
              <span className="font-mono-label text-accent group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-muted-foreground font-serif leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-border bg-foreground text-background">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <span className="font-mono-label" style={{ color: "var(--color-accent)" }}>Tu próxima lectura te espera</span>
        <h2 className="mt-3 font-serif text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Deja de improvisar.<br />Empieza a leer <em className="not-italic" style={{ color: "var(--color-accent)" }}>con criterio</em>.
        </h2>
        <p className="mt-6 font-serif text-lg opacity-80 max-w-xl mx-auto">
          Suscríbete por $7 al mes, configura tu estantería en 5 minutos y consulta al Oráculo esta misma noche.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-4 font-mono-label rounded-sm hover:opacity-90 transition-all"
          >
            Suscribirme ahora <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href="#precio"
            className="inline-flex items-center gap-2 border border-background px-8 py-4 font-mono-label rounded-sm hover:bg-background hover:text-foreground transition-all"
          >
            Ver el plan
          </a>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const features = [
    "Colección TBR física y digital sin límites.",
    "Consultas al Oráculo lector con IA.",
    "Catálogo enriquecido con portadas reales.",
    "Respeto del hilo lógico de sagas y universos.",
  ];

  return (
    <section id="precio" className="border-t border-border">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <span className="font-mono-label">Plan único · sin sorpresas</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">$7 USD / mes</h2>
        <p className="mt-3 text-muted-foreground font-serif max-w-xl mx-auto">
          Menos que un café especial a la semana. Acceso completo al santuario lector. Cancela cuando quieras desde PayPal.
        </p>

        <div className="mt-10 max-w-md mx-auto border border-foreground bg-card p-8 text-left rounded-sm shadow-sm">
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <a
            href="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-97L52146RW343720LNIULWWQ"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-4 font-mono-label rounded-sm hover:opacity-90 transition-all"
          >
            Suscribirse con PayPal <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function DemoOracle() {
  const recommend = useServerFn(recommendBook);
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const examples = [
    "Necesito algo corto y luminoso, vengo de un bloqueo lector",
    "Quiero fantasía oscura con prosa cuidada",
    "Una novela negra escandinava, atmosférica",
  ];

  const ask = async (q?: string) => {
    const userRequest = (q ?? vibe).trim();
    if (!userRequest) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await recommend({ data: { userRequest, books: [] } });
      setResult(r);
    } catch (e: any) {
      setError(e?.message || "El oráculo no respondió");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="border-t border-border bg-card/40">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <span className="font-mono-label">Demo · sin registro</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">
          Prueba el <em className="text-accent not-italic">Oráculo</em>
        </h2>
        <p className="mt-3 text-muted-foreground font-serif max-w-xl">
          Describe tu vibe lector ahora mismo y el oráculo te sugerirá un libro. Sin login, sin registro.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Hoy quiero algo melancólico pero esperanzador, breve, sin violencia gratuita…"
            rows={3}
            className="w-full bg-background border border-border px-4 py-3 rounded-sm font-serif text-base focus:outline-none focus:border-foreground resize-none"
          />
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setVibe(ex); ask(ex); }}
                className="text-xs px-3 py-1.5 border border-border rounded-full hover:border-foreground transition-colors font-mono-label"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={() => ask()}
            disabled={loading || !vibe.trim()}
            className="self-start inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Consultar al Oráculo
          </button>
        </div>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {result && (
          <div className="mt-8 border border-border bg-background p-6 rounded-sm">
            {result.external ? (
              <div className="flex flex-col sm:flex-row gap-5">
                {result.external.cover_url && (
                  <img src={result.external.cover_url} alt={result.external.title} className="w-24 h-auto shadow-md self-start" />
                )}
                <div>
                  <span className="font-mono-label text-accent">Sugerencia externa</span>
                  <h3 className="mt-1 font-serif text-2xl font-black">{result.external.title}</h3>
                  <p className="text-sm text-muted-foreground">{result.external.author}</p>
                  {result.external.genre && (
                    <p className="mt-1 text-xs font-mono-label">{result.external.genre}</p>
                  )}
                  <p className="mt-3 font-serif italic text-foreground/90 leading-relaxed">"{result.reasoning}"</p>
                  {result.external.description && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{result.external.description}</p>
                  )}
                  <a
                    href={amazonWishlistUrl(result.external.title, result.external.author)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 font-mono-label rounded-sm hover:opacity-90"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Comprar / añadir a Amazon
                  </a>
                </div>
              </div>
            ) : (
              <p className="font-serif italic text-foreground/90 leading-relaxed">"{result.reasoning}"</p>
            )}
            <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">¿Quieres que el Oráculo recuerde tu estantería y respete tus sagas?</p>
              <Link to="/auth" className="text-xs font-mono-label hover:text-accent transition-colors flex items-center gap-1">
                Suscribirme <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FeedbackSection() {
  const submit = useServerFn(submitFeedback);
  const [type, setType] = useState<"suggestion" | "bug" | "other">("suggestion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setSending(true);
    setError(null);
    try {
      await submit({ data: { type, message, email: email || undefined } });
      setSent(true);
      setMessage("");
    } catch (e: any) {
      setError(e?.message || "No pude enviar tu mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="feedback" className="border-t border-border bg-card/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <span className="font-mono-label">Sugerencias y errores</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">
          ¿Algo que mejorar? <em className="text-accent not-italic">Escríbeme.</em>
        </h2>
        <p className="mt-3 text-muted-foreground font-serif">
          Léo cada mensaje. Reporta errores, pide funciones o cuéntame qué libro tendría que reconocer mejor el Oráculo.
        </p>
        {sent ? (
          <div className="mt-8 border border-accent bg-background p-6 rounded-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <p className="font-serif">¡Recibido! Gracias por ayudarme a mejorar Librero IA.</p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-8 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(["suggestion", "bug", "other"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`text-xs font-mono-label px-3 py-2 rounded-sm border ${type === t ? "bg-foreground text-background border-foreground" : "border-border hover:bg-background"}`}>
                  {t === "suggestion" ? "Sugerencia" : t === "bug" ? "Error" : "Otro"}
                </button>
              ))}
            </div>
            <textarea required minLength={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="¿Qué te gustaría cambiar?" rows={5} className="w-full bg-background border border-border px-4 py-3 rounded-sm font-serif text-base focus:outline-none focus:border-foreground resize-none" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional, por si quiero responderte)" className="w-full bg-background border border-border px-4 py-3 rounded-sm font-serif text-sm focus:outline-none focus:border-foreground" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={sending || message.trim().length < 5} className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 transition-all disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Enviar mensaje
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
