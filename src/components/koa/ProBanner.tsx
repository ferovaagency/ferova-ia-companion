import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Crown, X } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { FREE_LIMITS } from "@/lib/plans";
import { canShowPurchase } from "@/lib/platform";

const HIDDEN_KEY = "koa-pro-banner-hidden";
const HIDE_DAYS = 3;
const SKIP = ["/pro", "/settings", "/onboarding", "/admin"];

type Plan = NonNullable<ReturnType<typeof usePlan>["plan"]>;

/** Mensaje según la pantalla y lo que el lector ya usó: nunca genérico si hay un dato real. */
export function proPitch(pathname: string, plan: Plan): string {
  const oracleLeft = Math.max(0, FREE_LIMITS.oracle - (plan.usage.oracle ?? 0));
  if (pathname.startsWith("/discover")) {
    return oracleLeft === 0
      ? "Usaste tus consultas al Oráculo de este mes. Con Pro preguntas cuantas veces quieras."
      : `Te quedan ${oracleLeft} ${oracleLeft === 1 ? "consulta" : "consultas"} al Oráculo este mes. Con Pro no hay límite.`;
  }
  if (pathname.startsWith("/library")) {
    return plan.books >= FREE_LIMITS.books * 0.8
      ? `Llevas ${plan.books} de ${FREE_LIMITS.books} libros. Con Pro tu biblioteca no tiene tope.`
      : "Con Pro guardas libros sin límite y Koa recuerda todo tu historial.";
  }
  if (pathname.startsWith("/adventures")) return "Con Pro abres las 24 ventanas del Adviento, creas bingos sin límite y lees en club.";
  if (pathname.startsWith("/clubs") || pathname.startsWith("/refuge")) return "Los clubes y las lecturas conjuntas son de Lee con Koa Pro.";
  if (pathname.startsWith("/read") || pathname.startsWith("/notebook")) return "Con Pro, Koa transcribe tus fotos de páginas y conversa contigo sin límite.";
  return "Lee con Koa Pro: Oráculo ilimitado, todas las aventuras y clubes de lectura.";
}

function hiddenUntil(): number {
  try {
    return Number(localStorage.getItem(HIDDEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function ProBanner() {
  const { pathname } = useLocation();
  const { plan, isFree } = usePlan();
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(hiddenUntil() > Date.now()), []);

  if (!isFree || !plan || hidden || !canShowPurchase() || SKIP.some((p) => pathname.startsWith(p))) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, String(Date.now() + HIDE_DAYS * 86_400_000));
    } catch {
      // Sin almacenamiento solo se oculta en esta visita.
    }
  };

  return (
    <aside className="adv-pebble flex flex-wrap items-center gap-3 mb-5" aria-label="Lee con Koa Pro">
      <Crown size={20} style={{ color: "var(--adv-ember)" }} aria-hidden />
      <p className="flex-1 min-w-[12rem] text-sm">{proPitch(pathname, plan)}</p>
      <Link to="/pro" className="koa-button">Ver Pro</Link>
      <button type="button" className="koa-icon" aria-label="Ocultar por unos días" onClick={dismiss}>
        <X size={16} />
      </button>
    </aside>
  );
}
