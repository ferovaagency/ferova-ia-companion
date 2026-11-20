import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Gift, Loader2, Mail, MessageSquare, RotateCcw, Search, ShieldCheck, Trash2, TriangleAlert, Users, X } from "lucide-react";
import {
  addCourtesyAccount,
  ensureMembership,
  listAdminPortal,
  removeCourtesyAccount,
  resetMonthlyUsage,
  setMembershipPaid,
  type AdminUser,
  type CourtesyItem,
} from "@/lib/membership.functions";
import { listFeedback, updateFeedbackStatus } from "@/lib/feedback.functions";
import { listReaderReports, updateReaderReport } from "@/lib/social.functions";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/koa/UI";
import { FREE_LIMITS, PLAN_ROWS, PRICES } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Lee con Koa" },
      { name: "description", content: "Portal administrativo de lectores, planes y cortesías." },
      { property: "og:title", content: "Panel de Administración — Lee con Koa" },
      { property: "og:description", content: "Gestión interna de lectores, planes, cortesías y feedback." },
      { property: "og:url", content: "https://librero-ia.ferova.com.co/admin" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://librero-ia.ferova.com.co/admin" }],
  }),
  component: AdminPage,
});

type Portal = { users: AdminUser[]; courtesy: CourtesyItem[]; whop: Record<string, boolean>; migrated: boolean };
type FeedbackItem = { id: string; user_id: string | null; email: string | null; type: string; message: string; status: string; created_at: string };
type Report = { id: string; user_id: string; target_id: string; reason: string; created_at: string; status: string };
type Filter = "all" | "pro" | "free" | "whop" | "courtesy" | "manual";

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "");
const DURATIONS = [
  { months: 0, label: "Sin vencimiento" },
  { months: 1, label: "1 mes" },
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "1 año" },
] as const;

function planLabel(u: AdminUser): { text: string; detail: string; tone: "mint" | "ember" | "lavender" | "" } {
  if (u.isAdmin) return { text: "Admin", detail: "Acceso completo", tone: "lavender" };
  if (!u.isPaid) return { text: "Gratis", detail: u.paymentSource === "whop" && u.whopStatus ? `Whop: ${u.whopStatus}` : "", tone: "" };
  if (u.paymentSource === "whop") {
    const kind = u.plan ? (u.plan === "yearly" ? "anual" : "mensual") : "";
    const when = u.currentPeriodEnd ? (u.cancelAtPeriodEnd ? `cancela el ${date(u.currentPeriodEnd)}` : `renueva el ${date(u.currentPeriodEnd)}`) : "";
    return { text: `Pro · Whop ${kind}`.trim(), detail: when, tone: "mint" };
  }
  if (u.paymentSource === "courtesy") return { text: "Pro · cortesía", detail: u.accessExpiresAt ? `hasta el ${date(u.accessExpiresAt)}` : "sin vencimiento", tone: "ember" };
  return { text: "Pro · manual", detail: u.accessExpiresAt ? `hasta el ${date(u.accessExpiresAt)}` : "sin vencimiento", tone: "ember" };
}

function AdminPage() {
  const ensureMembershipFn = useServerFn(ensureMembership);
  const listPortal = useServerFn(listAdminPortal);
  const togglePaid = useServerFn(setMembershipPaid);
  const addCourtesy = useServerFn(addCourtesyAccount);
  const removeCourtesy = useServerFn(removeCourtesyAccount);
  const resetUsage = useServerFn(resetMonthlyUsage);
  const listFeedbackFn = useServerFn(listFeedback);
  const updateFeedbackFn = useServerFn(updateFeedbackStatus);
  const listReportsFn = useServerFn(listReaderReports);
  const updateReportFn = useServerFn(updateReaderReport);
  const [data, setData] = useState<Portal | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [email, setEmail] = useState("");
  const [months, setMonths] = useState<0 | 1 | 3 | 6 | 12>(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    setError(null);
    await ensureMembershipFn();
    const [next, fb, rp] = await Promise.all([listPortal(), listFeedbackFn(), listReportsFn()]);
    setData(next as Portal);
    setFeedback(fb as FeedbackItem[]);
    setReports(rp as Report[]);
  };

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No autorizado"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn: () => Promise<unknown>, done: string) {
    setSaving(true);
    setError(null);
    setNotice("");
    try {
      await fn();
      await refresh();
      setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar.");
    } finally {
      setSaving(false);
    }
  }

  const all = data?.users ?? [];
  const stats = useMemo(() => {
    const whopMonthly = all.filter((u) => u.isPaid && u.paymentSource === "whop" && u.plan === "monthly").length;
    const whopYearly = all.filter((u) => u.isPaid && u.paymentSource === "whop" && u.plan === "yearly").length;
    return {
      total: all.length,
      pro: all.filter((u) => u.isPaid || u.isAdmin).length,
      free: all.filter((u) => !u.isPaid && !u.isAdmin).length,
      whopMonthly,
      whopYearly,
      courtesy: all.filter((u) => u.isPaid && u.paymentSource === "courtesy").length,
      mrr: whopMonthly * PRICES.monthly.usd + (whopYearly * PRICES.yearly.usd) / 12,
    };
  }, [all]);

  const users = useMemo(() => {
    const q = search.toLowerCase().trim();
    return all
      .filter((u) => !q || u.email.includes(q) || u.uid.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q))
      .filter((u) => {
        if (filter === "pro") return u.isPaid || u.isAdmin;
        if (filter === "free") return !u.isPaid && !u.isAdmin;
        if (filter === "whop") return u.paymentSource === "whop";
        if (filter === "courtesy") return u.isPaid && u.paymentSource === "courtesy";
        if (filter === "manual") return u.isPaid && u.paymentSource === "manual";
        return true;
      })
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [all, search, filter]);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (error && !data) {
    return (
      <div className="koa-empty max-w-md mx-auto">
        <ShieldCheck className="mx-auto mb-3" />
        <h1 className="text-2xl font-bold">Portal restringido</h1>
        <p className="koa-muted mt-2">{error}</p>
        <Link to="/library" className="koa-secondary mt-5">Volver a la biblioteca</Link>
      </div>
    );
  }

  const whopMissing = Object.entries(data?.whop ?? {}).filter(([, ok]) => !ok).map(([k]) => k);
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `Todos · ${stats.total}` },
    { id: "pro", label: `Pro · ${stats.pro}` },
    { id: "free", label: `Gratis · ${stats.free}` },
    { id: "whop", label: "Whop" },
    { id: "courtesy", label: `Cortesía · ${stats.courtesy}` },
    { id: "manual", label: "Manual" },
  ];

  return (
    <div className="space-y-8">
      <PageTitle eyebrow="Solo administración" title="Panel de administración">Lectores, planes, cortesías, sugerencias y reportes.</PageTitle>

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Registrados" value={stats.total} />
        <Stat label="Pro" value={stats.pro} />
        <Stat label="Gratis" value={stats.free} />
        <Stat label="Whop mensual" value={stats.whopMonthly} />
        <Stat label="Whop anual" value={stats.whopYearly} />
        <Stat label="Cortesías" value={stats.courtesy} />
        <Stat label="Ingreso mensual est." value={`${stats.mrr.toFixed(0)} USD`} />
      </section>

      {(!data?.migrated || whopMissing.length > 0) && (
        <div className="adv-whisper" style={{ borderColor: "var(--destructive)" }}>
          <TriangleAlert className="shrink-0" />
          <div className="text-sm space-y-1">
            {!data?.migrated && <p>Falta aplicar la migración <code>0016_reader_plans_whop.sql</code>: los límites del plan gratis y los vencimientos aún no se aplican.</p>}
            {whopMissing.length > 0 && <p>Whop sin configurar en el servidor: {whopMissing.join(", ")}. Mientras falten, nadie puede pagar Pro.</p>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="koa-error">{error}</p>}
      {notice && <p role="status" className="text-sm" style={{ color: "var(--adv-mint)" }}>{notice}</p>}

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 adv-pebble space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2"><Users size={18} /> Lectores y planes</h2>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="admin-search" className="sr-only">Buscar lector</label>
            <input id="admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por correo, nombre o id…" className="koa-field pl-10" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por plan">
            {filters.map((f) => (
              <button key={f.id} type="button" className={`koa-chip ${filter === f.id ? "active" : ""}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {users.map((u) => {
              const label = planLabel(u);
              const free = !u.isPaid && !u.isAdmin;
              return (
                <article key={u.uid} className="rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold break-all">{u.email || "Sin correo"}</p>
                      <p className="koa-muted text-xs">{u.displayName ? `${u.displayName} · ` : ""}desde {date(u.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`adv-chip ${label.tone}`}>{u.isPaid || u.isAdmin ? <Crown size={12} /> : null}{label.text}</span>
                      {label.detail && <p className="koa-muted text-xs mt-1">{label.detail}</p>}
                    </div>
                  </div>
                  <p className="koa-muted text-xs">
                    {u.books} {u.books === 1 ? "libro" : "libros"}
                    {free && ` de ${FREE_LIMITS.books}`} · Oráculo {u.usage.oracle ?? 0}{free ? `/${FREE_LIMITS.oracle}` : ""} · Chat {u.usage.koa_chat ?? 0}{free ? `/${FREE_LIMITS.koa_chat}` : ""} · Fotos {u.usage.koa_ocr ?? 0}{free ? `/${FREE_LIMITS.koa_ocr}` : ""} este mes
                  </p>
                  {!u.isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {free && (
                        <>
                          <Button size="sm" variant="secondary" disabled={saving} onClick={() => { setEmail(u.email); document.getElementById("courtesy-form")?.scrollIntoView({ behavior: "smooth" }); }}><Gift />Dar cortesía</Button>
                          <Button size="sm" variant="secondary" disabled={saving} onClick={() => run(() => togglePaid({ data: { userId: u.uid, isPaid: true } }), `${u.email} ahora es Pro (manual).`)}><Crown />Pro manual</Button>
                        </>
                      )}
                      {u.isPaid && u.paymentSource !== "whop" && (
                        <Button size="sm" variant="secondary" disabled={saving} onClick={() => run(() => togglePaid({ data: { userId: u.uid, isPaid: false } }), `${u.email} volvió al plan gratis.`)}><X />Quitar Pro</Button>
                      )}
                      {u.paymentSource === "whop" && u.isPaid && <span className="koa-muted text-xs self-center">La suscripción se gestiona en Whop.</span>}
                      {free && (u.usage.oracle || u.usage.koa_chat || u.usage.koa_ocr) ? (
                        <Button size="sm" variant="ghost" disabled={saving} onClick={() => run(() => resetUsage({ data: { userId: u.uid } }), `Consultas del mes reiniciadas para ${u.email}.`)}><RotateCcw />Reiniciar cuotas</Button>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
            {!users.length && <p className="py-10 text-center koa-muted">No hay lectores con ese filtro.</p>}
          </div>
        </div>

        <div id="courtesy-form" className="adv-pebble space-y-5 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Gift size={18} /> Cortesías</h2>
            <p className="koa-muted text-xs mt-1">Regala Pro por correo. Si la persona ya tiene cuenta se activa al momento; si no, al entrar por primera vez.</p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              void run(async () => {
                await addCourtesy({ data: { email, months, note } });
                setEmail("");
                setNote("");
                setMonths(0);
              }, "Cortesía otorgada.");
            }}
          >
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="courtesy-email" className="sr-only">Correo</label>
              <input id="courtesy-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lector@correo.com" className="koa-field pl-10" />
            </div>
            <div>
              <label htmlFor="courtesy-months" className="koa-label">Duración</label>
              <select id="courtesy-months" className="koa-field" value={months} onChange={(e) => setMonths(Number(e.target.value) as 0 | 1 | 3 | 6 | 12)}>
                {DURATIONS.map((d) => <option key={d.months} value={d.months}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="courtesy-note" className="koa-label">Nota interna (opcional)</label>
              <input id="courtesy-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. club de lectura aliado" className="koa-field" />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !email.trim()}>{saving ? <Loader2 className="animate-spin" /> : <Gift />}Regalar Pro</Button>
          </form>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {(data?.courtesy ?? []).map((item) => {
              const expired = item.expires_at && new Date(item.expires_at).getTime() < Date.now();
              return (
                <div key={item.email} className="rounded-2xl border border-border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm break-all">{item.email}</p>
                    <p className="koa-muted text-xs">{item.expires_at ? (expired ? `Venció el ${date(item.expires_at)}` : `Hasta el ${date(item.expires_at)}`) : "Sin vencimiento"}{item.note ? ` · ${item.note}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => run(() => removeCourtesy({ data: { email: item.email } }), `Cortesía retirada a ${item.email}.`)} disabled={saving} className="koa-icon" aria-label={`Retirar cortesía a ${item.email}`} title="Retirar cortesía">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            {!data?.courtesy.length && <p className="text-center text-xs koa-muted py-6">Sin cortesías activas.</p>}
          </div>
        </div>
      </section>

      <section className="adv-pebble space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="koa-eyebrow">Estructura de planes</p>
            <h2 className="text-xl font-bold">Gratis y Pro</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="adv-chip lavender">Mensual · {PRICES.monthly.label}</span>
            <span className="adv-chip ember">Anual · {PRICES.yearly.label}</span>
          </div>
        </div>
        <p className="koa-muted text-sm">Los límites del plan gratis se validan en la base de datos (migración 0016). Pro es cualquier lector con suscripción de Whop activa, cortesía vigente, acceso manual o rol admin. Los cupos mensuales se renuevan el día 1 (hora UTC).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left"><th scope="col" className="p-3 font-semibold">Función</th><th scope="col" className="p-3 font-semibold">Gratis</th><th scope="col" className="p-3 font-semibold">Pro</th></tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-border">
                  <th scope="row" className="p-3 font-medium text-left">{row.feature}</th>
                  <td className="p-3 koa-muted">{row.free}</td>
                  <td className="p-3">{row.pro === "Sí" ? <Check size={16} aria-label="Sí" /> : row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="koa-muted text-xs">Para cambiar un límite hay que editarlo en <code>src/lib/plans.ts</code> (lo que se muestra) y en la migración (lo que se aplica).</p>
      </section>

      <section className="adv-pebble space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare size={18} /> Sugerencias y errores</h2>
          <span className="koa-muted text-xs">{feedback.filter((f) => f.status === "new").length} nuevas · {feedback.length} totales</span>
        </div>
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {feedback.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className={`adv-chip ${item.type === "bug" ? "ember" : "lavender"}`}>{item.type === "bug" ? "Error" : item.type === "suggestion" ? "Sugerencia" : "Otro"}</span>
                  <span className="koa-muted">{new Date(item.created_at).toLocaleString("es")}</span>
                  {item.email && <span className="koa-muted">· {item.email}</span>}
                </div>
                <label className="sr-only" htmlFor={`fb-${item.id}`}>Estado</label>
                <select id={`fb-${item.id}`} value={item.status} disabled={saving} onChange={(e) => run(() => updateFeedbackFn({ data: { id: item.id, status: e.target.value as "new" } }), "Sugerencia actualizada.")} className="koa-field w-auto min-h-0 py-1 text-xs">
                  <option value="new">Nuevo</option>
                  <option value="in_progress">En proceso</option>
                  <option value="done">Resuelto</option>
                  <option value="wontfix">Descartado</option>
                </select>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.message}</p>
            </article>
          ))}
          {!feedback.length && <p className="text-center koa-muted py-8">Aún no hay sugerencias.</p>}
        </div>
      </section>

      <section className="adv-pebble space-y-4">
        <h2 className="text-xl font-bold">Reportes de lectores</h2>
        {!reports.length && <p className="koa-muted">No hay reportes.</p>}
        {reports.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border p-4 space-y-3">
            <p className="koa-muted text-xs break-all">Persona reportada: {r.target_id} · {new Date(r.created_at).toLocaleString("es")}</p>
            <p className="text-sm whitespace-pre-wrap break-words">{r.reason}</p>
            <div className="flex flex-wrap gap-2">
              {(["new", "in_progress", "done", "wontfix"] as const).map((status) => (
                <Button key={status} size="sm" variant={r.status === status ? "default" : "secondary"} disabled={saving} onClick={() => run(() => updateReportFn({ data: { id: r.id, status } }), "Reporte actualizado.")}>
                  {status === "new" ? "Nuevo" : status === "in_progress" ? "En revisión" : status === "done" ? "Resuelto" : "Descartado"}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="adv-pebble p-4">
      <p className="koa-muted text-xs">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
