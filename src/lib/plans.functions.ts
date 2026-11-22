import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanStatus } from "./plans";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

/** Estado del plan del lector, con el enlace de Whop para administrar la suscripción. */
export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanStatus> => {
    const { data, error } = await (context.supabase as unknown as Rpc).rpc("reader_plan_status");
    if (error) throw new Error("No pudimos leer tu plan. Inténtalo de nuevo.");
    const status = data as PlanStatus;
    if (status.source === "whop") {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("memberships").select("whop_membership_id").eq("user_id", context.userId).maybeSingle();
        const id = (row as { whop_membership_id?: string | null } | null)?.whop_membership_id;
        if (id) {
          const { getWhopMembership } = await import("./whop.server");
          status.manageUrl = (await getWhopMembership(id)).manage_url ?? null;
        }
      } catch {
        status.manageUrl = null;
      }
    }
    return status;
  });

/** Crea el checkout de Whop para el plan elegido y devuelve la URL de pago. */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plan: z.enum(["monthly", "yearly"]), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const origin = new URL(data.origin).origin;
    const allowed = ["https://librero-ia.ferova.com.co", "https://ferova-ia-companion.lovable.app"];
    if (!allowed.includes(origin) && !/^https:\/\/(id-preview--)?1cab2c8c-222e-4717-8c65-0dfa0737db89\.lovable\.app$/.test(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) throw new Error("Origen no válido.");
    const { createWhopCheckout } = await import("./whop.server");
    return { url: await createWhopCheckout(data.plan, context.userId, `${origin}/settings?pro=gracias`) };
  });

/**
 * Consume una unidad de una función con límite del plan gratis.
 * Lanza el mensaje de la base de datos (que menciona Lee con Koa Pro) si no hay cupo.
 */
export async function claimFeature(supabase: unknown, feature: "oracle" | "koa_chat" | "koa_ocr" | "cover_vision" | "image_import" | "bingo_oracle" | "monthly_calendar" | "cover_upload") {
  const { error } = await (supabase as Rpc).rpc("claim_reader_feature", { p_feature: feature });
  if (error) {
    // Mientras la migración 0016 no esté aplicada, no bloquear funciones existentes.
    if (/claim_reader_feature|schema cache|does not exist|PGRST202/i.test(error.message)) return;
    throw new Error(error.message);
  }
}
