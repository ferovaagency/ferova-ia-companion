import { useEffect, useRef, useState } from "react";
import { isbn13 } from "@/lib/reading";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/types";

interface Edition {
  title: string;
  authors?: { name: string }[];
  number_of_pages?: number;
  cover?: { medium?: string };
}
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
  const scanLocked = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!camera || !video.current) return;
    const element = video.current;
    let closed = false;
    let stop: (() => void) | undefined;
    (async () => {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (closed) return;
      const controls = await new BrowserMultiFormatReader().decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        element,
        (result) => {
          const found = result && isbn13(result.getText());
          if (found && !closed && !scanLocked.current) {
            scanLocked.current = true;
            setCode(found);
            setEdition(null);
            setMessage("Código leído. Consulta la edición para continuar.");
          }
        },
      );
      stop = () => controls.stop();
      if (closed) stop();
    })().catch(() => {
      if (!closed) {
        setCamera(false);
        setMessage("No se pudo abrir la cámara. Puedes escribir el ISBN.");
      }
    });
    return () => {
      closed = true;
      stop?.();
    };
  }, [camera]);

  async function lookup() {
    const isbn = isbn13(code);
    if (!isbn) {
      setMessage("Revisa los 10 o 13 caracteres del ISBN.");
      return;
    }
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
      const key = "ISBN:" + isbn;
      const response = await fetch(
        "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=" + key,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw Error();
      const result: Edition | undefined = (await response.json())[key];
      setEdition(result ?? { title: "" });
      setTarget(existingBook?.id ?? "");
      if (!result)
        setMessage("Edición sin ficha. Escribe el título o vincula un libro que ya tengas.");
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
        : await supabase
            .from("books")
            .insert({
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
    <details className="border border-border rounded-sm p-3 my-4">
      <summary className="cursor-pointer font-semibold">Escanear o escribir ISBN</summary>
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
        <div className="flex gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              scanLocked.current = false;
              setCamera(!camera);
            }}
          >
            {camera ? "Cerrar cámara" : "Abrir cámara"}
          </button>
          <button type="button" disabled={busy || !code} onClick={lookup}>
            Consultar edición
          </button>
        </div>
        {camera && (
          <button
            className="text-sm underline"
            type="button"
            onClick={() => {
              scanLocked.current = false;
              setCode("");
              setEdition(null);
            }}
          >
            Escanear otro código
          </button>
        )}
        {camera && <video ref={video} muted playsInline className="w-full" />}
        {edition && (
          <>
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
    </details>
  );
}
