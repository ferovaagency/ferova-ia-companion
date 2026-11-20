import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/plans.functions";
import { PLAN_ROWS, PRICES, type PlanKind } from "@/lib/plans";
import { userError } from "@/lib/koa-data";
import { canShowPurchase } from "@/lib/platform";

const URL_BASE = "https://librero-ia.ferova.com.co";
export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Lee con Koa Pro — Planes y precios" },
      { name: "description", content: "Lee con Koa es gratis. Pro desbloquea el Oráculo ilimitado, bingos, el Adviento completo y tu biblioteca sin límite por 7 USD al mes o 70 USD al año." },
      { property: "og:title", content: "Lee con Koa Pro" },
      { property: "og:description", content: "Gratis para empezar. Pro por 7 USD al mes o 70 USD al año." },
      { property: "og:url", content: `${URL_BASE}/pro` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${URL_BASE}/pro` }],
  }),
  component: ProPage,
});

function ProPage() {
  const checkout = useServerFn(startCheckout);
  const [signedIn, setSignedIn] = useState<boolean>();
  const [busy, setBusy] = useState<PlanKind | "">("");
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  async function buy(plan: PlanKind) {
    setError("");
    if (!signedIn) {
      window.location.href = "/auth";
      return;
    }
    setBusy(plan);
    try {
      const { url } = await checkout({ data: { plan, origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      setError(userError(e));
      setBusy("");
    }
  }

  // En la app de tienda no se vende Pro (pagos externos no permitidos por Apple ni Google).
  if (typeof window !== "undefined" && !canShowPurchase()) {
    return (
      <main className="koa-app"><div className="koa-container py-16 text-center space-y-4"><img src="/koa/read.webp" alt="" className="w-28 mx-auto" /><h1>Tu plan</h1><p className="koa-muted">Puedes ver tu plan y lo que tienes incluido en Ajustes.</p><Link to="/settings" className="koa-button">Ir a Ajustes</Link></div></main>
    );
  }

  return (
    <main className="koa-app">
      <div className="koa-container space-y-10">
        <Link to="/" className="koa-muted">← Lee con Koa</Link>
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <img src="/koa/celebrate.webp" alt="" className="w-28 mx-auto" />
          <p className="koa-eyebrow">Planes</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Lee gratis. Ve más lejos con Pro.</h1>
          <p className="koa-muted text-base">Registrar lo que lees, tus rachas y tu privacidad son gratis siempre. Pro suma el Oráculo sin límite, bingos, el Adviento completo y una biblioteca sin tope.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <article className="adv-pebble flex flex-col gap-3">
            <p className="koa-eyebrow mb-0">Gratis</p>
            <p className="text-3xl font-extrabold">0 USD</p>
            <p className="koa-muted text-sm">Para empezar y crear el hábito.</p>
            <Link to={signedIn ? "/discover" : "/auth"} className="koa-secondary mt-auto">{signedIn ? "Seguir leyendo" : "Crear mi cuenta"}</Link>
          </article>
          <article className="adv-pebble flex flex-col gap-3">
            <p className="koa-eyebrow mb-0">Pro mensual</p>
            <p className="text-3xl font-extrabold">7 USD <span className="text-base font-normal koa-muted">/ mes</span></p>
            <p className="koa-muted text-sm">Cancela cuando quieras.</p>
            <button className="koa-button mt-auto" disabled={!!busy || signedIn === undefined} onClick={() => buy("monthly")}>
              {busy === "monthly" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}Elegir mensual
            </button>
          </article>
          <article className="adv-pebble flex flex-col gap-3" style={{ borderColor: "oklch(0.83 0.14 75 / 0.5)" }}>
            <div className="flex items-center justify-between gap-2"><p className="koa-eyebrow mb-0">Pro anual</p><span className="adv-chip ember">2 meses gratis</span></div>
            <p className="text-3xl font-extrabold">70 USD <span className="text-base font-normal koa-muted">/ año</span></p>
            <p className="koa-muted text-sm">{PRICES.yearly.note}.</p>
            <button className="koa-button mt-auto" disabled={!!busy || signedIn === undefined} onClick={() => buy("yearly")}>
              {busy === "yearly" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}Elegir anual
            </button>
          </article>
        </div>
        {error && <p role="alert" className="koa-error max-w-5xl mx-auto">{error}</p>}
        {signedIn === false && <p className="koa-muted text-sm text-center">Para suscribirte, primero <Link to="/auth" className="underline">entra o crea tu cuenta</Link>.</p>}

        <section className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Qué incluye cada plan</h2>
          <div className="adv-pebble p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="p-4 font-semibold">Función</th>
                  <th scope="col" className="p-4 font-semibold">Gratis</th>
                  <th scope="col" className="p-4 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <th scope="row" className="p-4 font-medium text-left">{row.feature}</th>
                    <td className="p-4 koa-muted">{row.free}</td>
                    <td className="p-4">{row.pro === "Sí" ? <Check size={16} aria-label="Sí" style={{ color: "var(--adv-mint)" }} /> : row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="koa-muted text-xs mt-3">Los pagos se procesan con Whop. Puedes cancelar desde Ajustes; Pro sigue activo hasta el final del periodo pagado. Si dejas Pro, tus libros, notas e historial no se borran.</p>
        </section>
      </div>
    </main>
  );
}
