import { useEffect, useRef, useState } from "react";
import { isbn13 } from "@/lib/reading";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/types";

import { useServerFn } from "@tanstack/react-start";
import { lookupIsbn } from "@/lib/isbn.functions";
import type { Edition } from "@/lib/isbn-catalog";
const field = "border border-border bg-background px-3 py-2 rounded-sm w-full";
export function IsbnEntry({
  books,
  saved,
  existingBook,
}: {
  books: Book[];
  existingBook?: Book;
  saved: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [edition, setEdition] = useState<Edition | null>(null);
  const [target, setTarget] = useState(existingBook?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const search = useServerFn(lookupIsbn);
  const video = useRef<HTMLVideoElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const scanLocked = useRef(false);
  const lastScan = useRef("");
  const onScan = useRef((isbn: string) => {});
  useEffect(() => {
    onScan.current = (isbn) => {
      if (scanLocked.current || lastScan.current === isbn) return;
      lastScan.current = isbn;
      scanLocked.current = true;
      void lookup(isbn);
    };
  });
  useEffect(() => {
    if (!camera || !video.current) return;
    const element = video.current;
    let active = true;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const canvas = document.createElement("canvas");
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error("La cámara no está disponible en este navegador. Usa una foto del código.");
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (!active) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      element.srcObject = stream;
      await element.play();
      const { captureBarcode } = await import("@/lib/barcode-frame");
      function tick() {
        if (!active) return;
        if (!scanLocked.current && element.readyState >= 2) {
          const found = captureBarcode(element, canvas);
          if (found) onScan.current(found);
        }
        timer = setTimeout(tick, 350);
      }
      tick();
    }
    start().catch((error: Error) => {
      if (!active) return;
      setCamera(false);
      setMessage(
        error.name === "NotAllowedError"
          ? "Permite el acceso a la cámara o selecciona una foto del código."
          : "No se pudo abrir la cámara. Puedes usar una foto o escribir el ISBN.",
      );
    });
    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      element.srcObject = null;
    };
  }, [camera]);
  async function readPhoto(file?: File) {
    if (!file) return;
    setCamera(false);
    scanLocked.current = true;
    setBusy(true);
    setMessage("");
    setEdition(null);
    setCode("");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const { captureBarcode } = await import("@/lib/barcode-frame");
      const isbn = captureBarcode(image, document.createElement("canvas"));
      if (!isbn) {
        setMessage("No se distinguen las barras. Prueba una foto más cerca o escribe el ISBN.");
        return;
      }
      await lookup(isbn);
    } catch {
      setMessage("No se pudo leer la imagen. Prueba con una foto JPG o PNG.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  async function lookup(raw: string) {
    const isbn = isbn13(raw);
    if (!isbn) {
      setMessage("Revisa los 10 o 13 caracteres del ISBN.");
      return;
    }
    setCode(isbn);
    setEdition(null);
    const existing = books.find((b) => b.isbn === isbn);
    if (existing) {
      scanLocked.current = false;
      setMessage("Ya tienes esta edición: " + existing.title);
      return;
    }
    setBusy(true);
    setMessage("");
    setCode(isbn);
    try {
      const { edition: result, unavailable } = await search({ data: isbn });
      setEdition(result ?? { title: "" });
      setTarget(existingBook?.id ?? "");
      if (!result)
        setMessage(
          unavailable
            ? "No se pudo completar la búsqueda en los catálogos. Puedes escribir el título."
            : "No encontramos esta edición. Puedes escribir el título o vincular un libro.",
        );
    } catch {
      setEdition({ title: "" });
      setTarget(existingBook?.id ?? "");
      setMessage("El catálogo no respondió. Puedes completar la ficha manualmente.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const isbn = isbn13(code);
    if (!isbn || !edition) return;
    setBusy(true);
    setMessage("");
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw Error("Inicia sesión otra vez.");
      const result = target
        ? await supabase
            .from("books")
            .update({ isbn })
            .eq("id", target)
            .is("isbn", null)
            .select("id")
            .single()
        : await supabase.from("books").insert({
            user_id: user.id,
            isbn,
            title: edition.title.trim(),
            author: edition.authors?.map((a) => a.name).join(", ") || "Autor desconocido",
            pages: edition.number_of_pages || 0,
            cover_url: edition.cover?.medium ?? null,
          });
      if (result.error)
        throw Error(
          result.error.code === "23505"
            ? "Esta edición ya está en tu biblioteca."
            : "No se pudo guardar la edición.",
        );
      await saved();
      scanLocked.current = false;
      setEdition(null);
      setCode("");
      setMessage("ISBN guardado. Puedes escanear otro libro.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="border border-border rounded-sm p-3 my-4" aria-label="Escáner de libros">
      <h3 className="font-semibold">Escanear código de barras</h3>
      <div className="space-y-2 mt-3">
        <label>
          ISBN
          <input
            className={field}
            value={code}
            disabled={busy}
            onChange={(e) => {
              scanLocked.current = true;
              setCode(e.target.value);
              setEdition(null);
              setMessage("");
            }}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              scanLocked.current = false;
              lastScan.current = "";
              setCamera(!camera);
            }}
          >
            {camera ? "Cerrar cámara" : "Abrir cámara"}
          </button>
          <input
            ref={photo}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void readPhoto(file);
            }}
          />
          <button type="button" disabled={busy} onClick={() => photo.current?.click()}>
            Usar foto
          </button>
          <button type="button" disabled={busy || !code} onClick={() => lookup(code)}>
            Consultar edición
          </button>
        </div>
        {camera && (
          <button
            className="text-sm underline"
            disabled={busy}
            type="button"
            onClick={() => {
              scanLocked.current = false;
              lastScan.current = "";
              setCode("");
              setEdition(null);
            }}
          >
            Escanear otro código
          </button>
        )}
        {camera && (
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video bg-black rounded-sm object-contain"
          />
        )}
        {edition && (
          <>
            {edition.title && (
              <p className="text-sm font-semibold">
                {edition.title}
                {edition.authors?.length
                  ? " · " + edition.authors.map((a) => a.name).join(", ")
                  : ""}
              </p>
            )}
            {!existingBook && (
              <label>
                Guardar en
                <select
                  className={field}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Una ficha nueva</option>
                  {books
                    .filter((b) => !b.isbn)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} · {b.author}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {!target && (
              <label>
                Título de esta edición
                <input
                  className={field}
                  value={edition.title}
                  onChange={(e) => setEdition({ ...edition, title: e.target.value })}
                />
              </label>
            )}
            <button
              type="button"
              className="underline"
              disabled={busy || (!target && !edition.title.trim())}
              onClick={save}
            >
              {target ? "Vincular ISBN y conservar historial" : "Añadir esta edición"}
            </button>
          </>
        )}
        <p role="status" className="text-sm">
          {busy ? "Un momento…" : message}
        </p>
      </div>
    </section>
  );
}
