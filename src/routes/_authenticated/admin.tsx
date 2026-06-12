import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gift, Loader2, Mail, MessageSquare, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import {
  addCourtesyAccount,
  ensureMembership,
  listAdminPortal,
  removeCourtesyAccount,
  setMembershipPaid,
} from "@/lib/membership.functions";
import { listFeedback, updateFeedbackStatus } from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Librero IA" },
      { name: "description", content: "Portal administrativo de lectores, pagos y cortesías." },
    ],
  }),
  component: AdminPage,
});

type AdminData = {
  users: Array<{
    uid: string;
    email: string;
    displayName: string | null;
    isPaid: boolean;
    paymentSource: string;
    paidAt: string | null;
    createdAt: string | null;
    isAdmin: boolean;
  }>;
  courtesy: Array<{ email: string; active: boolean; granted_at: string; granted_by: string | null; revoked_at: string | null; created_at: string; updated_at: string }>;
};

type FeedbackItem = {
  id: string;
  user_id: string | null;
  email: string | null;
  type: string;
  message: string;
  status: string;
  created_at: string;
};

function AdminPage() {
  const ensureMembershipFn = useServerFn(ensureMembership);
  const listPortal = useServerFn(listAdminPortal);
  const togglePaid = useServerFn(setMembershipPaid);
  const addCourtesy = useServerFn(addCourtesyAccount);
  const removeCourtesy = useServerFn(removeCourtesyAccount);
  const listFeedbackFn = useServerFn(listFeedback);
  const updateFeedbackFn = useServerFn(updateFeedbackStatus);
  const [data, setData] = useState<AdminData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    await ensureMembershipFn();
    const [next, fb] = await Promise.all([listPortal(), listFeedbackFn().catch(() => [])]);
    setData(next);
    setFeedback(fb as FeedbackItem[]);
  };

  useEffect(() => {
    refresh()
      .catch((err: any) => setError(err?.message || "No autorizado"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data?.users ?? []).filter((user) => !q || user.email.includes(q) || user.uid.toLowerCase().includes(q));
  }, [data, search]);

  const grantCourtesy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await addCourtesy({ data: { email } });
      setEmail("");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "No pude agregar la cortesía");
    } finally {
      setSaving(false);
    }
  };

  const setPaid = async (userId: string, isPaid: boolean) => {
    setSaving(true);
    try {
      await togglePaid({ data: { userId, isPaid } });
      await refresh();
    } catch (err: any) {
      setError(err?.message || "No pude actualizar el estado de pago");
    } finally {
      setSaving(false);
    }
  };

  const revokeCourtesy = async (address: string) => {
    setSaving(true);
    try {
      await removeCourtesy({ data: { email: address } });
      await refresh();
    } catch (err: any) {
      setError(err?.message || "No pude retirar la cortesía");
    } finally {
      setSaving(false);
    }
  };

  const setFeedbackStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      await updateFeedbackFn({ data: { id, status: status as any } });
      await refresh();
    } catch (err: any) {
      setError(err?.message || "No pude actualizar el feedback");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center border border-border bg-card p-8 rounded-sm">
          <ShieldCheck className="w-8 h-8 text-accent mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-black">Portal restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link to="/library" className="mt-6 inline-flex items-center gap-2 font-mono-label hover:text-accent"><ArrowLeft className="w-3.5 h-3.5" /> Volver</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <Link to="/library" className="font-mono-label hover:text-accent transition-colors flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Biblioteca
          </Link>
          <span className="font-mono-label">Portal Admin</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="bg-card border border-border p-6 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono-label">Gremio Privado</span>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-black tracking-tight">Panel de Administración</h1>
            <p className="mt-2 text-sm text-muted-foreground font-serif italic">Lectores registrados, estado de pago y cuentas de cortesía.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat label="Registrados" value={String(data?.users.length ?? 0)} />
            <MiniStat label="Activos" value={String(data?.users.filter((u) => u.isPaid).length ?? 0)} />
            <MiniStat label="Feedback" value={String(feedback.filter((f) => f.status === "new").length)} />
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border p-6 rounded-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="font-serif text-xl font-black flex items-center gap-2"><Users className="w-5 h-5 text-accent" /> Lectores</h2>
              <span className="font-mono-label">$7 USD / mes</span>
            </div>
            <div className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por correo..." className="w-full bg-background border border-border pl-10 pr-3 py-2.5 rounded-sm text-sm focus:outline-none focus:border-foreground" />
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {users.map((user) => (
                <div key={user.uid} className="border border-border bg-background p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif font-bold truncate">{user.email || "Usuario"}</h3>
                      {user.isAdmin && <span className="font-mono-label text-accent">Admin</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{user.uid}</p>
                    <p className="text-xs text-muted-foreground mt-1">{user.isPaid ? `Activo · ${user.paymentSource}` : "Sin acceso pago"}{user.paidAt ? ` · ${new Date(user.paidAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  <button
                    disabled={saving || user.isAdmin}
                    onClick={() => setPaid(user.uid, !user.isPaid)}
                    className={`w-12 h-7 rounded-full transition-colors relative disabled:opacity-50 ${user.isPaid ? "bg-accent" : "bg-muted"}`}
                    aria-label="Cambiar estado de pago"
                  >
                    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${user.isPaid ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
              {!users.length && <p className="py-10 text-center text-sm text-muted-foreground font-serif italic">No hay lectores registrados.</p>}
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-sm space-y-6">
            <div>
              <h2 className="font-serif text-xl font-black flex items-center gap-2"><Gift className="w-5 h-5 text-accent" /> Cortesías</h2>
              <p className="mt-1 text-xs text-muted-foreground">Agrega un correo y al iniciar sesión se activará sin pagar.</p>
            </div>
            <form onSubmit={grantCourtesy} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lector@correo.com" className="w-full bg-background border border-border pl-10 pr-3 py-2.5 rounded-sm text-sm focus:outline-none focus:border-foreground" />
              </div>
              <button disabled={saving || !email.trim()} className="w-full bg-foreground text-background py-3 font-mono-label rounded-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} Regalar acceso
              </button>
            </form>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {(data?.courtesy ?? []).map((item) => (
                <div key={item.email} className="bg-background border border-border rounded-sm p-3 flex items-center justify-between gap-3">
                  <span className="text-xs truncate">{item.email}</span>
                  <button onClick={() => revokeCourtesy(item.email)} disabled={saving} className="text-muted-foreground hover:text-destructive p-1" title="Retirar cortesía">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!data?.courtesy.length && <p className="text-center text-xs text-muted-foreground py-6 font-serif italic">Sin cortesías activas.</p>}
            </div>
          </div>
        </section>

        <section className="bg-card border border-border p-6 rounded-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="font-serif text-xl font-black flex items-center gap-2"><MessageSquare className="w-5 h-5 text-accent" /> Sugerencias y errores</h2>
            <span className="font-mono-label">{feedback.length} totales</span>
          </div>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {feedback.map((item) => (
              <div key={item.id} className="border border-border bg-background p-4 rounded-sm">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono-label px-2 py-0.5 rounded-sm ${item.type === "bug" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
                      {item.type === "bug" ? "Error" : item.type === "suggestion" ? "Sugerencia" : "Otro"}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                    {item.email && <span className="text-xs text-muted-foreground">· {item.email}</span>}
                  </div>
                  <select value={item.status} disabled={saving} onChange={(e) => setFeedbackStatus(item.id, e.target.value)} className="bg-background border border-border px-2 py-1 text-xs rounded-sm">
                    <option value="new">Nuevo</option>
                    <option value="in_progress">En proceso</option>
                    <option value="done">Resuelto</option>
                    <option value="wontfix">Descartado</option>
                  </select>
                </div>
                <p className="font-serif text-sm whitespace-pre-wrap leading-relaxed">{item.message}</p>
              </div>
            ))}
            {!feedback.length && <p className="text-center text-sm text-muted-foreground font-serif italic py-8">Aún no hay sugerencias.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background px-4 py-3 rounded-sm min-w-24">
      <span className="font-mono-label block">{label}</span>
      <strong className="font-serif text-2xl font-black">{value}</strong>
    </div>
  );
}