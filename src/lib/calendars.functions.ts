import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { claimFeature } from "./plans.functions";
import { ADVENT_BOOK_SLOTS, challengeFor } from "./advent-challenges";
import { adventUnlocked, localCalendarDate, monthlyTasks, catalogBookSchema, feelingPrompt } from "./reader-discoveries";

const zoneSchema = z.string().min(1).max(100).refine((zone) => { try { localCalendarDate(zone); return true; } catch { return false; } }, "Zona horaria no válida.");
const input = z.object({ kind: z.enum(["advent", "monthly"]), year: z.number().int().min(2026).max(2200), zone: zoneSchema });
export const calendarState = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => input.parse(value)).handler(async ({ data, context }) => {
  const local = localCalendarDate(data.zone);
  const { data: calendar, error } = await context.supabase.from("reader_calendars").select("*").eq("user_id", context.userId).eq("kind", data.kind).eq("year", data.year).maybeSingle();
  if (error) throw error;
  if (!calendar) return { calendar: null, entries: [], ready: 0, done: [] as number[], local };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("reader_calendar_entries").select("*").eq("calendar_id", calendar.id).order("slot");
  if (result.error) throw result.error;
  // Adviento: solo las 14 ventanas de libro tienen descubrimiento; las de reto no se preparan.
  const rows = (result.data ?? []).filter((e) => data.kind === "monthly" || ADVENT_BOOK_SLOTS.includes(e.slot));
  let done: number[] = [];
  if (data.kind === "advent") {
    const progress = await (context.supabase as unknown as { from: (t: string) => any }).from("reader_advent_progress").select("slot").eq("calendar_id", calendar.id);
    if (!progress.error) done = (progress.data as { slot: number }[]).map((r) => r.slot);
  }
  return { calendar, entries: rows.filter((e) => data.kind === "monthly" || e.opened_at !== null), ready: rows.length, done, local };
});
export const prepareCalendar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => input.extend({ request: z.string().max(1500), direction: z.enum(["similar", "different"]).default("similar"), replace: z.number().int().min(1).max(12).optional() }).parse(value)).handler(async ({ data, context }) => {
  const local = localCalendarDate(data.zone);
  if (data.year !== local.year) throw new Error("Prepara el calendario del año actual según tu fecha local.");
  if (data.replace && data.kind !== "monthly") throw new Error("Las ventanas abiertas no se reemplazan.");
  if (data.kind === "monthly") await claimFeature(context.supabase, "monthly_calendar");
  if (!data.replace) {
    // Un calendario completo no se vuelve a preparar: no gastes una consulta del Oráculo.
    const total = data.kind === "advent" ? ADVENT_BOOK_SLOTS.length : 12;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.from("reader_calendars").select("id").eq("user_id", context.userId).eq("kind", data.kind).eq("year", data.year).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const filled = await supabaseAdmin.from("reader_calendar_entries").select("slot").eq("calendar_id", existing.data.id);
      if (filled.error) throw filled.error;
      const count = filled.data.filter((e) => data.kind === "monthly" || ADVENT_BOOK_SLOTS.includes(e.slot)).length;
      if (count >= total) return { ok: true };
    }
  }
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
  const slots = data.replace ? [data.replace] : (data.kind === "advent" ? ADVENT_BOOK_SLOTS : Array.from({ length: 12 }, (_, i) => i + 1)).filter((slot) => !stored.data.some((e) => e.slot === slot));
  if (!slots.length) return { ok: true };
  const candidates = await selectDiscoveries(reader, `${data.request}. ${feelingPrompt({ feelings: reader.feelings, pageFeelings: reader.pageFeelings }, data.direction)}. ${data.kind === "advent" ? `${slots.length} descubrimientos para tus lecturas de ${data.year + 1}, sin obligación diaria` : "Capítulos mensuales a mi ritmo"}`, slots.length, [...reader.books, ...wishes, ...stored.data]);
  const result = await supabaseAdmin.rpc("install_reader_candidates", { p_user: context.userId, p_calendar: c.data.id, p_entries: candidates.map((b, i) => ({ ...b, slot: slots[i], task: data.kind === "monthly" ? monthlyTasks[slots[i] - 1] : "" })) });
  if (result.error) throw new Error("Tus lecturas cambiaron mientras preparábamos el calendario. No se guardaron duplicados; reintenta.");
  return { ok: true };
});
export const revealWindow = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => z.object({ calendar: z.string().uuid(), slot: z.number().int().min(1).max(24), zone: zoneSchema }).parse(value)).handler(async ({ data, context }) => {
  const c = await context.supabase.from("reader_calendars").select("*").eq("id", data.calendar).eq("user_id", context.userId).single();
  if (c.error) throw new Error("No encontramos tu calendario.");
  if (!adventUnlocked(c.data.year, data.slot, data.zone)) throw new Error("Esta ventana se abre en diciembre según tu fecha local.");
  if (challengeFor(data.slot)) throw new Error("Esta ventana trae un reto, no un libro.");
  let result = await context.supabase.rpc("reveal_reader_window", { p_calendar: data.calendar, p_slot: data.slot, p_zone: data.zone });
  if (result.error?.message.includes("REPLACE_UNOPENED_DUPLICATE")) {
    const { error } = await context.supabase.rpc("claim_koa_request"); if (error) throw new Error("Espera antes de pedir otro descubrimiento.");
    const { readerContext } = await import("./reader-context.server");
    const { selectDiscoveries } = await import("./catalog-discoveries.server");
    const reader = await readerContext(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const entries = await supabaseAdmin.from("reader_calendar_entries").select("*").eq("calendar_id", data.calendar);
    const wishes: { title: string; author: string; isbn: string | null }[] = [];
    for (let from = 0; ; from += 500) { const page = await context.supabase.from("reader_wishes").select("title,author,isbn").eq("user_id", context.userId).order("id").range(from, from + 499); if (page.error) throw new Error("No pudimos revisar tus deseos."); wishes.push(...page.data); if (page.data.length < 500) break; }
    if (entries.error) throw new Error("No pudimos revisar tus descubrimientos.");
    const candidates = await selectDiscoveries(reader, c.data.context, 1, [...reader.books, ...wishes, ...entries.data]);
    const installed = await supabaseAdmin.rpc("install_reader_candidates", { p_user: context.userId, p_calendar: data.calendar, p_entries: [{ ...candidates[0], slot: data.slot, task: "" }] });
    if (installed.error) throw new Error("No pudimos reemplazar una ventana repetida. Conservamos las ventanas abiertas.");
    result = await context.supabase.rpc("reveal_reader_window", { p_calendar: data.calendar, p_slot: data.slot, p_zone: data.zone });
  }
  if (result.error) throw new Error("No pudimos abrir la ventana. Tu calendario sigue guardado.");
  return catalogBookSchema.parse(result.data);
});
export const saveDiscovery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => z.object({ calendar: z.string().uuid(), slot: z.number().int().min(1).max(24) }).parse(value)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc("save_reader_discovery", { p_calendar: data.calendar, p_slot: data.slot });
  if (result.error) throw new Error("No pudimos guardar el descubrimiento; abre primero la ventana.");
  return { id: result.data };
});
/** Marca un reto del Adviento. La base de datos verifica el avance real del día (páginas, minutos o nota). */
export const completeAdventChallenge = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => z.object({ calendar: z.string().uuid(), slot: z.number().int().min(1).max(24), zone: zoneSchema }).parse(value)).handler(async ({ data, context }) => {
  if (!challengeFor(data.slot)) throw new Error("Esta ventana trae un libro, no un reto.");
  const result = await (context.supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> }).rpc("complete_advent_challenge", { p_calendar: data.calendar, p_slot: data.slot, p_zone: data.zone });
  if (result.error) {
    if (/complete_advent_challenge|schema cache|PGRST202/i.test(result.error.message)) throw new Error("Los retos del Adviento se activan en cuanto termine la actualización de la app.");
    throw new Error(result.error.message);
  }
  return { ok: true };
});
