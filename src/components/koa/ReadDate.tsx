import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localDay } from "@/lib/reading";
import { userError } from "@/lib/koa-data";
import type { Book } from "@/types";

export const readingZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Guarda la fecha en que se terminó el ciclo actual de un libro leído. */
export async function saveFinishedDate(book: Pick<Book, "id" | "reading_cycle">, day: string) {
  const { error } = await supabase.rpc("set_finished_date", {
    p_book: book.id, p_cycle: book.reading_cycle, p_day: day, p_zone: readingZone(),
  });
  if (error) throw error;
}

export function finishedDay(book: Pick<Book, "finished_reading_at">) {
  return book.finished_reading_at ? localDay(new Date(book.finished_reading_at)) : "";
}

/** Campo de fecha (hoy o antes) con el mismo aspecto en la biblioteca y en la ficha. */
export function DateField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <input
      id={id}
      type="date"
      required
      max={localDay()}
      min="1900-01-01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="koa-field"
    />
  );
}

export function ReadDate({ book, onSaved }: { book: Book; onSaved: () => Promise<void> }) {
  const saved = finishedDay(book);
  const [day, setDay] = useState(saved || localDay());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="koa-card mt-5" aria-labelledby="read-date-title">
      <h2 id="read-date-title">Cuándo lo terminé</h2>
      <form
        className="flex flex-wrap items-end gap-3 mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setMessage("");
          try { await saveFinishedDate(book, day); await onSaved(); setMessage("Fecha guardada."); }
          catch (err) { setMessage(userError(err)); }
          finally { setBusy(false); }
        }}
      >
        <label htmlFor="read-date" className="sr-only">Fecha en que lo terminé</label>
        <DateField id="read-date" value={day} onChange={setDay} />
        <button className="koa-secondary" disabled={busy || !day || day === saved}>Guardar fecha</button>
      </form>
      <p role="status" className="koa-muted text-sm mt-2">
        {message || (saved ? "" : "Todavía no tiene fecha. Elige el día en que lo terminaste.")}
      </p>
    </section>
  );
}
