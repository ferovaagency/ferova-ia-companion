import { z } from "zod";
import type { Book } from "@/types";

export const bingoCellSchema = z.object({
  kind: z.enum(["book", "experience"]),
  label: z.string().trim().min(1).max(200),
  condition: z.enum(["any", "genre", "author", "max_pages"]),
  value: z.string().max(160),
}).superRefine((cell, ctx) => {
  if (cell.kind !== "book") return;
  if ((cell.condition === "genre" || cell.condition === "author") && !cell.value.trim()) {
    ctx.addIssue({ code: "custom", message: "Completa el valor de la condición." });
  }
  if (cell.condition === "max_pages" && (!/^\d{1,5}$/.test(cell.value) || Number(cell.value) < 1)) {
    ctx.addIssue({ code: "custom", message: "Indica un límite de páginas mayor que cero." });
  }
});
export const bingoDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  purpose: z.string().max(1200),
  source_credit: z.string().max(1200).default(""),
  size: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  cells: z.array(bingoCellSchema),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  allow_reuse: z.boolean(),
}).superRefine((draft, ctx) => {
  if (draft.cells.length !== draft.size * draft.size) ctx.addIssue({ code: "custom", message: "Completa todas las casillas." });
  if (draft.starts_on && draft.ends_on && draft.ends_on < draft.starts_on) ctx.addIssue({ code: "custom", message: "La fecha final debe ser posterior al inicio." });
});
export type BingoCell = z.infer<typeof bingoCellSchema>;
export type BingoDraft = z.infer<typeof bingoDraftSchema>;
export function blankCell(): BingoCell { return { kind: "book", label: "Una lectura a mi elección", condition: "any", value: "" }; }
export function newDraft(): BingoDraft {
  return { title: "Mi aventura lectora", purpose: "", source_credit: "", size: 3, cells: Array.from({ length: 9 }, blankCell), starts_on: null, ends_on: null, allow_reuse: false };
}
export function matchesCell(book: Pick<Book, "genre" | "author" | "pages">, cell: BingoCell) {
  if (cell.kind !== "book") return false;
  const equal = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
  if (cell.condition === "genre") return equal(book.genre, cell.value);
  if (cell.condition === "author") return equal(book.author, cell.value);
  if (cell.condition === "max_pages") return book.pages > 0 && book.pages <= Number(cell.value);
  return true;
}
/** Filas, columnas y diagonales cuyas casillas están todas completas. */
export function completedLines(size: number, done: ReadonlySet<number>): number[][] {
  const range = Array.from({ length: size }, (_, i) => i);
  const lines = [
    ...range.map((r) => range.map((c) => r * size + c)),
    ...range.map((c) => range.map((r) => r * size + c)),
    range.map((i) => i * size + i),
    range.map((i) => i * size + (size - 1 - i)),
  ];
  return lines.filter((line) => line.every((i) => done.has(i)));
}
/** Texto breve de lo que pide una casilla, para el tablero y el diálogo. */
export function describeCell(cell: BingoCell): string {
  if (cell.kind === "experience") return "Experiencia · la marcas tú";
  if (cell.condition === "genre") return `Lectura · género ${cell.value}`;
  if (cell.condition === "author") return `Lectura · de ${cell.value}`;
  if (cell.condition === "max_pages") return `Lectura · hasta ${cell.value} páginas`;
  return "Lectura · a tu elección";
}
const experience = (label: string): BingoCell => ({ kind: "experience", label, condition: "any", value: "" });
const book = (label: string): BingoCell => ({ ...blankCell(), label });
const shortBook = (): BingoCell => ({ kind: "book", label: "Una historia de hasta 250 páginas", condition: "max_pages", value: "250" });
export const bingoTemplates: BingoDraft[] = [
  { title: "Volver a leer", purpose: "Retomar las historias a mi ritmo, sin una meta diaria obligatoria.", cells: [shortBook(), book("Un pendiente que me ilusiona"), experience("Preparar un rincón para leer"), book("Releer una historia querida"), experience("Elegir un momento sin notificaciones"), book("Un autor que quiero conocer"), experience("Compartir una recomendación"), book("Una lectura a mi elección"), experience("Visitar una biblioteca o librería")] },
  { title: "Un momento para mí", purpose: "Reservar pequeños momentos para mis lecturas.", cells: [book("Una lectura que elegí para mí"), experience("Preparar mi bebida favorita"), shortBook(), experience("Leer junto a una ventana"), book("Una historia de mi estantería"), experience("Elegir música o silencio"), book("Un libro recomendado por alguien"), experience("Guardar una frase con su fuente"), book("Una lectura a mi elección")] },
  { title: "Encontrar calma", purpose: "Buscar lecturas y pequeñas pausas que me resulten agradables, sin promesas terapéuticas.", cells: [shortBook(), experience("Hacer una pausa para mirar el cielo"), book("Una historia que me apetece"), experience("Ordenar un pequeño rincón"), book("Un libro de mi biblioteca"), experience("Leer unos minutos al aire libre"), book("Una relectura a mi elección"), experience("Anotar qué disfruté hoy"), book("Una lectura a mi elección")] },
  { title: "Explorar mundos", purpose: "Descubrir otras voces, lugares e historias.", cells: [book("Una historia ambientada en otro lugar"), experience("Buscar el lugar de una historia en un mapa"), book("Un autor nuevo para mí"), experience("Visitar una biblioteca"), book("Una historia de otro tiempo"), experience("Conversar sobre una lectura"), shortBook(), experience("Guardar una pregunta sobre el libro"), book("Una lectura a mi elección")] },
  { title: "Salir de lo habitual", purpose: "Probar lecturas distintas con curiosidad y libertad de elección.", cells: [book("Un género que leo poco"), experience("Pedir una recomendación a alguien"), shortBook(), experience("Explorar una sección diferente de la biblioteca"), book("Un autor nuevo para mí"), experience("Cambiar mi lugar de lectura"), book("Un pendiente que había olvidado"), experience("Anotar qué me sorprendió"), book("Una lectura a mi elección")] },
].map((template) => ({ ...newDraft(), ...template }));