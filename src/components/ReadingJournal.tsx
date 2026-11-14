import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Book } from "@/types";
import { localDay, readingStreak } from "@/lib/reading";

export type Session = Tables<"reading_sessions">;
export type Completion = Tables<"completed_readings">;
type Draft = { day: string; minutes: number | null; note: string };
const field = "block w-full border border-border bg-background p-2 rounded-sm";
export function SessionForm({
  book,
  entry,
  onSaved,
  onClose,
}: {
  book: Book;
  entry?: Session;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    day: entry?.day ?? localDay(),
    minutes: entry?.minutes ?? null,
    note: entry?.note ?? "",
  });
  const [page, setPage] = useState("");
  const [percent, setPercent] = useState(false);
  const finalPage = percent ? Math.round((book.pages * Number(page)) / 100) : Number(page);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function save(remove = false) {
    if (remove && !confirm("¿Eliminar esta sesión y descontar sus páginas?")) return;
    setBusy(true);
    setError("");
    try {
      const common = {
        p_day: draft.day,
        p_zone: zone,
        p_minutes: draft.minutes as number,
        p_note: draft.note,
      };
      const { error } = entry
        ? await supabase.rpc("revise_session", { ...common, p_id: entry.id, p_remove: remove })
        : await supabase.rpc("record_reading", {
            ...common,
            p_book: book.id,
            p_from: book.current_page,
            p_cycle: book.reading_cycle,
            p_to: finalPage,
          });
      if (error) throw Error(error.message);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="font-serif font-bold text-xl">
        {entry ? "Editar sesión" : "Actualizar progreso"}
      </h2>
      <p>{book.title}</p>
      {!entry && (
        <>
          <p>Vas por la página {book.current_page}.</p>
          {book.pages > 0 && (
            <label>
              Registrar por
              <select
                className={field}
                value={percent ? "percent" : "page"}
                onChange={(e) => {
                  setPercent(e.target.value === "percent");
                  setPage("");
                }}
              >
                <option value="page">Página</option>
                <option value="percent">Porcentaje</option>
              </select>
            </label>
          )}
          <label className="block">
            {percent ? "Porcentaje alcanzado" : "Página alcanzada"}
            <input
              autoFocus
              required
              className={field}
              type="number"
              min={percent ? 0 : book.current_page + 1}
              max={percent ? 100 : book.pages || undefined}
              step={percent ? "0.1" : "1"}
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </label>
          {percent && page && (
            <p>
              Equivale a la página {finalPage} de {book.pages}.
            </p>
          )}
        </>
      )}
      <label className="block">
        Fecha de lectura
        <input
          className={field}
          type="date"
          required
          max={localDay()}
          value={draft.day}
          onChange={(e) => setDraft({ ...draft, day: e.target.value })}
        />
      </label>
      <label className="block">
        Minutos de lectura (opcional)
        <input
          type="number"
          className={field}
          min="1"
          max="1440"
          value={draft.minutes ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, minutes: e.target.value ? Number(e.target.value) : null })
          }
        />
      </label>
      <label className="block">
        Nota privada (opcional)
        <textarea
          className={field}
          maxLength={2000}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </label>
      <div className="flex gap-4">
        <button
          className="bg-foreground text-background px-4 py-2 rounded-sm"
          disabled={busy || (!entry && finalPage <= book.current_page)}
        >
          Guardar
        </button>
        {entry && (
          <button type="button" disabled={busy} onClick={() => save(true)}>
            Eliminar sesión
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function ReadingJournal({
  sessions,
  completed,
  books,
  edit,
}: {
  sessions: Session[];
  completed: Completion[];
  books: Book[];
  edit: (s: Session) => void;
}) {
  const [today, setToday] = useState(localDay);
  useEffect(() => {
    const id = setInterval(() => setToday(localDay()), 30000);
    return () => clearInterval(id);
  }, []);
  const days = [
    ...sessions.map((s) => s.day),
    ...completed.flatMap((r) => (r.streak_day ? [r.streak_day] : [])),
  ];
  const streak = readingStreak(days, today);
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today + "T12:00:00");
    date.setDate(date.getDate() - 6 + index);
    return {
      day: localDay(date),
      label: date.toLocaleDateString("es", { weekday: "short", day: "numeric" }),
    };
  });
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const [selectedDay, setSelectedDay] = useState("");
  const visibleCompletions = selectedDay
    ? completed.filter(
        (r) =>
          (r.streak_day ?? (r.finished_at && localDay(new Date(r.finished_at)))) === selectedDay,
      )
    : completed;
  const visible = selectedDay ? sessions.filter((s) => s.day === selectedDay) : sessions;
  const titles = new Map(books.map((b) => [b.id, b.title]));
  return (
    <section className="border border-border p-4 rounded-sm bg-card">
      <h2 className="font-serif font-bold text-xl">
        Racha de lectura · {streak} {streak === 1 ? "día" : "días"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {days.includes(today)
          ? "Hoy ya registraste una lectura."
          : "Registra un avance o termina un libro que estés leyendo para marcar hoy."}{" "}
        Cada fecha cuenta una vez.
      </p>
      <div className="grid grid-cols-7 gap-1 max-w-md mt-3">
        {recentDays.map(({ day, label }) => (
          <button
            key={day}
            className={
              days.includes(day)
                ? "bg-foreground text-background rounded-sm p-1 text-xs"
                : "bg-muted rounded-sm p-1 text-xs"
            }
            aria-label={day + (days.includes(day) ? ", con avance" : ", sin avance")}
            onClick={() => {
              setSelectedDay(day);
              setOpen(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="mt-3">
        <summary className="cursor-pointer">Historial de lectura</summary>
        <label className="block mt-3 text-sm">
          Consultar por fecha{" "}
          <input
            type="date"
            value={selectedDay}
            max={today}
            onChange={(e) => setSelectedDay(e.target.value)}
          />
        </label>
        {selectedDay && (
          <button className="text-sm underline" onClick={() => setSelectedDay("")}>
            Ver todas las fechas
          </button>
        )}
        {selectedDay && visible.length === 0 && visibleCompletions.length === 0 && (
          <p>Sin sesiones ese día.</p>
        )}
        {sessions.length === 0 && completed.length === 0 && (
          <p className="text-sm my-3">Aquí aparecerá tu primera sesión cuando guardes un avance.</p>
        )}
        {visible.slice(0, limit).map((s) => (
          <div key={s.id} className="border-b py-2 space-y-1 text-sm">
            <p>
              {s.day} · <strong>{titles.get(s.book_id)}</strong> · lectura {s.cycle}
            </p>
            <p>
              Páginas {s.from_page + 1}–{s.to_page}
              {s.minutes && " · " + s.minutes + " min"}
            </p>
            {s.note && <p className="break-words">{s.note}</p>}
            <button className="underline" onClick={() => edit(s)}>
              Editar sesión
            </button>
          </div>
        ))}
        {limit < visible.length && (
          <button className="underline" onClick={() => setLimit(limit + 20)}>
            Ver más sesiones
          </button>
        )}
        {visibleCompletions.length > 0 && (
          <>
            <h3 className="font-semibold mt-4">Lecturas terminadas</h3>
            {visibleCompletions.map((r) => (
              <div key={r.book_id + r.cycle} className="text-sm">
                {titles.get(r.book_id)} · lectura {r.cycle} ·{" "}
                {r.finished_at
                  ? new Date(r.finished_at).toLocaleDateString("es")
                  : "Fecha desconocida"}
              </div>
            ))}
          </>
        )}
      </details>
    </section>
  );
}
