import { useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importBingoImage, bingoOracle, saveBingoWish } from "@/lib/creative.functions";
import { deviceImage } from "@/lib/image-device";
import { IMAGE_LIMIT } from "@/lib/creative-input";
import type { BingoDraft } from "@/lib/bingo";
import { userError } from "@/lib/koa-data";
import { ErrorNotice } from "./UI";

export async function fileData(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagen inválida")));
    reader.onerror = () => reject(new Error("No pudimos leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function BingoImageImport({ review }: { review: (draft: BingoDraft) => void }) {
  const id = useId();
  const run = useServerFn(importBingoImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <label htmlFor={id} className="adv-drop">
        {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}
        <span className="font-semibold">{busy ? "Koa está leyendo la cuadrícula…" : "Elegir una imagen del bingo"}</span>
        <span className="koa-muted text-xs">JPG, PNG o WebP · máximo 5 MB</span>
        <input
          id={id}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              if (file.size > IMAGE_LIMIT) throw new Error("La imagen pesa más de 5 MB.");
              const result = await run({ data: { image: await deviceImage(file) } });
              review(result);
            } catch (cause) {
              setError(userError(cause));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <ErrorNotice>{error}</ErrorNotice>}
    </div>
  );
}

export function CellOracle({ board, index, assign }: { board: string; index: number; assign: (id: string) => void }) {
  const id = useId();
  const run = useServerFn(bingoOracle);
  const save = useServerFn(saveBingoWish);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof bingoOracle>>>([]);
  const [request, setRequest] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <section className="adv-pebble space-y-3" aria-labelledby={`${id}-title`}>
      <p id={`${id}-title`} className="koa-eyebrow mb-0 inline-flex items-center gap-2"><Sparkles size={13} /> Tres ideas del Oráculo</p>
      <div>
        <label htmlFor={`${id}-ctx`} className="koa-label">¿Qué te apetece para esta casilla? (opcional)</label>
        <input id={`${id}-ctx`} className="koa-field" maxLength={1500} value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Ej. algo breve y luminoso" />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setNotice("");
          setOptions([]);
          try {
            setOptions(await run({ data: { board, index, request } }));
          } catch (cause) {
            setError(userError(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {busy ? "Buscando opciones verificadas…" : options.length ? "Pedir otras tres" : "Pedir tres opciones"}
      </Button>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {options.length > 0 && (
        <ul className="space-y-2">
          {options.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <div className="min-w-0">
                <p className="font-semibold break-words">{o.title}</p>
                <p className="koa-muted text-xs">{o.author}{o.bookId ? " · ya está en tu biblioteca" : ""}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={o.bookId ? "default" : "secondary"}
                disabled={busy}
                onClick={async () => {
                  if (o.bookId) {
                    assign(o.bookId);
                    setNotice(`«${o.title}» elegido. Guárdalo con los botones de abajo.`);
                    return;
                  }
                  setBusy(true);
                  setError("");
                  try {
                    await save({ data: { catalogId: o.id, title: o.title, author: o.author } });
                    setNotice(`«${o.title}» guardado en tus deseos. Cuando lo tengas y lo termines, podrás usarlo aquí.`);
                  } catch (cause) {
                    setError(userError(cause));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {o.bookId ? "Usar este libro" : "Guardar en deseos"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </section>
  );
}
