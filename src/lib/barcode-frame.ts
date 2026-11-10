import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { isbn13 } from "./reading";

const reader = new MultiFormatReader();
reader.setHints(
  new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
    [DecodeHintType.TRY_HARDER, true],
  ]),
);

function read(gray: Uint8ClampedArray, width: number, height: number) {
  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(gray, width, height)),
    );
    return isbn13(reader.decodeWithState(bitmap).getText());
  } catch {
    return null;
  }
}

// Restore contrast around narrow bars that mobile cameras often soften.
function sharpen(gray: Uint8ClampedArray, width: number, height: number) {
  const stride = width + 1;
  const sums = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += gray[y * width + x];
      sums[(y + 1) * stride + x + 1] = sum + sums[y * stride + x + 1];
    }
  }
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - 3),
      bottom = Math.min(height, y + 4);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - 3),
        right = Math.min(width, x + 4);
      const sum =
        sums[bottom * stride + right] -
        sums[top * stride + right] -
        sums[bottom * stride + left] +
        sums[top * stride + left];
      const i = y * width + x;
      out[i] = gray[i] + 3.5 * (gray[i] - sum / ((bottom - top) * (right - left)));
    }
  }
  return out;
}

export function decodeFrame(frame: ImageData) {
  const { width, height, data } = frame;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++)
    gray[i] = (data[i * 4] + 2 * data[i * 4 + 1] + data[i * 4 + 2]) / 4;
  return read(gray, width, height) ?? read(sharpen(gray, width, height), width, height);
}
export function captureBarcode(
  source: HTMLVideoElement | HTMLImageElement,
  canvas: HTMLCanvasElement,
) {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!width || !height) return null;
  const scale = Math.min(1, 1920 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const direct = decodeFrame(context.getImageData(0, 0, canvas.width, canvas.height));
  if (direct || source instanceof HTMLVideoElement) return direct;
  // Photos can be composed with the bars running horizontally.
  const w = canvas.width,
    h = canvas.height;
  canvas.width = h;
  canvas.height = w;
  context.translate(h, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(source, 0, 0, w, h);
  return decodeFrame(context.getImageData(0, 0, h, w));
}
