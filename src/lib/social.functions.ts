import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// has_role no se puede ejecutar con la sesión del lector (se revocó a authenticated), y las
// políticas de reader_reports lo usan. Por eso el rol se valida y se consulta con la llave de servicio.
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("No autorizado.");
  return supabaseAdmin;
}
export const listReaderReports = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const admin = await assertAdmin(context.userId);
  const result = await admin.from("reader_reports").select("id,user_id,target_id,reason,created_at,status").order("created_at", { ascending: false }).limit(500);
  if (result.error) throw result.error;
  return result.data;
});
export const updateReaderReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "done", "wontfix"]) }).parse(input)).handler(async ({ data, context }) => {
  const admin = await assertAdmin(context.userId);
  const result = await admin.from("reader_reports").update({ status: data.status }).eq("id", data.id).select("id").single();
  if (result.error) throw result.error;
  return { ok: true };
});