import { decode as decodePng, encode as encodePng } from "fast-png";
import jpeg from "jpeg-js";
import { validateImage, IMAGE_LIMIT } from "./creative-input";
export function decodeImage(input: string) {
  const { bytes, mime } = validateImage(input);
  if (mime === "image/webp") throw new Error("Prepara la imagen como PNG o JPG antes de enviarla.");
  let width: number; let height: number; let data: Uint8Array; let channels: number;
  if (mime === "image/png") {
    if (bytes.length < 33) throw new Error("PNG incompleto.");
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    width = header.getUint32(16); height = header.getUint32(20);
    if (width < 1 || height < 1 || width > 2400 || height > 2400 || width * height > 4_000_000) throw new Error("La imagen supera el límite de 4 megapíxeles.");
    const decoded = decodePng(bytes, { checkCrc: true });
    if (decoded.depth !== 8 || decoded.palette) throw new Error("Prepara un PNG de color de 8 bits.");
    data = new Uint8Array(decoded.data); channels = decoded.channels;
  } else {
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, tolerantDecoding: false, maxResolutionInMP: 4, maxMemoryUsageInMB: 48 });
    width = decoded.width; height = decoded.height; data = decoded.data; channels = 4;
  }
  if (width < 1 || height < 1 || width > 2400 || height > 2400 || width * height > 4_000_000 || data.length !== width * height * channels) throw new Error("Dimensiones de imagen inválidas.");
  const clean = encodePng({ width, height, data, channels, depth: 8 });
  if (clean.length > IMAGE_LIMIT) throw new Error("Reduce la imagen a menos de 5 MB.");
  let binary = ""; for (let i = 0; i < clean.length; i += 8192) binary += String.fromCharCode(...clean.slice(i, i + 8192));
  return { bytes: clean, mime: "image/png", image: `data:image/png;base64,${btoa(binary)}`, width, height };
}