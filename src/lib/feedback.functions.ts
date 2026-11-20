import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitInput = z.object({
  type: z.enum(["suggestion", "bug", "other"]).default("suggestion"),
  message: z.string().min(5).max(4000),
  email: z.string().email().optional().or(z.literal("")),
});

// Con sesión: antes cualquiera podía escribir en la tabla con la llave de servicio,
// saltándose las reglas de la base y sin límite de envíos.
export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("created_at", since);
    if ((count ?? 0) >= 10) throw new Error("Ya nos enviaste varios mensajes en la última hora. Inténtalo más tarde.");
    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: context.userId,
      type: data.type,
      message: data.message.trim(),
      email: data.email ? data.email.toLowerCase().trim() : null,
      status: "new",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("No autorizado");
  return supabaseAdmin;
}

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("feedback").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "done", "wontfix"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("feedback").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });