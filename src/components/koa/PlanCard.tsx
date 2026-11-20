import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, ExternalLink, Loader2 } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { FREE_LIMITS, PRICES } from "@/lib/plans";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (100 * used) / limit);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="koa-muted">{used} de {limit}</span></div>
      <div className="adv-meter"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function PlanCard({ justPaid = false }: { justPaid?: boolean }) {
  const { plan, isLoading, error, refetch, isFree } = usePlan();
  // El aviso de Whop puede tardar unos segundos después del pago.
  useEffect(() => {
    if (!justPaid || plan?.pro) return;
    const id = setInterval(() => void refetch(), 4000);
    const stop = setTimeout(() => clearInterval(id), 60000);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, [justPaid, plan?.pro, refetch]);

  if (isLoading) return <p className="koa-muted flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando tu plan…</p>;
  if (error || !plan) return <p className="koa-muted">No pudimos leer tu plan ahora. Tus libros y tu historial siguen disponibles.</p>;

  const renews = plan.current_period_end ? new Date(plan.current_period_end).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <div className="adv-pebble space-y-4">
      {justPaid && !plan.pro && <p role="status" className="adv-whisper">Estamos confirmando tu pago con Whop. Esto tarda unos segundos…</p>}
      {justPaid && plan.pro && <p role="status" className="adv-whisper">Te damos la bienvenida a Lee con Koa Pro. Ya tienes todo desbloqueado.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="koa-eyebrow mb-1">Tu plan</p>
          <p className="text-xl font-bold inline-flex items-center gap-2">
            {plan.pro ? <><Crown size={18} style={{ color: "var(--adv-ember)" }} /> Lee con Koa Pro</> : "Gratis"}
          </p>
          {plan.pro && plan.source === "whop" && (
            <p className="koa-muted text-sm mt-1">
              {plan.plan ? PRICES[plan.plan].label : "Suscripción"}
              {renews ? (plan.cancel_at_period_end ? ` · activo hasta el ${renews}` : ` · se renueva el ${renews}`) : ""}
            </p>
          )}
          {plan.pro && plan.source !== "whop" && <p className="koa-muted text-sm mt-1">Acceso {plan.source === "courtesy" ? "de cortesía" : plan.source === "admin" ? "de administración" : "otorgado"}.</p>}
        </div>
        {isFree ? (
          <Link to="/pro" className="koa-button"><Crown size={16} />Pasar a Pro</Link>
        ) : plan.manageUrl ? (
          <a href={plan.manageUrl} target="_blank" rel="noreferrer" className="koa-secondary">Administrar o cancelar <ExternalLink size={14} /></a>
        ) : null}
      </div>
      {isFree && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Meter label="Consultas al Oráculo este mes" used={plan.usage.oracle ?? 0} limit={FREE_LIMITS.oracle} />
          <Meter label="Conversaciones con Koa este mes" used={plan.usage.koa_chat ?? 0} limit={FREE_LIMITS.koa_chat} />
          <Meter label="Fotos transcritas este mes" used={plan.usage.koa_ocr ?? 0} limit={FREE_LIMITS.koa_ocr} />
          <Meter label="Libros en tu biblioteca" used={plan.books} limit={FREE_LIMITS.books} />
          <Meter label="Listas propias" used={plan.lists} limit={FREE_LIMITS.lists} />
          <Meter label="Bingos" used={plan.bingos} limit={FREE_LIMITS.bingos} />
        </div>
      )}
      {isFree && <p className="koa-muted text-xs">Las consultas se renuevan el día 1 de cada mes. Registrar lecturas y tus rachas es gratis siempre.</p>}
    </div>
  );
}
