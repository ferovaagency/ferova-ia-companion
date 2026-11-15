import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adventUnlocked, localCalendarDate, monthlyTasks, catalogBookSchema } from "./reader-discoveries";

const input = z.object({ kind: z.enum(["advent", "monthly"]), year: z.number().int().min(2026).max(2200), zone: z.string().min(1).max(100) });
export const calendarState = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => input.parse(value)).handler(async ({ data, context }) => {
  const local = localCalendarDate(data.zone);
  const { data: calendar, error } = await context.supabase.from("reader_calendars").select("*").eq("user_id", context.userId).eq("kind", data.kind).eq("year", data.year).maybeSingle();
  if (error) throw error;
  if (!calendar) return { calendar: null, entries: [], ready: 0, local };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("reader_calendar_entries").select("*").eq("calendar_id", calendar.id).order("slot");
  if (result.error) throw result.error;
  return { calendar, entries: (result.data ?? []).filter((e) => data.kind === "monthly" || e.opened_at !== null), ready: result.data?.length ?? 0, local };
});
export const prepareCalendar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => input.extend({ request: z.string().max(1500), replace: z.number().int().min(1).max(12).optional() }).parse(value)).handler(async ({ data, context }) => {
  const local = localCalendarDate(data.zone);
  if (data.year !== local.year) throw new Error("Prepara el calendario del año actual según tu fecha local.");
  if (data.replace && data.kind !== "monthly") throw new Error("Las ventanas abiertas no se reemplazan.");
  const { error: quotaError } = await context.supabase.rpc("claim_koa_request");
  if (quotaError) throw new Error("Has alcanzado el límite temporal del Oráculo. Reintenta más tarde.");
  const { readerContext } = await import("./reader-context.server");
  const { selectDiscoveries } = await import("./catalog-discoveries.server");
  const reader = await readerContext(context.supabase, context.userId);
  const wishes: { title: string; author: string; isbn: string | null }[] = [];
  for (let from = 0; ; from += 500) { const r = await context.supabase.from("reader_wishes").select("title,author,isbn").eq("user_id", context.userId).order("id").range(from, from + 499); if (r.error) throw r.error; wishes.push(...r.data); if (r.data.length < 500) break; }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const c = await supabaseAdmin.from("reader_calendars").upsert({ user_id: context.userId, kind: data.kind, year: data.year, context: data.request }, { onConflict: "user_id,kind,year" }).select("*").single();
  if (c.error) throw c.error;
  const stored = await supabaseAdmin.from("reader_calendar_entries").select("*").eq("calendar_id", c.data.id);
  if (stored.error) throw stored.error;
  const slots = data.replace ? [data.replace] : Array.from({ length: data.kind === "advent" ? 24 : 12 }, (_, i) => i + 1).filter((slot) => !stored.data.some((e) => e.slot === slot));
  if (!slots.length) return { ok: true };
  const candidates = await selectDiscoveries(reader, `${data.request}. ${data.kind === "advent" ? `24 descubrimientos para tus lecturas de ${data.year + 1}, sin obligación diaria` : "Capítulos mensuales a mi ritmo"}`, slots.length, [...reader.books, ...wishes, ...stored.data]);
  const result = await supabaseAdmin.rpc("install_reader_candidates", { p_user: context.userId, p_calendar: c.data.id, p_entries: candidates.map((b, i) => ({ ...b, slot: slots[i], task: data.kind === "monthly" ? monthlyTasks[slots[i] - 1] : "" })) });
  if (result.error) throw new Error("Tus lecturas cambiaron mientras preparábamos el calendario. No se guardaron duplicados; reintenta.");
  return { ok: true };
});
export const revealWindow = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => z.object({ calendar: z.string().uuid(), slot: z.number().int().min(1).max(24), zone: z.string().max(100) }).parse(value)).handler(async ({ data, context }) => {
  const c = await context.supabase.from("reader_calendars").select("*").eq("id", data.calendar).eq("user_id", context.userId).single();
  if (c.error) throw new Error("No encontramos tu calendario.");
  if (!adventUnlocked(c.data.year, data.slot, data.zone)) throw new Error("Esta ventana se abre en diciembre según tu fecha local.");
  let result = await context.supabase.rpc("reveal_reader_window", { p_calendar: data.calendar, p_slot: data.slot, p_zone: data.zone });
  if (result.error?.message.includes("REPLACE_UNOPENED_DUPLICATE")) {
    const { error } = await context.supabase.rpc("claim_koa_request"); if (error) throw new Error("Espera antes de pedir otro descubrimiento.");
    const { readerContext } = await import("./reader-context.server");
    const { selectDiscoveries } = await import("./catalog-discoveries.server");
    const reader = await readerContext(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const entries = await supabaseAdmin.from("reader_calendar_entries").select("*").eq("calendar_id", data.calendar);
    const wishes = await context.supabase.from("reader_wishes").select("title,author,isbn").eq("user_id", context.userId);
    if (entries.error || wishes.error) throw new Error("No pudimos revisar tus descubrimientos.");
    const candidates = await selectDiscoveries(reader, c.data.context, 1, [...reader.books, ...wishes.data, ...entries.data]);
    const installed = await supabaseAdmin.rpc("install_reader_candidates", { p_user: context.userId, p_calendar: data.calendar, p_entries: [{ ...candidates[0], slot: data.slot, task: "" }] });
    if (installed.error) throw new Error("No pudimos reemplazar una ventana repetida. Conservamos las ventanas abiertas.");
    result = await context.supabase.rpc("reveal_reader_window", { p_calendar: data.calendar, p_slot: data.slot, p_zone: data.zone });
  }
  if (result.error) throw new Error("No pudimos abrir la ventana. Tu calendario sigue guardado.");
  return catalogBookSchema.passthrough().parse(result.data);
});
export const saveDiscovery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => z.object({ calendar: z.string().uuid(), slot: z.number().int().min(1).max(24) }).parse(value)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc("save_reader_discovery", { p_calendar: data.calendar, p_slot: data.slot });
  if (result.error) throw new Error("No pudimos guardar el descubrimiento; abre primero la ventana.");
  return { id: result.data };
});