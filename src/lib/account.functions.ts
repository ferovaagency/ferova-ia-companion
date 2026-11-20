import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanStatus } from "./plans";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };
const MEDIA_BUCKET = "reader-profile-media";

/**
 * Borra la cuenta y todos los datos del lector (App Store 5.1.1(v), Google Play).
 * Una suscripción de Whop que se renueva sola debe cancelarse antes: Lee con Koa no
 * puede cancelarla desde aquí y seguiría cobrando.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("ELIMINAR") }).parse(input))
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: plan } = await (context.supabase as unknown as Rpc).rpc("reader_plan_status");
    const status = plan as PlanStatus | null;
    if (status?.source === "whop" && status.pro && !status.cancel_at_period_end) {
      throw new Error("Primero cancela tu suscripción a Lee con Koa Pro en Whop (Ajustes → Administrar o cancelar). Después podrás eliminar tu cuenta.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Archivos privados: portadas, avatar y fondo, guardados bajo la carpeta del lector.
    const paths: string[] = [];
    const walk = async (prefix: string, depth: number) => {
      const { data } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(prefix, { limit: 1000 });
      for (const item of data ?? []) {
        const path = `${prefix}/${item.name}`;
        if (item.id) paths.push(path);
        else if (depth < 3) await walk(path, depth + 1);
      }
    };
    await walk(userId, 0);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(paths.slice(i, i + 100));
      if (error) throw new Error("No pudimos borrar tus imágenes. Inténtalo de nuevo.");
    }

    const cleaned = await (supabaseAdmin as unknown as Rpc).rpc("delete_reader_data", { p_user: userId });
    if (cleaned.error) throw new Error("No pudimos borrar tus datos. Inténtalo de nuevo o escríbenos.");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("No pudimos cerrar tu cuenta. Inténtalo de nuevo o escríbenos.");
    return { ok: true };
  });
