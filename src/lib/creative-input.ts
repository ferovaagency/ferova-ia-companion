import { z } from "zod";

export const IMAGE_LIMIT = 5 * 1024 * 1024;
export function validateImage(data: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw new Error("Selecciona JPG, PNG o WebP.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); } catch { throw new Error("Imagen inválida."); }
  if (!bytes.length || bytes.length > IMAGE_LIMIT) throw new Error("La imagen debe pesar como máximo 5 MB.");
  const signature = match[1] === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : match[1] === "image/png" ? [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)
    : String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!signature) throw new Error("El contenido no corresponde al tipo de imagen.");
  return { bytes, mime: match[1] };
}
export const ocrGridSchema = z.object({ title: z.string().max(160), purpose: z.string().max(1200), size: z.union([z.literal(3),z.literal(4),z.literal(5)]), labels: z.array(z.string().max(200)).min(9).max(25), source_credit: z.string().max(1200) }).refine(d => d.labels.length === d.size*d.size, "La imagen no contiene una cuadrícula 3, 4 o 5 verificable.");