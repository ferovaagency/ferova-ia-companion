import { createFileRoute, Link } from "@tanstack/react-router";
import { useReader } from "@/hooks/use-reader";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookCover } from "@/components/BookCover";
import { EditBookModal } from "@/components/EditBookModal";
import { SessionForm } from "@/components/ReadingJournal";
import { PageTitle, Loading, ErrorNotice, Empty, Modal } from "@/components/koa/UI";
import { ShareButton } from "@/components/koa/ShareButton";
import { userError } from "@/lib/koa-data";
import type { Book } from "@/types";
import { BookFeelings } from "@/components/koa/BookFeelings";
import { Star } from "lucide-react";
export const Route = createFileRoute("/_authenticated/books/$bookId")({
  head: () => ({
    meta: [{ title: "Tu libro — Lee con Koa" }, { name: "description", content: "Detalles y progreso de tu libro privado." }, { property: "og:title", content: "Tu libro — Lee con Koa" }, { property: "og:description", content: "Tu lectura, tus reseñas y tu cuaderno." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }],
  }),
  component: BookPage,
});
function BookPage() {
  const { bookId } = Route.useParams();
  const { data: books = [], isLoading, error, refetch } = useReader();
  const [edit, setEdit] = useState(false);
  const [progress, setProgress] = useState(false);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const b = books.find((b) => b.id === bookId);
  const refresh = async () => {
    await refetch();
  };
  if (isLoading) return <Loading />;
  if (error) return <ErrorNotice>{userError(error)}</ErrorNotice>;
  if (!b)
    return (
      <Empty title="No encontramos este libro">
        <Link to="/library">Volver a mi biblioteca</Link>
      </Empty>
    );
  async function start() {
    if (!b) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({ status: "READING", started_reading_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setFailure(userError(e));
    } finally {
      setBusy(false);
    }
  }
  async function rate(user_rating: number | null) {
    setBusy(true);
    setFailure("");
    try {
      const { error } = await supabase.from("books").update({ user_rating }).eq("id", bookId);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setFailure(userError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(fields: Partial<Book>) {
    const { error } = await supabase.from("books").update(fields).eq("id", bookId);
    if (error) throw error;
    await refresh();
  }
  return (
    <>
      <Link to="/library" className="koa-muted">
        ← Mi biblioteca
      </Link>
      <PageTitle eyebrow="Una historia en tu estantería" title={b.title}>
        {b.author}
      </PageTitle>
      <div className="koa-card grid md:grid-cols-[200px_1fr] gap-7">
        <BookCover book={b} className="w-44 h-64 mx-auto" />
        <div>
          <div className="flex flex-wrap gap-2 mb-5">
            {[b.genre, ...b.moods].filter(Boolean).map((t) => (
              <span className="koa-chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <p className="leading-relaxed whitespace-pre-wrap">
            {b.description ||
              "Todavía no tienes una sinopsis. Puedes añadirla al editar este libro."}
          </p>
          <p className="koa-muted my-5">
            {b.pages ? `${b.pages} páginas` : "Extensión por confirmar"}
            {b.isbn && ` · ISBN ${b.isbn}`}
            {b.series_name && ` · ${b.series_name} #${b.series_index ?? "?"}`}
          </p>
          <div className="koa-progress mb-2">
            <span
              style={{ width: `${b.pages ? Math.min(100, (100 * b.current_page) / b.pages) : 0}%` }}
            />
          </div>
          <p className="koa-muted">
            Página {b.current_page}
            {b.pages > 0 && ` de ${b.pages}`}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {b.status === "READING" ? (
              <>
                <Link to="/read" search={{ book: b.id }} className="koa-button">
                  Continuar sesión
                </Link>
                <button className="koa-secondary" onClick={() => setProgress(true)}>
                  Actualizar progreso
                </button>
              </>
            ) : (
              <button className="koa-button" disabled={busy} onClick={start}>
                {b.status === "READ" ? "Volver a leer" : "Empezar a leer"}
              </button>
            )}
            <Link className="koa-secondary" to="/notebook" search={{ book: b.id }}>
              Ver cuaderno
            </Link>
            <button className="koa-secondary" onClick={() => setEdit(true)}>
              Editar datos del libro
            </button>
            {b.status !== "READ" && <ShareButton label="Compartir mi elección" input={{ kind: "chosen", title: b.title, author: b.author }} />}
          </div>
        </div>
      </div>
      <section className="koa-card mt-5" aria-labelledby="book-rating-title">
        <h2 id="book-rating-title">Cuánto me gustó</h2>
        <div className="flex flex-wrap items-center gap-1 mt-3" role="group" aria-label="Estrellas opcionales">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="p-1 rounded-sm disabled:opacity-60"
              disabled={busy}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              aria-pressed={b.user_rating === n}
              onClick={() => rate(b.user_rating === n ? null : n)}
            >
              <Star className={`w-6 h-6 ${b.user_rating && n <= b.user_rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
            </button>
          ))}
          <span className="koa-muted ml-2 text-sm">
            {b.user_rating ? `${b.user_rating}/5 · pulsa la misma estrella para quitarla` : "Sin estrellas todavía"}
          </span>
        </div>
        {b.user_review ? (
          <p className="mt-4 whitespace-pre-wrap">{b.user_review}</p>
        ) : (
          <p className="koa-muted mt-4">Escribe tu reseña en «Valorar y guardar sensaciones», más abajo.</p>
        )}
      </section>
      {failure && <ErrorNotice>{failure}</ErrorNotice>}
      <BookFeelings book={b} refresh={refresh} />
      {edit && (
        <EditBookModal
          books={books}
          book={b}
          refresh={refresh}
          onSave={save}
          onClose={() => setEdit(false)}
        />
      )}{" "}
      {progress && (
        <Modal title="Actualizar progreso" onClose={() => setProgress(false)}>
          <SessionForm book={b} onSaved={refresh} onClose={() => setProgress(false)} />
        </Modal>
      )}
    </>
  );
}
