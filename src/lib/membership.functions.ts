import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "gerencia@seoparaecommerce.co";

export type AdminUser = {
  uid: string;
  email: string;
  displayName: string | null;
  isPaid: boolean;
  paymentSource: string;
  paidAt: string | null;
  createdAt: string | null;
  isAdmin: boolean;
  plan: "monthly" | "yearly" | null;
  whopStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accessExpiresAt: string | null;
  books: number;
  usage: Partial<Record<"oracle" | "koa_chat" | "koa_ocr", number>>;
};

export type CourtesyItem = {
  email: string;
  active: boolean;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  expires_at?: string | null;
  note?: string;
};

// Tablas con columnas añadidas en la migración 0016: se accede sin tipos generados.
type Loose = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  auth: any;
};

async function getAdminClient(): Promise<Loose> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Loose;
}

async function assertAdmin(userId: string) {
  const supabaseAdmin = await getAdminClient();
  const { data, error } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("No autorizado");
  return supabaseAdmin;
}

const NEW_COLUMNS = ["access_expires_at", "expires_at", "note"];
/** Escribe y, si la migración 0016 aún no está aplicada, reintenta sin sus columnas nuevas. */
async function writeCompat(run: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>, row: Record<string, unknown>) {
  const first = await run(row);
  if (!first.error) return;
  if (!/column|schema cache|PGRST204/i.test(first.error.message)) throw new Error(first.error.message);
  const legacy = Object.fromEntries(Object.entries(row).filter(([k]) => !NEW_COLUMNS.includes(k)));
  const second = await run(legacy);
  if (second.error) throw new Error(second.error.message);
}

const isFuture = (iso?: string | null) => !iso || new Date(iso).getTime() > Date.now();
const addMonths = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

export const ensureMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await getAdminClient();
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError || !authUser.user?.email) throw new Error("No se pudo verificar la cuenta");

    const email = authUser.user.email.toLowerCase().trim();
    const displayName = (authUser.user.user_metadata?.name as string | undefined) || (authUser.user.user_metadata?.full_name as string | undefined) || email.split("@")[0];

    await supabaseAdmin.from("profiles").upsert({ id: context.userId, display_name: displayName }, { onConflict: "id" });
    if (email === ADMIN_EMAIL) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    }

    const { data: courtesyRow } = await supabaseAdmin.from("courtesy_accounts").select("*").eq("email", email).eq("active", true).maybeSingle();
    const courtesy = courtesyRow && isFuture(courtesyRow.expires_at) ? courtesyRow : null;
    const { data: existing } = await supabaseAdmin.from("memberships").select("*").eq("user_id", context.userId).maybeSingle();

    const isAdmin = email === ADMIN_EMAIL;
    // Whop y los accesos manuales se conservan; la cortesía se recalcula desde su registro.
    const keepsPaid = Boolean(existing?.is_paid && ["manual", "whop"].includes(existing.payment_source) && isFuture(existing.access_expires_at));
    const shouldBePaid = isAdmin || Boolean(courtesy) || keepsPaid;
    const paymentSource = isAdmin ? "admin" : keepsPaid ? existing.payment_source : courtesy ? "courtesy" : "none";

    await writeCompat((row) => supabaseAdmin.from("memberships").upsert(row, { onConflict: "user_id" }), {
      user_id: context.userId,
      email,
      display_name: displayName,
      is_paid: shouldBePaid,
      payment_source: paymentSource,
      paid_at: shouldBePaid ? (existing?.paid_at ?? new Date().toISOString()) : null,
      access_expires_at: paymentSource === "courtesy" ? (courtesy?.expires_at ?? null) : paymentSource === "manual" ? (existing?.access_expires_at ?? null) : null,
    });

    return { isAdmin, isPaid: shouldBePaid, paymentSource };
  });

export const listAdminPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const authUsers: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      authUsers.push(...(data.users ?? []));
      if ((data.users ?? []).length < 200) break;
    }
    const [{ data: memberships }, { data: courtesy }, overview] = await Promise.all([
      supabaseAdmin.from("memberships").select("*"),
      supabaseAdmin.from("courtesy_accounts").select("*").eq("active", true).order("granted_at", { ascending: false }),
      supabaseAdmin.rpc("reader_admin_overview"),
    ]);
    const stats = new Map<string, { books: number; usage: AdminUser["usage"] }>(
      ((overview?.data as { user_id: string; books: number; usage: AdminUser["usage"] }[] | null) ?? []).map((r) => [r.user_id, { books: Number(r.books), usage: r.usage ?? {} }]),
    );
    const byId = new Map<string, any>((memberships ?? []).map((m: any) => [m.user_id, m]));
    const users: AdminUser[] = authUsers.map((user) => {
      const m = byId.get(user.id);
      const email = (m?.email || user.email || "").toLowerCase();
      const expired = m?.access_expires_at && !isFuture(m.access_expires_at);
      return {
        uid: user.id,
        email,
        displayName: m?.display_name ?? (user.user_metadata?.name as string | null) ?? null,
        isPaid: Boolean(m?.is_paid) && !expired,
        paymentSource: m?.payment_source ?? "none",
        paidAt: m?.paid_at ?? null,
        createdAt: user.created_at ?? m?.created_at ?? null,
        isAdmin: email === ADMIN_EMAIL,
        plan: m?.plan ?? null,
        whopStatus: m?.status ?? null,
        currentPeriodEnd: m?.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(m?.cancel_at_period_end),
        accessExpiresAt: m?.access_expires_at ?? null,
        books: stats.get(user.id)?.books ?? 0,
        usage: stats.get(user.id)?.usage ?? {},
      };
    });
    // Solo si cada variable existe; nunca su valor.
    const whop = Object.fromEntries(
      ["WHOP_API_KEY", "WHOP_WEBHOOK_SECRET", "WHOP_ACCOUNT_ID", "WHOP_PLAN_MONTHLY", "WHOP_PLAN_YEARLY"].map((k) => [k, Boolean(process.env[k])]),
    ) as Record<string, boolean>;
    return { users, courtesy: (courtesy ?? []) as CourtesyItem[], whop, migrated: !overview?.error };
  });

export const setMembershipPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), isPaid: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !authUser.user?.email) throw new Error("Usuario no encontrado");
    const { data: existing } = await supabaseAdmin.from("memberships").select("payment_source,is_paid").eq("user_id", data.userId).maybeSingle();
    if (!data.isPaid && existing?.payment_source === "whop" && existing.is_paid) {
      throw new Error("Esta suscripción la cobra Whop. Cancélala o reembólsala desde tu panel de Whop; aquí se actualizará sola.");
    }
    const email = authUser.user.email.toLowerCase().trim();
    const displayName = (authUser.user.user_metadata?.name as string | undefined) || email.split("@")[0];
    await supabaseAdmin.from("profiles").upsert({ id: data.userId, display_name: displayName }, { onConflict: "id" });
    if (!data.isPaid && existing?.payment_source === "courtesy") {
      await supabaseAdmin.from("courtesy_accounts").update({ active: false, revoked_at: new Date().toISOString() }).eq("email", email);
    }
    await writeCompat((row) => supabaseAdmin.from("memberships").upsert(row, { onConflict: "user_id" }), {
      user_id: data.userId,
      email,
      display_name: displayName,
      is_paid: data.isPaid,
      payment_source: data.isPaid ? "manual" : "none",
      paid_at: data.isPaid ? new Date().toISOString() : null,
      access_expires_at: null,
    });
    return { ok: true };
  });

export const addCourtesyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email(), months: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(0), note: z.string().max(300).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const email = data.email.toLowerCase().trim();
    const expires = data.months ? addMonths(data.months) : null;
    await writeCompat((row) => supabaseAdmin.from("courtesy_accounts").upsert(row, { onConflict: "email" }), {
      email,
      active: true,
      granted_by: context.userId,
      granted_at: new Date().toISOString(),
      revoked_at: null,
      expires_at: expires,
      note: data.note.trim(),
    });
    // Si ya tiene cuenta, se activa al momento; si no, al iniciar sesión por primera vez.
    // Una suscripción de Whop activa no se toca.
    const { data: rows } = await supabaseAdmin.from("memberships").select("user_id,payment_source,is_paid").eq("email", email);
    for (const m of rows ?? []) {
      if (m.payment_source === "whop" && m.is_paid) continue;
      await writeCompat((row) => supabaseAdmin.from("memberships").update(row).eq("user_id", m.user_id), {
        is_paid: true,
        payment_source: "courtesy",
        paid_at: new Date().toISOString(),
        access_expires_at: expires,
      });
    }
    return { ok: true };
  });

export const removeCourtesyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const email = data.email.toLowerCase().trim();
    await supabaseAdmin.from("courtesy_accounts").update({ active: false, revoked_at: new Date().toISOString() }).eq("email", email);
    // Antes solo se desactivaba la cortesía y la persona seguía con acceso pago.
    await writeCompat((row) => supabaseAdmin.from("memberships").update(row).eq("email", email).eq("payment_source", "courtesy"), {
      is_paid: false,
      payment_source: "none",
      paid_at: null,
      access_expires_at: null,
    });
    return { ok: true };
  });

/** Devuelve a cero las consultas del mes de un lector (soporte). */
export const resetMonthlyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const month = new Date();
    const first = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { error } = await supabaseAdmin.from("reader_feature_usage").delete().eq("user_id", data.userId).eq("month", first);
    if (error) throw new Error("No pude reiniciar las consultas. ¿Ya aplicaste la migración 0016?");
    return { ok: true };
  });
