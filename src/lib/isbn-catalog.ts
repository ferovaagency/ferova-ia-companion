import { z } from "zod";
import { isbn13 } from "./reading";

export interface Edition {
  title: string;
  authors?: { name: string }[];
  number_of_pages?: number;
  cover?: { medium?: string };
}
const openEntry = z.object({
  title: z.string().trim().min(1),
  authors: z.array(z.object({ name: z.string() })).optional(),
  number_of_pages: z.number().optional(),
  cover: z.object({ medium: z.string().optional() }).optional(),
});
const nationalEntry = z.object({
  productName: z.string().trim().min(1),
  lib_eb_isbn: z.array(z.string()).optional(),
  "Autor(es)": z.array(z.string()).optional(),
  lib_num_paginas: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        ean: z.string().optional(),
        images: z.array(z.object({ imageUrl: z.string() })).optional(),
      }),
    )
    .optional(),
});
async function json(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Catálogo no disponible");
  return response.json();
}
async function national(isbn: string): Promise<Edition | null> {
  const raw = await json(
    "https://www.librerianacional.com/api/catalog_system/pub/products/search/" + isbn,
  );
  if (!Array.isArray(raw)) throw new Error("Catálogo no disponible");
  for (const item of raw) {
    const parsed = nationalEntry.safeParse(item);
    if (!parsed.success) continue;
    const book = parsed.data;
    const sku = book.items?.find((v) => v.ean && isbn13(v.ean) === isbn);
    if (!sku && !book.lib_eb_isbn?.some((v) => isbn13(v) === isbn)) continue;
    const pages = Number(book.lib_num_paginas?.[0]);
    return {
      title: book.productName,
      authors: book["Autor(es)"]?.map((name) => ({ name })),
      number_of_pages: Number.isInteger(pages) && pages > 0 ? pages : undefined,
      cover: { medium: (sku ?? book.items?.[0])?.images?.[0]?.imageUrl },
    };
  }
  return null;
}
async function openLibrary(isbn: string): Promise<Edition | null> {
  const key = "ISBN:" + isbn;
  const raw = await json("https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=" + key);
  const parsed = z.record(z.unknown()).parse(raw);
  if (!(key in parsed)) return null;
  return openEntry.parse(parsed[key]);
}
export async function findEdition(isbn: string) {
  const providers = /^978(84|958|628)/.test(isbn)
    ? [national, openLibrary]
    : [openLibrary, national];
  let unavailable = false;
  for (const get of providers) {
    try {
      const edition = await get(isbn);
      if (edition) return { edition, unavailable: false };
    } catch {
      unavailable = true;
    }
  }
  return { edition: null, unavailable };
}
