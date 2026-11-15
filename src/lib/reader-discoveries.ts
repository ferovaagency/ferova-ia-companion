import { z } from "zod";
export function normalizedIdentity(title: string, author: string) {
  return `${title.toLowerCase().replace(/[\s\p{P}]+/gu, "")}|${author.toLowerCase().replace(/[\s\p{P}]+/gu, "")}`;
}
export function normalizedIsbn(isbn?: string | null) {
  const clean = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  return clean.length === 10 ? `978${clean.slice(0, 9)}` : clean.slice(0, 12);
}
export type IdentityBook = { title: string; author: string; isbn?: string | null };
export function duplicateBook(a: IdentityBook, b: IdentityBook) {
  return normalizedIdentity(a.title, a.author) === normalizedIdentity(b.title, b.author) || (!!normalizedIsbn(a.isbn) && normalizedIsbn(a.isbn) === normalizedIsbn(b.isbn));
}
export function uniqueDiscoveries<T extends IdentityBook>(pool: T[], excluded: IdentityBook[]) {
  const result: T[] = [];
  for (const book of pool) if (![...excluded, ...result].some((b) => duplicateBook(book, b))) result.push(book);
  return result;
}
export function localCalendarDate(zone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (key: string) => Number(parts.find((p) => p.type === key)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
export function adventUnlocked(year: number, slot: number, zone: string, now = new Date()) {
  const local = localCalendarDate(zone, now);
  return local.year === year && local.month === 12 && slot >= 1 && slot <= 24 && local.day >= slot;
}
export const catalogBookSchema = z.object({
  catalog_id: z.string().min(1), title: z.string().min(1), author: z.string().min(1), isbn: z.string().nullable(), cover_url: z.string().nullable(), description: z.string(), pages: z.number().optional(), genre: z.string().optional(),
});
export type CatalogBook = z.infer<typeof catalogBookSchema>;
export const monthlyTasks = ["Elegir una historia para comenzar", "Descubrir una voz nueva", "Explorar otro lugar", "Volver a una lectura querida", "Probar un género diferente", "Leer a mi ritmo", "Compartir una recomendación", "Hacer espacio para un pendiente", "Guardar una cita con su fuente", "Descubrir un mundo imaginado", "Elegir una historia breve", "Mirar mis lecturas del año"];
export const feelingSchema = z.object({ tears: z.number().int().min(0).max(5).nullable(), immersion: z.number().int().min(0).max(5).nullable(), tags: z.array(z.string().trim().min(1).max(40)).max(12), tier: z.enum(["S", "A", "B", "C", "D"]).nullable(), tier_rank: z.number().int().min(1).max(10000).nullable() });
export function feelingPrompt(signals: unknown, direction: "similar" | "different") {
  return `Señales expresadas por la persona: ${JSON.stringify(signals)}. Hoy quiere ${direction === "similar" ? "una sensación parecida" : "algo emocionalmente diferente"}. Lágrimas e inmersión son intensidad, no disgusto. Solo las estrellas y opiniones expresas indican preferencia. No infieras diagnósticos ni emociones no expresadas.`;
}