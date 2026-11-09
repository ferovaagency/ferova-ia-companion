import { z } from "zod";
import type { Book, RecommendationOption } from "@/types";
type ShelfBook = Pick<Book, "id" | "title" | "author" | "status"> &
  Partial<Pick<Book, "series_name" | "series_index">>;
const key = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
function eligibleSeries(book: Pick<ShelfBook, "series_name" | "series_index">, shelf: ShelfBook[]) {
  if (!book.series_name) return true;
  const series = key(book.series_name);
  if (shelf.some((b) => b.series_name && key(b.series_name) === series && b.status === "ABANDONED"))
    return false;
  if (book.series_index === 1) return true;
  if (!book.series_index) return false;
  return shelf.some(
    (b) =>
      b.status === "READ" &&
      b.series_name &&
      key(b.series_name) === series &&
      b.series_index === book.series_index! - 1,
  );
}
export function eligibleBooks(shelf: ShelfBook[]) {
  return shelf.filter(
    (b) => (b.status === "TBR" || b.status === "READING") && eligibleSeries(b, shelf),
  );
}
const option = z.object({
  reasoning: z.string().trim().min(1),
  bookId: z.string().nullish(),
  external: z
    .object({
      title: z.string().trim().min(1),
      author: z.string().trim().min(1),
      genre: z.string().optional(),
      pages: z.number().int().min(0).optional(),
      moods: z.array(z.string()).optional(),
      description: z.string().optional(),
      series_name: z.string().nullish(),
      series_index: z.number().positive().nullish(),
    })
    .nullish(),
});
export function collectOptions(raw: unknown, shelf: ShelfBook[], selected: RecommendationOption[]) {
  if (!Array.isArray(raw)) return;
  const available = eligibleBooks(shelf);
  const identify = (b: { title: string; author: string }) => key(b.title) + "|" + key(b.author);
  const seen = new Set(
    selected.map((o) =>
      o.external ? identify(o.external) : identify(shelf.find((b) => b.id === o.bookId)!),
    ),
  );
  for (const candidate of raw) {
    if (selected.length >= 3) break;
    const parsed = option.safeParse(candidate);
    if (!parsed.success) continue;
    const { bookId, external, reasoning } = parsed.data;
    if (Boolean(bookId) === Boolean(external)) continue;
    const book = external ?? available.find((b) => b.id === bookId);
    if (!book || seen.has(identify(book))) continue;
    if (
      external &&
      (shelf.some((b) => identify(b) === identify(external)) || !eligibleSeries(external, shelf))
    )
      continue;
    selected.push({ bookId, external, reasoning });
    seen.add(identify(book));
  }
}
