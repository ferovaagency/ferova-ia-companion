import { createFileRoute, Link } from "@tanstack/react-router";
import { FeedbackForm } from "@/components/koa/FeedbackForm";

const questions = [
  { q: "¿Qué es Lee con Koa?", a: "Un compañero lector para elegir entre tres recomendaciones, organizar los libros que tienes y registrar tu progreso real. No distribuye ebooks." },
  { q: "¿Puedo usar mis propios libros?", a: "Sí. Puedes registrar tus libros físicos o digitales, añadirlos por ISBN e importar tu archivo de Goodreads. Revisa siempre la edición y sus páginas." },
  { q: "¿Cómo se cuenta una racha?", a: "Cuenta el avance real de lectura o terminar directamente un libro que estaba leyendo. Abrir la app, guardar notas o usar solamente el temporizador no cuenta." },
  { q: "¿Mis notas y libros son públicos?", a: "No. La biblioteca, las notas, las conversaciones y los bingos de la versión actual son privados para cada cuenta." },
  { q: "¿Lee con Koa es gratis?", a: "Sí. El plan gratis incluye 3 consultas al Oráculo al mes, hasta 50 libros, registro de lecturas y rachas, tu cuaderno, 3 listas, un bingo y las primeras 3 ventanas del Adviento. Lee con Koa Pro cuesta 7 USD al mes o 70 USD al año y desbloquea todo. No hay prueba gratis de Pro: el plan gratis sirve para conocer la app." },
  { q: "¿Cómo cancelo Pro?", a: "Desde Ajustes, en «Tu plan», con el enlace para administrar tu suscripción en Whop. Pro sigue activo hasta el final del periodo pagado y tus libros, notas e historial no se borran." },
  { q: "¿Koa sustituye atención médica?", a: "No. Koa acompaña lecturas y preferencias expresadas por la persona; no diagnostica ni ofrece tratamientos." },
];
export const Route = createFileRoute("/faq")({ head: () => ({
  meta: [{ title: "Preguntas y contacto — Lee con Koa" }, { name: "description", content: "Respuestas sobre libros, privacidad, progreso y ayuda de Lee con Koa." }, { property: "og:title", content: "Preguntas y contacto — Lee con Koa" }, { property: "og:description", content: "Conoce cómo acompañamos tu lectura y envía tus sugerencias." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }],
  links: [{ rel: "canonical", href: "https://librero-ia.ferova.com.co/faq" }],
  scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }],
}), component: FAQ });
function FAQ() { return <div className="koa-app"><header className="koa-header"><Link className="koa-brand" to="/"><img src="/koa/icon.webp" width={40} height={40} alt="" />Lee con Koa</Link><Link className="koa-secondary" to="/auth">Entrar</Link></header><main className="koa-container max-w-3xl"><p className="koa-eyebrow">Aquí para acompañarte</p><h1>Preguntas y contacto</h1><section className="my-8 space-y-4">{questions.map(({ q, a }) => <details key={q} className="border-b border-border pb-4"><summary className="font-semibold cursor-pointer">{q}</summary><p className="koa-muted mt-3">{a}</p></details>)}</section><section className="border-t border-border pt-6"><h2 className="mb-5">Sugerencias y errores</h2><FeedbackForm /></section></main></div>; }