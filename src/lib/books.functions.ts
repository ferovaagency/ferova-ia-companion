import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EnrichedBook, RecommendationResult } from "@/types";

/* ---------- cover fetching helpers (no AI key needed) ---------- */
async function fetchOriginalCover(title: string, author?: string): Promise<string | null> {
  try {
    const q = [`intitle:${title}`, author ? `inauthor:${author}` : ""].filter(Boolean).join("+");
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`);
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
    let enriched: Partial<EnrichedBook> = {
      title: data.title,
      author: data.author || "Autor desconocido",
      genre: "General",
      pages: 0,
      moods: [],
      description: "",
    };

    if (key) {
      try {
        const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
        const { generateText, Output } = await import("ai");
        const gateway = createLovableAiGatewayProvider(key);
        const { experimental_output } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          experimental_output: Output.object({
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
          prompt: `Eres un catalogador bibliotecario experto. Devuelve metadatos precisos en ESPAÑOL para el libro "${data.title}"${data.author ? ` de ${data.author}` : ""}.
- title: título oficial (en español si existe traducción común, si no original)
- author: nombre del autor
- genre: un solo género corto (ej. "Fantasía", "Novela negra", "Ensayo")
- pages: páginas aproximadas de una edición típica
- moods: 2-5 adjetivos en minúscula sobre la atmósfera ("oscuro", "esperanzador", "ágil"...)
- series_name / series_index: si es parte de una saga, su nombre y número; si no, null
- description: 1-2 frases breves sin spoilers.`,
        });
        enriched = { ...enriched, ...(experimental_output as any) };
      } catch (e) {
        console.error("[enrichBook] AI failed:", e);
      }
    }

    const cover = await fetchOriginalCover(enriched.title!, enriched.author);
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
        reasoning: "El oráculo de Lumina no está disponible (falta configuración de IA).",
        errorType: "GENERIC",
      };
    }

    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { generateText, Output } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);

      const available = data.books.filter((b) => b.status !== "READ");
      const read = data.books.filter((b) => b.status === "READ").map((b) => `${b.title} (${b.series_name ?? ""} #${b.series_index ?? ""})`);

      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({
          schema: z.object({
            bookId: z.string().nullable(),
            external: z
              .object({
                title: z.string(),
                author: z.string(),
                genre: z.string().optional(),
                description: z.string().optional(),
              })
              .nullable(),
            reasoning: z.string(),
          }),
        }),
        prompt: `Eres Lumina, una bibliotecaria con intuición literaria excepcional.

EL USUARIO DICE: "${data.userRequest}"

SU ESTANTERÍA PENDIENTE (TBR/READING):
${JSON.stringify(available, null, 2)}

LIBROS YA LEÍDOS: ${read.join(", ") || "ninguno"}

REGLAS:
1. Si un libro de su lista encaja con su vibe actual, devuelve su bookId (UUID exacto del campo "id").
2. REGLA DE SAGAS: si el libro está en una saga (series_name), solo recomiéndalo si el anterior (series_index - 1) ya fue leído. Si no, busca el siguiente libro de la saga que sí le corresponda.
3. Si menciona BLOQUEO LECTOR, prioriza algo ágil, corto, inmersivo.
4. Si NADA de su lista encaja, sugiere un libro EXTERNO en "external".
5. "reasoning" en español, 2-3 frases cálidas explicando por qué este libro sanará su momento.

Devuelve bookId o external, no ambos.`,
      });

      const out = experimental_output as any;
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