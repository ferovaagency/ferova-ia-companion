import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EnrichedBook, RecommendationResult } from "@/types";

/* ---------- cover fetching helpers (no AI key needed) ---------- */
type CatalogMetadata = Partial<EnrichedBook> & { language?: string | null };

function parseJsonObject(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La IA no devolvió JSON válido");
  return JSON.parse(match[0]);
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string) {
  const A = new Set(norm(a).split(" "));
  const B = new Set(norm(b).split(" "));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / Math.max(A.size, B.size);
}

function scoreGoogleVolume(info: any, title: string, author?: string) {
  const titleScore = similarity(info.title || "", title);
  const authorScore = author ? Math.max(...(info.authors || [""]).map((a: string) => similarity(a, author))) : 0;
  const hasPages = info.pageCount ? 0.15 : 0;
  const hasCover = info.imageLinks ? 0.1 : 0;
  return titleScore * 1.5 + authorScore + hasPages + hasCover;
}

async function fetchCatalogMetadata(title: string, author?: string): Promise<CatalogMetadata> {
  // Google Books — pull a wider candidate set and pick best match
  try {
    const q = [`intitle:${title}`, author ? `inauthor:${author}` : ""].filter(Boolean).join(" ");
    const params = new URLSearchParams({ q, maxResults: "10", printType: "books" });
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    if (r.ok) {
      const d: any = await r.json();
      const items: any[] = d.items || [];
      const scored = items
        .map((it) => ({ it, info: it.volumeInfo, score: scoreGoogleVolume(it.volumeInfo || {}, title, author) }))
        .filter((x) => x.info)
        .sort((a, b) => b.score - a.score);

      // Prefer best-scoring item that also has pageCount; fallback to top scorer
      const best = scored.find((x) => x.info.pageCount > 0) || scored[0];
      const info = best?.info;
      if (info) {
        let pages = Number(info.pageCount) || 0;
        let cover = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

        // If no pages, try fetching another edition with pages
        if (!pages || !cover) {
          for (const cand of scored) {
            if (!pages && cand.info.pageCount > 0) pages = Number(cand.info.pageCount);
            if (!cover && cand.info.imageLinks) cover = cand.info.imageLinks.thumbnail || cand.info.imageLinks.smallThumbnail;
            if (pages && cover) break;
          }
        }

        return {
          title: info.title || title,
          author: info.authors?.[0] || author || "Autor desconocido",
          genre: info.categories?.[0]?.split(" /")?.[0] || "Literatura",
          pages,
          description: info.description ? String(info.description).replace(/<[^>]+>/g, "").slice(0, 700) : "",
          cover_url: cover ? String(cover).replace(/^http:/, "https:") : null,
          language: info.language || null,
        };
      }
    }
  } catch {}

  try {
    const params = new URLSearchParams({ title, limit: "5" });
    if (author) params.set("author", author);
    const r = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (r.ok) {
      const d: any = await r.json();
      const docs: any[] = d.docs || [];
      const sorted = docs
        .map((doc) => ({ doc, score: similarity(doc.title || "", title) + (author ? similarity((doc.author_name || [""])[0], author) : 0) }))
        .sort((a, b) => b.score - a.score);
      const doc = (sorted.find((x) => x.doc.cover_i && x.doc.number_of_pages_median) || sorted[0])?.doc;
      if (doc) {
        return {
          title: doc.title || title,
          author: doc.author_name?.[0] || author || "Autor desconocido",
          genre: doc.subject?.[0] || "Literatura",
          pages: Number(doc.number_of_pages_median) || 0,
          cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
          language: doc.language?.[0] || null,
        };
      }
    }
  } catch {}

  return {};
}

async function fetchOriginalCover(title: string, author?: string): Promise<string | null> {
  try {
    const q = [`intitle:${title}`, author ? `inauthor:${author}` : ""].filter(Boolean).join(" ");
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q, maxResults: "1" }).toString()}`);
    if (r.ok) {
      const d: any = await r.json();
      const img =
        d.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ||
        d.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;
      if (img) return String(img).replace(/^http:/, "https:");
    }
  } catch {}
  try {
    const q = `title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ""}`;
    const r = await fetch(`https://openlibrary.org/search.json?${q}&limit=1`);
    if (r.ok) {
      const d: any = await r.json();
      const id = d.docs?.[0]?.cover_i;
      if (id) return `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
    }
  } catch {}
  return null;
}

/* ---------- enrich book metadata via Lovable AI ---------- */
const EnrichInput = z.object({ title: z.string().min(1), author: z.string().optional() });

export const enrichBook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EnrichInput.parse(input))
  .handler(async ({ data }): Promise<EnrichedBook> => {
    const key = process.env.LOVABLE_API_KEY;
    const catalog = await fetchCatalogMetadata(data.title, data.author);
    const isSpanish = (catalog.language || "").toLowerCase().startsWith("es") || /[áéíóúñ¿¡]/i.test(data.title);
    const responseLang = isSpanish ? "ESPAÑOL" : "EL IDIOMA ORIGINAL DEL LIBRO (no traduzcas el título ni el autor)";
    let enriched: Partial<EnrichedBook> = {
      title: catalog.title || data.title,
      author: catalog.author || data.author || "Autor desconocido",
      genre: catalog.genre || "Literatura",
      pages: catalog.pages || 0,
      moods: [],
      description: catalog.description || "",
      cover_url: catalog.cover_url || null,
    };

    if (key) {
      try {
        const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
        const { generateText } = await import("ai");
        const gateway = createLovableAiGatewayProvider(key);
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          prompt: `Eres un catalogador bibliotecario experto y meticuloso. Devuelve metadatos precisos en ${responseLang} para el libro:
TÍTULO INTRODUCIDO POR EL USUARIO: "${data.title}"
${data.author ? `AUTOR INTRODUCIDO: "${data.author}"` : ""}
METADATOS CATALOGADOS (Google Books / Open Library): ${JSON.stringify({ title: enriched.title, author: enriched.author, pages: enriched.pages, language: catalog.language })}

REGLAS CRÍTICAS:
1. IDIOMA: respeta SIEMPRE el idioma original del título introducido por el usuario. Si lo escribió en inglés, devuélvelo en inglés. NO traduzcas el título ni el nombre del autor.
2. EXACTITUD: usa el título y autor más reconocidos del libro real. Si dudas entre varias ediciones, elige la edición original más conocida.
3. PÁGINAS: usa un número realista de una edición de bolsillo típica. Si los metadatos catalogados dan 0, estima en base a tu conocimiento del libro. Nunca devuelvas 0 a menos que sea un libro muy corto real.
4. SAGAS: si pertenece a una saga literaria, completa series_name (nombre exacto de la saga) y series_index (número entero). Si no, ambos null.
5. GÉNERO: un solo género corto y específico (ej. "Fantasía épica", "Novela negra", "Ensayo filosófico").
6. MOODS: 3-5 adjetivos en minúscula sobre atmósfera/tono ("oscuro", "esperanzador", "ágil", "melancólico"...).
7. DESCRIPTION: 1-2 frases breves sin spoilers, en ${responseLang}.
8. Si NO conoces con certeza el libro, devuelve title/author tal como llegaron y pages basadas en los metadatos catalogados.

Devuelve SOLO JSON válido, sin markdown, con esta forma exacta:
{"title": string, "author": string, "genre": string, "pages": number, "moods": string[], "series_name": string|null, "series_index": number|null, "description": string}`,
        });
        const ai = parseJsonObject(text);
        // Trust AI for title/author/series/genre/moods/description; keep catalog pages if AI returns 0
        enriched = {
          ...enriched,
          ...ai,
          pages: Number(ai.pages) > 0 ? Number(ai.pages) : enriched.pages,
        };
      } catch (e) {
        console.error("[enrichBook] AI failed:", e);
      }
    }

    const cover = enriched.cover_url || (await fetchOriginalCover(enriched.title!, enriched.author));
    return {
      title: enriched.title!,
      author: enriched.author!,
      genre: enriched.genre || "General",
      pages: enriched.pages || 0,
      moods: enriched.moods || [],
      series_name: enriched.series_name ?? null,
      series_index: enriched.series_index ?? null,
      description: enriched.description || "",
      cover_url: cover,
    };
  });

/* ---------- AI recommendation ---------- */
const RecommendInput = z.object({
  userRequest: z.string().min(1).max(2000),
  books: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      author: z.string(),
      genre: z.string(),
      pages: z.number(),
      moods: z.array(z.string()),
      series_name: z.string().nullable().optional(),
      series_index: z.number().nullable().optional(),
      status: z.enum(["TBR", "READING", "READ"]),
    }),
  ),
});

export const recommendBook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RecommendInput.parse(input))
  .handler(async ({ data }): Promise<RecommendationResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        reasoning: "El Oráculo no está disponible porque falta la configuración de IA.",
        errorType: "GENERIC",
      };
    }

    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { generateText } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);

      const available = data.books.filter((b) => b.status !== "READ");
      const read = data.books.filter((b) => b.status === "READ").map((b) => `${b.title} (${b.series_name ?? ""} #${b.series_index ?? ""})`);

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        prompt: `Eres EL ORÁCULO de Librero IA: una inteligencia lectora cálida, precisa y obsesiva con el orden narrativo.

EL USUARIO DICE: "${data.userRequest}"

SU ESTANTERÍA PENDIENTE (TBR/READING):
${JSON.stringify(available, null, 2)}

LIBROS YA LEÍDOS: ${read.join(", ") || "ninguno"}

REGLAS:
1. Si un libro de su lista encaja con su vibe actual, devuelve su bookId (UUID exacto del campo "id").
2. REGLA DE SAGAS ABSOLUTA: si el libro está en una saga (series_name), solo recomiéndalo si series_index es 1 o si el libro anterior de la misma saga ya aparece en LIBROS YA LEÍDOS. Nunca saltes volúmenes. Si el usuario tiene una entrega posterior pendiente, pero falta la anterior, sugiere la anterior como externa o busca otra opción.
3. Si menciona BLOQUEO LECTOR, prioriza algo ágil, corto, inmersivo.
4. Si NADA de su lista encaja, o si el usuario pide explícitamente algo nuevo / una saga / un autor que no tiene, sugiere un libro o SAGA EXTERNA en "external".
5. Para sugerencias externas incluye title (el libro EXACTO por el que debería empezar: si es saga, el tomo #1), author, genre, pages aproximadas, moods, description breve y opcionalmente series_name si es saga.
6. Conserva el IDIOMA del título tal como sea el original (no traduzcas títulos en inglés).
7. "reasoning" en español, 2-3 frases cálidas explicando por qué este libro/saga sanará su momento.

Devuelve SOLO JSON válido, sin markdown, con esta forma exacta:
{"bookId": string|null, "external": {"title": string, "author": string, "genre": string, "pages": number, "moods": string[], "description": string, "series_name": string|null}|null, "reasoning": string}
Devuelve bookId o external, no ambos.`,
      });

      const out = parseJsonObject(text);
      let external = out.external;
      if (external?.title) {
        const cover = await fetchOriginalCover(external.title, external.author);
        external = { ...external, cover_url: cover };
      }
      return {
        bookId: out.bookId || null,
        external,
        reasoning: out.reasoning,
      };
    } catch (e: any) {
      const msg = e?.message || String(e);
      let errorType: RecommendationResult["errorType"] = "GENERIC";
      if (/429|quota|exhausted/i.test(msg)) errorType = "QUOTA_EXHAUSTED";
      else if (/403|denied|permission/i.test(msg)) errorType = "PERMISSION_DENIED";
      console.error("[recommendBook] failed:", msg);
      return {
        reasoning:
          errorType === "QUOTA_EXHAUSTED"
            ? "Los créditos de IA se agotaron. Añade créditos en Workspace → Usage."
            : "La conexión con el archivo se ha interrumpido. Confía en tu instinto.",
        errorType,
        errorMessage: msg,
      };
    }
  });