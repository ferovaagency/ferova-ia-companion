import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EnrichedBook, RecommendationResult } from "@/types";

/* ---------- cover fetching helpers (no AI key needed) ---------- */
type CatalogMetadata = Partial<EnrichedBook>;

function parseJsonObject(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La IA no devolvió JSON válido");
  return JSON.parse(match[0]);
}

async function fetchCatalogMetadata(title: string, author?: string): Promise<CatalogMetadata> {
  const googleQuery = [`intitle:${title}`, author ? `inauthor:${author}` : ""].filter(Boolean).join(" ");
  try {
    const params = new URLSearchParams({ q: googleQuery, maxResults: "3", printType: "books" });
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    if (r.ok) {
      const d: any = await r.json();
      const item = d.items?.find((entry: any) => entry.volumeInfo?.title) ?? d.items?.[0];
      const info = item?.volumeInfo;
      if (info) {
        return {
          title: info.title || title,
          author: info.authors?.[0] || author || "Autor desconocido",
          genre: info.categories?.[0]?.split(" /")?.[0] || "Literatura",
          pages: Number(info.pageCount) || 0,
          description: info.description ? String(info.description).replace(/<[^>]+>/g, "").slice(0, 700) : "",
          cover_url: (info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null)?.replace(/^http:/, "https:"),
        };
      }
    }
  } catch {}

  try {
    const params = new URLSearchParams({ title, limit: "1" });
    if (author) params.set("author", author);
    const r = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (r.ok) {
      const d: any = await r.json();
      const doc = d.docs?.[0];
      if (doc) {
        return {
          title: doc.title || title,
          author: doc.author_name?.[0] || author || "Autor desconocido",
          genre: doc.subject?.[0] || "Literatura",
          pages: Number(doc.number_of_pages_median) || 0,
          cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
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
        const { generateText, Output } = await import("ai");
        const gateway = createLovableAiGatewayProvider(key);
        const { output } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          output: Output.object({
            schema: z.object({
              title: z.string(),
              author: z.string(),
              genre: z.string(),
              pages: z.number().int().nonnegative(),
              moods: z.array(z.string()).max(6),
              series_name: z.string().nullable().optional(),
              series_index: z.number().int().nullable().optional(),
              description: z.string(),
            }),
          }),
          prompt: `Eres un catalogador bibliotecario experto. Devuelve metadatos precisos en ESPAÑOL para el libro "${enriched.title}"${enriched.author && enriched.author !== "Autor desconocido" ? ` de ${enriched.author}` : ""}.
- title: título oficial (en español si existe traducción común, si no original)
- author: nombre del autor
- genre: un solo género corto (ej. "Fantasía", "Novela negra", "Ensayo")
- pages: páginas aproximadas de una edición típica
- moods: 2-5 adjetivos en minúscula sobre la atmósfera ("oscuro", "esperanzador", "ágil"...)
- series_name / series_index: si es parte de una saga, su nombre y número; si no, null
- description: 1-2 frases breves sin spoilers.
Si ya conoces el dato por fuentes literarias, corrige título y autor; no inventes si no estás seguro.`,
        });
        enriched = { ...enriched, ...(output as any) };
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
4. Si NADA de su lista encaja, sugiere un libro EXTERNO en "external".
5. Para sugerencias externas incluye title, author, genre, pages aproximadas, moods y description breve.
6. "reasoning" en español, 2-3 frases cálidas explicando por qué este libro sanará su momento.

Devuelve SOLO JSON válido, sin markdown, con esta forma exacta:
{"bookId": string|null, "external": {"title": string, "author": string, "genre": string, "pages": number, "moods": string[], "description": string}|null, "reasoning": string}
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