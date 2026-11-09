import { useState } from "react";
import type { Book } from "@/types";
export function ReaderWelcome({
  books,
  add,
  importCsv,
  start,
  progress,
  oracle,
  finish,
}: {
  books: Book[];
  add: () => void;
  importCsv: () => void;
  start: (b: Book) => void;
  progress: (b: Book) => void;
  oracle: () => void;
  finish: () => Promise<void>;
}) {
  const [chosen, setChosen] = useState("");
  const options = books.filter((b) => ["TBR", "READING", "PAUSED"].includes(b.status));
  const book =
    options.find((b) => b.id === chosen) ??
    options.find((b) => b.status === "READING") ??
    options[0];
  const button = "bg-foreground text-background px-4 py-2 rounded-sm text-sm";
  return (
    <section
      aria-label="Primeros pasos"
      className="rounded-sm border border-border bg-card p-5 space-y-3"
    >
      <div className="flex justify-between gap-3">
        <h2 className="font-serif text-xl font-bold">
          {books.length ? "Tu próxima lectura" : "Empieza tu biblioteca"}
        </h2>
        <button className="text-xs underline" onClick={finish}>
          Cerrar guía
        </button>
      </div>
      {!books.length ? (
        <>
          <p>
            Empieza con el libro que estás leyendo. Puedes buscarlo por título, escanear su ISBN o
            traer tu estantería desde Goodreads.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={button} onClick={add}>
              Añadir mi primer libro
            </button>
            <button className="underline" onClick={importCsv}>
              Traer mi biblioteca de Goodreads
            </button>
          </div>
        </>
      ) : (
        <>
          {book && (
            <>
              <label className="block">
                Elige un libro de tu estantería
                <select
                  className="block w-full border bg-background p-2"
                  value={book.id}
                  onChange={(e) => setChosen(e.target.value)}
                >
                  {options.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              {book.status === "READING" ? (
                <>
                  <p>
                    Cuando termines de leer hoy, guarda hasta dónde llegaste. También puedes marcar
                    el libro como leído para sumar el día a tu racha.
                  </p>
                  <button className={button} onClick={() => progress(book)}>
                    Registrar mi avance
                  </button>
                </>
              ) : (
                <button className={button} onClick={() => start(book)}>
                  {book.status === "PAUSED" ? "Retomar este libro" : "Empezar este libro"}
                </button>
              )}
            </>
          )}
          <p>¿Todavía estás eligiendo? Cuéntale al Oráculo qué te apetece leer.</p>
          <button className="underline" onClick={oracle}>
            Explorar tres recomendaciones
          </button>
        </>
      )}
    </section>
  );
}
