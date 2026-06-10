import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "gerencia@seoparaecommerce.co";

type AdminUser = {
  uid: string;
  email: string;
  displayName: string | null;
  isPaid: boolean;
  paymentSource: string;
  paidAt: string | null;
  createdAt: string | null;
  isAdmin: boolean;
};

async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const supabaseAdmin = await getAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("No autorizado");
  return supabaseAdmin;
}

export const ensureMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await getAdminClient();
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError || !authUser.user?.email) throw new Error("No se pudo verificar la cuenta");

    const email = authUser.user.email.toLowerCase().trim();
    const displayName =
      (authUser.user.user_metadata?.name as string | undefined) ||
      (authUser.user.user_metadata?.full_name as string | undefined) ||
      email.split("@")[0];

    await supabaseAdmin.from("profiles").upsert({ id: context.userId, display_name: displayName }, { onConflict: "id" });

    if (email === ADMIN_EMAIL) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    }

    const { data: courtesy } = await supabaseAdmin
      .from("courtesy_accounts")
      .select("email")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle();

    const { data: existingMembership } = await supabaseAdmin
      .from("memberships")
      .select("is_paid,payment_source,paid_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    const isAdmin = email === ADMIN_EMAIL;
    const hasManualAccess = Boolean(existingMembership?.is_paid && existingMembership.payment_source !== "none");
    const shouldBePaid = isAdmin || Boolean(courtesy) || hasManualAccess;
    const paymentSource = isAdmin ? "admin" : courtesy ? "courtesy" : existingMembership?.payment_source ?? "none";

    await supabaseAdmin.from("memberships").upsert(
      {
        user_id: context.userId,
        email,
        display_name: displayName,
        is_paid: shouldBePaid,
        payment_source: paymentSource,
        paid_at: shouldBePaid ? existingMembership?.paid_at ?? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    );

    return { isAdmin, isPaid: shouldBePaid, paymentSource };
  });

export const listAdminPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const [{ data: authUsers, error: authError }, { data: memberships }, { data: courtesy }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("memberships").select("*"),
      supabaseAdmin.from("courtesy_accounts").select("*").eq("active", true).order("granted_at", { ascending: false }),
    ]);
    if (authError) throw authError;

    const membershipsById = new Map((memberships ?? []).map((m) => [m.user_id, m]));
    const users: AdminUser[] = (authUsers.users ?? []).map((user) => {
      const membership = membershipsById.get(user.id);
      const email = (membership?.email || user.email || "").toLowerCase();
      return {
        uid: user.id,
        email,
        displayName: membership?.display_name ?? (user.user_metadata?.name as string | null) ?? null,
        isPaid: Boolean(membership?.is_paid),
        paymentSource: membership?.payment_source ?? "none",
        paidAt: membership?.paid_at ?? null,
        createdAt: user.created_at ?? membership?.created_at ?? null,
        isAdmin: email === ADMIN_EMAIL,
      };
    });

    return { users, courtesy: courtesy ?? [] };
  });

export const setMembershipPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), isPaid: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !authUser.user?.email) throw new Error("Usuario no encontrado");
    const email = authUser.user.email.toLowerCase().trim();
    const displayName = (authUser.user.user_metadata?.name as string | undefined) || email.split("@")[0];
    await supabaseAdmin.from("profiles").upsert({ id: data.userId, display_name: displayName }, { onConflict: "id" });
    await supabaseAdmin.from("memberships").upsert(
      {
        user_id: data.userId,
        email,
        display_name: displayName,
        is_paid: data.isPaid,
        payment_source: data.isPaid ? "manual" : "none",
        paid_at: data.isPaid ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    );
    return { ok: true };
  });

export const addCourtesyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const email = data.email.toLowerCase().trim();
    await supabaseAdmin.from("courtesy_accounts").upsert({ email, active: true, granted_by: context.userId, revoked_at: null }, { onConflict: "email" });
    await supabaseAdmin.from("memberships").update({ is_paid: true, payment_source: "courtesy", paid_at: new Date().toISOString() }).eq("email", email);
    return { ok: true };
  });

export const removeCourtesyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const email = data.email.toLowerCase().trim();
    await supabaseAdmin.from("courtesy_accounts").update({ active: false, revoked_at: new Date().toISOString() }).eq("email", email);
    return { ok: true };
  });