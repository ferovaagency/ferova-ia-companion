import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useReader, currentUser } from "@/hooks/use-reader";
import type { Book } from "@/types";
import { koaDb, userError } from "@/lib/koa-data";
import { localDay } from "@/lib/reading";
import { elapsedMs, pauseTimer, parseTimer, type TimerDraft } from "@/lib/reader-timer";
import {
  PageTitle,
  Koa,
  KoaMessage,
  Loading,
  ErrorNotice,
  Empty,
  Modal,
} from "@/components/koa/UI";
import { BookCover } from "@/components/BookCover";
import { Soundscape } from "@/components/koa/Soundscape";
import { Chat } from "@/components/koa/Chat";
export const Route = createFileRoute("/_authenticated/read")({
  validateSearch: (s: Record<string, unknown>): { book?: string } => ({
    book: typeof s.book === "string" ? s.book : undefined,
  }),
  head: () => ({
    meta: [{ title: "Tu sesión de lectura — Lee con Koa" }, { name: "description", content: "Acompaña tu sesión y registra progreso real." }, { property: "og:title", content: "Leer — Lee con Koa" }, { property: "og:description", content: "Una sesión para tus páginas, a tu ritmo." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }],
  }),
  component: ReadPage,
});
function ReadPage() {
  const { data: books = [], isLoading, error, refetch } = useReader();
  const { book: id } = Route.useSearch();
  const [selected, setSelected] = useState(id ?? "");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    void currentUser().then((u) => setUserId(u.id));
  }, []);
  const reading = books.filter((b) => b.status === "READING");
  const book = reading.find((b) => b.id === selected) ?? reading[0];
  if (isLoading || !userId) return <Loading />;
  if (error) return <ErrorNotice>{userError(error)}</ErrorNotice>;
  return (
    <>
      <PageTitle eyebrow="Un momento para tus páginas" title="Tu sesión consciente">
        Lee tu libro físico o digital. Koa te acompaña a registrar el camino.
      </PageTitle>
      {!book ? (
        <Empty title="Elige una historia para empezar">
          <Link to="/discover" className="koa-button mt-4">
            Encontrar mi próxima lectura
          </Link>
          <Link to="/library" className="koa-secondary ml-2 mt-4">
            Ir a mi biblioteca
          </Link>
        </Empty>
      ) : (
        <>
          <label className="koa-label max-w-md mb-6">
            Lectura en curso
            <select
              className="koa-field mt-2"
              value={book.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {reading.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <ReadingSession
            key={`${book.id}-${book.reading_cycle}`}
            book={book}
            userId={userId}
            refresh={async () => {
              await refetch();
            }}
          />
        </>
      )}
    </>
  );
}
function ReadingSession({
  book,
  userId,
  refresh,
}: {
  book: Book;
  userId: string;
  refresh: () => Promise<void>;
}) {
  const key = `koa-timer:${userId}:${book.id}:${book.reading_cycle}`;
  const fresh = (): TimerDraft => ({
    id: crypto.randomUUID(),
    bookId: book.id,
    cycle: book.reading_cycle,
    from: book.current_page,
    elapsed: 0,
    runningSince: null,
    page: String(book.current_page),
    note: "",
  });
  const [draft, setDraft] = useState<TimerDraft>(() => {
    try {
      return parseTimer(localStorage.getItem(key), book.id, book.reading_cycle) ?? fresh();
    } catch {
      return fresh();
    }
  });
  const [now, setNow] = useState(Date.now());
  const [summary, setSummary] = useState(false);
  const [finish, setFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [breathing, setBreathing] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      setError("No se pudo guardar el borrador en este dispositivo. Mantén esta pestaña abierta.");
    }
  }, [draft, key]);
  const elapsed = elapsedMs(draft, now);
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor(elapsed / 1000) % 60;
  const stale = book.current_page !== draft.from;
  const newPage = Number(draft.page);
  const valid =
    finish ||
    (Number.isInteger(newPage) &&
      newPage > book.current_page &&
      (book.pages <= 0 || newPage <= book.pages));
  async function save() {
    setBusy(true);
    setError("");
    try {
      const { error } = await koaDb.rpc("close_reader_session", {
        p_id: draft.id,
        p_book: book.id,
        p_cycle: book.reading_cycle,
        p_from: draft.from,
        p_to: finish ? book.pages || Math.max(book.current_page, newPage) : newPage,
        p_minutes: Math.max(1, Math.ceil(elapsedMs(draft) / 60000)),
        p_day: localDay(),
        p_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        p_note: draft.note,
        p_finish: finish,
      });
      if (error) throw error;
      localStorage.removeItem(key);
      setSummary(false);
      setSuccess(true);
      await refresh();
      setDraft({ ...fresh(), from: newPage, page: String(newPage) });
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="grid lg:grid-cols-[.85fr_1.15fr] gap-6">
        <section className="koa-card text-center">
          <div className="flex items-center gap-4 text-left">
            <BookCover book={book} className="w-16 h-24 shrink-0" />
            <div>
              <p className="koa-eyebrow">Lectura en curso</p>
              <h2>{book.title}</h2>
              <p className="koa-muted">
                {book.author} · Pág. {book.current_page}
                {book.pages > 0 && ` de ${book.pages}`}
              </p>
            </div>
          </div>
          <div className="koa-timer" aria-label={`${mins} minutos y ${secs} segundos`}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <p className="koa-muted mb-5">
            {draft.runningSince !== null
              ? "Tu tiempo entre páginas"
              : "A tu ritmo. Cuando quieras."}
          </p>
          <div className="flex justify-center flex-wrap gap-2">
            <button
              className="koa-button"
              onClick={() => {
                setSuccess(false);
                setDraft((d) =>
                  d.runningSince === null ? { ...d, runningSince: Date.now() } : pauseTimer(d),
                );
              }}
            >
              {draft.runningSince === null ? (elapsed ? "Continuar" : "Empezar sesión") : "Pausar"}
            </button>
            <button
              className="koa-secondary"
              onClick={() => {
                setDraft(pauseTimer(draft));
                setSummary(true);
              }}
            >
              Terminar y guardar
            </button>
          </div>
          <button
            className="text-xs underline mt-4 koa-muted"
            onClick={() => {
              if (confirm("¿Descartar este temporizador? Tu historial guardado no cambia."))
                setDraft(fresh());
            }}
          >
            Descartar temporizador
          </button>
          <Soundscape />
        </section>
        <div className="space-y-5">
          <KoaMessage>
            El temporizador no marca tu racha. Al terminar, guarda hasta dónde llegaste o marca tu
            libro como leído.
          </KoaMessage>
          <section className="koa-card flex items-center gap-5">
            <Koa pose="meditate" className={`w-28 ${breathing ? "koa-breathe" : ""}`} />
            <div>
              <h2>Una pequeña pausa</h2>
              <p className="koa-muted my-3">
                {breathing
                  ? ["Inhala · 4 segundos", "Sostén · 4 segundos", "Exhala · 4 segundos"][
                      Math.floor(Math.max(0, now - breathing) / 4000) % 3
                    ]
                  : "Respira a tu ritmo antes de volver a la historia."}
              </p>
              <button
                className="koa-secondary"
                onClick={() => setBreathing(breathing ? null : Date.now())}
              >
                {breathing ? "Terminar pausa" : "Respirar con Koa"}
              </button>
            </div>
          </section>
          <div className="koa-card">
            <p className="koa-eyebrow">Una frase que quieres recordar</p>
            <h2>Deja una huella en tu cuaderno</h2>
            <p className="koa-muted my-3">
              Guarda una cita o una reflexión. Tu temporizador se conserva al cambiar de vista.
            </p>
            <Link className="koa-secondary" to="/notebook" search={{ book: book.id }}>
              Abrir mi cuaderno
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <Chat bookId={book.id} />
      </div>
      {success && (
        <div role="status" className="koa-message mt-6">
          <Koa pose="celebrate" className="w-20" />
          Tu sesión quedó guardada. Cada página suma a tu historia.
        </div>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {summary && (
        <Modal
          title="Tu momento entre páginas"
          onClose={() => {
            if (!busy) setSummary(false);
          }}
        >
          <Koa pose="meditate" className="w-24 mx-auto" />
          <p className="text-center">
            {Math.max(1, Math.ceil(elapsed / 60000))} minutos · {book.title}
          </p>
          {stale && (
            <ErrorNotice>
              El progreso cambió desde que empezaste.{" "}
              <button
                className="underline"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    from: book.current_page,
                    page: String(book.current_page),
                  }))
                }
              >
                Usar la página actual ({book.current_page})
              </button>
            </ErrorNotice>
          )}
          <label className="koa-label">
            Página alcanzada
            <input
              className="koa-field"
              type="number"
              min={book.current_page}
              max={book.pages || undefined}
              value={draft.page}
              onChange={(e) => setDraft({ ...draft, page: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={finish} onChange={(e) => setFinish(e.target.checked)} />
            Terminé este libro
          </label>
          <label className="koa-label">
            ¿Con qué pensamiento cierras el libro?
            <textarea
              className="koa-field"
              maxLength={2000}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <button className="koa-button" disabled={busy || stale || !valid} onClick={save}>
            {busy ? "Guardando…" : "Guardar sesión y reposar"}
          </button>
          <p className="koa-muted text-xs">
            Registra un avance o termina el libro. Guardar varias veces el mismo cierre no duplica
            la sesión.
          </p>
        </Modal>
      )}
    </>
  );
}
