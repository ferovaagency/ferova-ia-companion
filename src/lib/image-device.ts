export async function deviceImage(file: Blob): Promise<string> {
  if (file.size > 5 * 1024 * 1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Selecciona JPG, PNG o WebP de hasta 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error("La imagen es demasiado grande.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No se pudo preparar la imagen.");
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/png");
  } finally { bitmap.close(); }
}