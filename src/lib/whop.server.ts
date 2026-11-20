import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";
import type { PlanKind } from "./plans";

// Integración con Whop (https://docs.whop.com). Solo servidor: la API key nunca
// llega al navegador. Variables (secretos de Lovable):
//   WHOP_API_KEY, WHOP_WEBHOOK_SECRET, WHOP_ACCOUNT_ID (biz_…),
//   WHOP_PLAN_MONTHLY, WHOP_PLAN_YEARLY (plan_…).
const API = "https://api.whop.com/api/v1";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar ${name} en el servidor.`);
  return value;
}

export function whopPlanId(kind: PlanKind) {
  return env(kind === "monthly" ? "WHOP_PLAN_MONTHLY" : "WHOP_PLAN_YEARLY");
}

function planKind(variantId: string | null | undefined): PlanKind | null {
  if (!variantId) return null;
  if (variantId === process.env.WHOP_PLAN_MONTHLY) return "monthly";
  if (variantId === process.env.WHOP_PLAN_YEARLY) return "yearly";
  return null;
}

async function whop<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env("WHOP_API_KEY")}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error("[whop]", path, response.status, (await response.text()).slice(0, 300));
    throw new Error("No pudimos conectar con el sistema de pagos. Inténtalo de nuevo.");
  }
  return (await response.json()) as T;
}

export async function createWhopCheckout(kind: PlanKind, userId: string, redirectUrl: string) {
  const result = await whop<{ purchase_url?: string | null }>("/checkout_configurations", {
    method: "POST",
    headers: { "idempotency-key": `koa-${userId}-${kind}-${new Date().toISOString().slice(0, 13)}` },
    body: JSON.stringify({
      account_id: env("WHOP_ACCOUNT_ID"),
      variant_id: whopPlanId(kind),
      metadata: { user_id: userId },
      redirect_url: redirectUrl,
    }),
  });
  if (!result.purchase_url) throw new Error("El sistema de pagos no devolvió el enlace de pago.");
  return result.purchase_url;
}

export type WhopMembership = {
  id: string;
  status: string;
  variant_id?: string | null;
  metadata?: Record<string, unknown> | null;
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
  manage_url?: string | null;
};

export function getWhopMembership(id: string) {
  if (!/^mem_[A-Za-z0-9]+$/.test(id)) throw new Error("Membresía no válida.");
  return whop<WhopMembership>(`/memberships/${id}`);
}

/**
 * Verifica la firma Standard Webhooks que envía Whop:
 * base64(HMAC-SHA256(secreto, `${id}.${timestamp}.${cuerpo}`)) en `webhook-signature` como `v1,<firma>`.
 * La documentación no aclara si el secreto se usa tal cual o decodificado en base64,
 * así que se aceptan ambas derivaciones (las dos exigen conocer el secreto).
 */
export function verifyWhopSignature(rawBody: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const message = `${id}.${timestamp}.${rawBody}`;
  const keys: Buffer[] = [Buffer.from(secret, "utf8")];
  const stripped = secret.replace(/^(whsec_|ws_)/, "");
  if (/^[A-Za-z0-9+/=]+$/.test(stripped)) keys.push(Buffer.from(stripped, "base64"));
  const expected = keys.map((key) => createHmac("sha256", key).update(message).digest());
  return signatures.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return expected.some((e) => e.length === given.length && timingSafeEqual(e, given));
  });
}

const PRO_STATUSES = new Set(["active", "trialing"]);

/** Guarda el estado real de la membresía (leído de la API, no del webhook) en Supabase. */
export async function syncWhopMembership(membership: WhopMembership) {
  const userId = typeof membership.metadata?.user_id === "string" ? membership.metadata.user_id : null;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    console.warn("[whop] membership without user_id metadata", membership.id);
    return { ok: false as const, reason: "sin usuario" };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !authUser.user?.email) return { ok: false as const, reason: "usuario no encontrado" };
  const email = authUser.user.email.toLowerCase().trim();
  const displayName = (authUser.user.user_metadata?.name as string | undefined) || email.split("@")[0];
  await supabaseAdmin.from("profiles").upsert({ id: userId, display_name: displayName }, { onConflict: "id", ignoreDuplicates: true });

  const { data: current } = await supabaseAdmin.from("memberships").select("payment_source,paid_at").eq("user_id", userId).maybeSingle();
  const active = PRO_STATUSES.has(membership.status);
  // Una cortesía, un acceso manual o un admin no se pierden porque Whop cancele.
  const keepsOtherAccess = current && ["courtesy", "manual", "admin"].includes(current.payment_source) && !active;
  const fields = {
    whop_membership_id: membership.id,
    plan: planKind(membership.variant_id),
    status: membership.status,
    current_period_end: membership.current_period_end ?? null,
    cancel_at_period_end: Boolean(membership.cancel_at_period_end),
  };
  const row = keepsOtherAccess
    ? { user_id: userId, email, display_name: displayName, ...fields }
    : {
        user_id: userId,
        email,
        display_name: displayName,
        ...fields,
        is_paid: active,
        payment_source: active ? "whop" : "none",
        // Whop manda su propio periodo; un vencimiento de cortesía previo no aplica.
        access_expires_at: null,
        paid_at: active ? (current?.paid_at ?? new Date().toISOString()) : null,
      };
  const { error: saveError } = await supabaseAdmin.from("memberships").upsert(row as never, { onConflict: "user_id" });
  if (saveError) throw saveError;
  return { ok: true as const, userId, active };
}

/** Manejador del webhook: verifica, relee la membresía en la API y sincroniza. */
export async function handleWhopWebhook(request: Request) {
  try {
    return await processWhopWebhook(request);
  } catch (error) {
    // Nunca expone valores: solo el tipo de error, para poder diagnosticar.
    console.error("[whop] webhook crashed", error);
    return Response.json({ error: "webhook error", kind: error instanceof Error ? error.name : typeof error }, { status: 500 });
  }
}

async function processWhopWebhook(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook sin configurar en el servidor (WHOP_WEBHOOK_SECRET)." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 200_000) return new Response("too large", { status: 413 });
  if (!verifyWhopSignature(raw, request.headers, secret)) return new Response("invalid signature", { status: 401 });
  let event: { type?: string; data?: { id?: string; membership_id?: string; membership?: { id?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const type = event.type ?? "";
  const membershipId = type.startsWith("membership.") ? event.data?.id : (event.data?.membership_id ?? event.data?.membership?.id);
  if (!membershipId || !membershipId.startsWith("mem_")) return Response.json({ ignored: type });
  try {
    const result = await syncWhopMembership(await getWhopMembership(membershipId));
    return Response.json({ received: type, ...result });
  } catch (error) {
    console.error("[whop] sync failed", error instanceof Error ? error.message : error);
    // 500 para que Whop reintente.
    return new Response("sync failed", { status: 500 });
  }
}
