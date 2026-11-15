import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const listReaderReports = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("No autorizado.");
  const result = await context.supabase.from("reader_reports").select("id,user_id,target_id,reason,created_at,status").order("created_at", { ascending: false }).limit(500);
  if (result.error) throw result.error;
  return result.data;
});
export const updateReaderReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "done", "wontfix"]) }).parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("No autorizado.");
  const result = await context.supabase.from("reader_reports").update({ status: data.status }).eq("id", data.id).select("id").single();
  if (result.error) throw result.error;
  return { ok: true };
});