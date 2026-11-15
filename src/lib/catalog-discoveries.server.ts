import { z } from "zod";
import { generateResponse } from "@lovable.dev/ai-gateway";
import { uniqueDiscoveries, type IdentityBook, type CatalogBook } from "./reader-discoveries";

const volumeResponse = z.object({ items: z.array(z.object({ id: z.string(), volumeInfo: z.object({ title: z.string(), authors: z.array(z.string()).optional(), description: z.string().optional(), industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(), imageLinks: z.object({ thumbnail: z.string().optional() }).optional() }) })).optional() });
const openResponse = z.object({ docs: z.array(z.object({ key: z.string(), title: z.string(), author_name: z.array(z.string()).optional(), isbn: z.array(z.string()).optional(), cover_i: z.number().optional() })) });
export async function catalogPool(queries: string[]): Promise<CatalogBook[]> {
  const books: CatalogBook[] = [];
  await Promise.all(queries.slice(0, 6).map(async (query) => {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q: query, maxResults: "30", printType: "books" })}`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("catalog");
      const result = volumeResponse.parse(await response.json());
      for (const item of result.items ?? []) {
        const info = item.volumeInfo;
        if (!info.authors?.length) continue;
        const url = info.imageLinks?.thumbnail?.replace(/^http:/, "https:");
        books.push({ catalog_id: `google:${item.id}`, title: info.title, author: info.authors.join(", "), isbn: info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? info.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier ?? null, cover_url: url && new URL(url).hostname === "books.google.com" ? url : null, description: (info.description ?? "").replace(/<[^>]+>/g, "").slice(0, 1200) });
      }
    } catch { /* A second established catalog is available, never arbitrary URLs. */ }
    try {
      const response = await fetch(`https://openlibrary.org/search.json?${new URLSearchParams({ q: query, limit: "30", fields: "key,title,author_name,isbn,cover_i" })}`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) return;
      const result = openResponse.parse(await response.json());
      for (const doc of result.docs) if (doc.author_name?.length) books.push({ catalog_id: `openlibrary:${doc.key}`, title: doc.title, author: doc.author_name.join(", "), isbn: doc.isbn?.find((i) => i.length === 13) ?? doc.isbn?.[0] ?? null, cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null, description: "" });
    } catch { /* Report insufficient verified candidates upstream. */ }
  }));
  return uniqueDiscoveries(books, []);
}
export async function selectDiscoveries(context: unknown, request: string, count: number, excluded: IdentityBook[]) {
  // The oracle chooses identities FROM catalog records, never fabricates catalog metadata.
  const queryReply = await generateResponse({ model: "openai/gpt-6-astra", input: `Devuelve SOLO JSON {"queries":[string]} con 6 búsquedas breves de catálogos de libros según estos gustos: ${JSON.stringify(context)}. Contexto actual: ${request}. Mezcla autores/géneros relevantes. Sin diagnósticos. No necesitas inventar libros.` });
  const queryText = queryReply.output.flatMap((item) => item.type === "message" ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : []) : []).join("");
  const queries = z.object({ queries: z.array(z.string().min(1).max(120)).min(1).max(6) }).parse(JSON.parse(queryText.replace(/^```json\s*|```$/g, "")));
  const pool = uniqueDiscoveries(await catalogPool(queries.queries), excluded);
  if (pool.length < count) throw new Error(`Solo encontré ${pool.length} libros verificables que no tienes. Conservamos tus ventanas abiertas; cambia tus preferencias o reintenta más tarde.`);
  const selection = await generateResponse({ model: "openai/gpt-6-astra", input: `Elige exactamente ${count} libros distintos para la persona: ${JSON.stringify(context)}. Contexto: ${request}. No continuar sagas sin antecedente; elige primeras entregas o independientes. Devuelve SOLO JSON {"ids":[string]} usando EXCLUSIVAMENTE catalog_id de este catálogo verificado: ${JSON.stringify(pool.map((b) => ({ id: b.catalog_id, title: b.title, author: b.author })))}. No inventes IDs.` });
  const text = selection.output.flatMap((item) => item.type === "message" ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : []) : []).join("");
  const ids = z.object({ ids: z.array(z.string()).length(count) }).parse(JSON.parse(text.replace(/^```json\s*|```$/g, ""))).ids;
  const result = uniqueDiscoveries(ids.flatMap((id) => { const b = pool.find((book) => book.catalog_id === id); return b ? [b] : []; }), excluded);
  if (result.length !== count) throw new Error("El Oráculo no reunió suficientes opciones distintas verificadas. No se guardaron resultados incompletos.");
  return result;
}