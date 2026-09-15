import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen, Plus, Sparkles, Library, Search, Trash2, Loader2, LogOut, Edit,
  ChevronRight, Wind, AlertCircle, Filter, X, Target, BookMarked, CheckCircle2, MessageSquare, ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookCover } from "@/components/BookCover";
import { EditBookModal } from "@/components/EditBookModal";
import type { Book, BookStatus, RecommendationResult } from "@/types";
import { enrichBook, recommendBook } from "@/lib/books.functions";
import { ensureMembership } from "@/lib/membership.functions";
import { submitFeedback } from "@/lib/feedback.functions";
import { amazonWishlistUrl } from "@/lib/amazon";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Mi Biblioteca — Librero IA" },
      { name: "description", content: "Tu estantería personal: organiza libros, sigue tu progreso de lectura y consulta al Oráculo." },
      { property: "og:title", content: "Mi Biblioteca — Librero IA" },
      { property: "og:description", content: "Tu santuario lector privado: TBR, progreso y recomendaciones del Oráculo." },
      { property: "og:url", content: "https://ferova-ia-companion.lovable.app/library" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://ferova-ia-companion.lovable.app/library" },
    ],
  }),
  component: LibraryPage,
});

const STATUS_LABEL: Record<BookStatus, string> = { TBR: "Por leer", READING: "Leyendo", READ: "Leídos" };
const STATUS_ORDER: BookStatus[] = ["READING", "TBR", "READ"];

function LibraryPage() {
  const navigate = useNavigate();
  const enrich = useServerFn(enrichBook);
  const recommend = useServerFn(recommendBook);
  const ensureMembershipFn = useServerFn(ensureMembership);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [readingGoal, setReadingGoal] = useState(12);

  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState("Todos");
  const [isAdding, setIsAdding] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [updatingProgressId, setUpdatingProgressId] = useState<string | null>(null);

  // Recommendation
  const [view, setView] = useState<"library" | "recommendation">("library");
  const [userInput, setUserInput] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  // Goal editor
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(12);

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);

  // Load user, profile, books
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserEmail(u.user?.email ?? null);
      if (!u.user) return;
      const membership = await ensureMembershipFn();
      setIsAdmin(Boolean(membership.isAdmin));

      const { data: prof } = await supabase.from("profiles").select("reading_goal").eq("id", u.user.id).maybeSingle();
      if (prof) {
        setReadingGoal(prof.reading_goal);
        setGoalDraft(prof.reading_goal);
      }
      await refreshBooks();
      setLoading(false);
    })();

    const channel = supabase
      .channel("books-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, refreshBooks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshBooks() {
    const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (!error && data) setBooks(data as Book[]);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const genres = useMemo(() => {
    const set = new Set(books.map((b) => b.genre).filter(Boolean));
    return ["Todos", ...Array.from(set)];
  }, [books]);

  const filtered = useMemo(() => {
    return books.filter((b) => {
      const m = b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase());
      const g = filterGenre === "Todos" || b.genre === filterGenre;
      return m && g;
    });
  }, [books, search, filterGenre]);

  const grouped = useMemo(() => {
    const out: Record<BookStatus, Book[]> = { TBR: [], READING: [], READ: [] };
    filtered.forEach((b) => out[b.status].push(b));
    return out;
  }, [filtered]);

  const stats = useMemo(() => {
    const finished = books.filter((b) => b.status === "READ");
    const speeds = finished.map((b) => b.reading_speed_days).filter((x): x is number => !!x);
    const avgSpeed = speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null;
    return { readCount: finished.length, avgSpeed };
  }, [books]);

  // Velocidad en palabras por minuto: páginas × 250 palabras/pág ÷ minutos transcurridos
  const WORDS_PER_PAGE = 250;
  const calcWpm = (pages: number, startedAt: string) => {
    const minutes = Math.max(1, (Date.now() - new Date(startedAt).getTime()) / 60000);
    return Math.max(1, Math.round((pages * WORDS_PER_PAGE) / minutes));
  };

  // ----- Actions -----
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const author = String(fd.get("author") || "").trim();
    if (!title) return;
    setEnriching(true);
    setActionError(null);
    try {
      const enriched = await enrich({ data: { title, author: author || undefined } });
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase.from("books").insert({
        user_id: u.user.id,
        title: enriched.title,
        author: enriched.author,
        genre: enriched.genre,
        pages: enriched.pages,
        moods: enriched.moods,
        series_name: enriched.series_name ?? null,
        series_index: enriched.series_index ?? null,
        description: enriched.description,
        cover_url: enriched.cover_url ?? null,
        status: "TBR",
      });
      if (error) throw error;
      form.reset();
      setIsAdding(false);
      await refreshBooks();
    } catch (err: any) {
      setActionError(err?.message || "No pude guardar el libro. Inténtalo de nuevo.");
    } finally {
      setEnriching(false);
    }
  };

  const updateStatus = async (book: Book, status: BookStatus) => {
    const patch: Partial<Book> = { status };
    const now = new Date().toISOString();
    if (status === "READING") {
      patch.started_reading_at = book.started_reading_at ?? now;
    } else if (status === "READ") {
      patch.finished_reading_at = now;
      patch.current_page = book.pages || 0;
      if (book.started_reading_at && book.pages) {
        patch.reading_speed_days = calcWpm(book.pages, book.started_reading_at);
      }
    } else {
      patch.started_reading_at = null;
      patch.finished_reading_at = null;
      patch.reading_speed_days = null;
      patch.current_page = 0;
    }
    await supabase.from("books").update(patch).eq("id", book.id);
    refreshBooks();
  };

  const saveProgress = async (book: Book, page: number) => {
    const isDone = book.pages > 0 && page >= book.pages;
    const patch: Partial<Book> = { current_page: page };
    const startedAt = book.started_reading_at ?? (book.status === "READING" ? new Date().toISOString() : null);
    if (startedAt && !book.started_reading_at) patch.started_reading_at = startedAt;

    // Live reading-speed update on every progress edit (words per minute)
    if (startedAt && page > 0) {
      patch.reading_speed_days = calcWpm(page, startedAt);
    }

    if (isDone) {
      patch.status = "READ";
      patch.finished_reading_at = new Date().toISOString();
      patch.current_page = book.pages;
      if (startedAt) {
        patch.reading_speed_days = calcWpm(book.pages, startedAt);
      }
    }
    await supabase.from("books").update(patch).eq("id", book.id);
    setUpdatingProgressId(null);
    refreshBooks();
  };

  const saveEdit = async (fields: Partial<Book>) => {
    if (!editingBook) return;
    await supabase.from("books").update(fields).eq("id", editingBook.id);
    refreshBooks();
  };

  const removeBook = async (id: string) => {
    if (!confirm("¿Eliminar este libro de tu estantería?")) return;
    await supabase.from("books").delete().eq("id", id);
    refreshBooks();
  };

  const saveGoal = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("profiles").update({ reading_goal: goalDraft }).eq("id", u.user.id);
    setReadingGoal(goalDraft);
    setEditingGoal(false);
  };

  const askOracle = async () => {
    if (!userInput.trim()) return;
    setRecLoading(true);
    setView("recommendation");
    setRecommendation(null);
    try {
      const r = await recommend({
        data: {
          userRequest: userInput,
          books: books.map((b) => ({
            id: b.id, title: b.title, author: b.author, genre: b.genre, pages: b.pages,
            moods: b.moods, series_name: b.series_name, series_index: b.series_index, status: b.status,
            user_rating: b.user_rating, user_review: b.user_review,
          })),
        },
      });
      setRecommendation(r);
    } finally {
      setRecLoading(false);
    }
  };

  const acceptExternal = async () => {
    if (!recommendation?.external) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
      const { error } = await supabase.from("books").insert({
      user_id: u.user.id,
      title: recommendation.external.title,
      author: recommendation.external.author || "Autor desconocido",
      genre: recommendation.external.genre || "Literatura",
      pages: recommendation.external.pages || 0,
      moods: recommendation.external.moods || [],
      description: recommendation.external.description || "",
      cover_url: recommendation.external.cover_url ?? null,
      status: "TBR",
    });
      if (error) throw error;
    setView("library");
    setRecommendation(null);
    setUserInput("");
    await refreshBooks();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            <span className="font-serif font-black tracking-tight">Librero IA</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <span className="hidden sm:inline text-muted-foreground truncate max-w-[200px]">{userEmail}</span>
            {isAdmin && (
              <Link to="/admin" className="font-mono-label hover:text-accent transition-colors">
                Admin
              </Link>
            )}
            <button onClick={() => setShowFeedback(true)} className="flex items-center gap-1.5 hover:text-accent transition-colors" title="Sugerencias o reportar errores">
              <MessageSquare className="w-3.5 h-3.5" /> <span className="font-mono-label hidden sm:inline">Feedback</span>
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 hover:text-accent transition-colors" title="Cerrar sesión">
              <LogOut className="w-3.5 h-3.5" /> <span className="font-mono-label">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight">Mi Biblioteca</h1>
        {/* Stats strip */}
        <section className="grid grid-cols-3 gap-3 sm:gap-6">
          <StatCard icon={Library} label="En tu estantería" value={String(books.length)} />
          <StatCard icon={CheckCircle2} label={`Leídos / Meta ${readingGoal}`} value={`${stats.readCount}`}
            extra={
              editingGoal ? (
                <div className="flex items-center gap-1 mt-1">
                  <input type="number" min={1} value={goalDraft} onChange={(e) => setGoalDraft(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 bg-background border border-border px-1 py-0.5 text-xs rounded-sm" />
                  <button onClick={saveGoal} className="text-accent text-xs font-mono-label">OK</button>
                </div>
              ) : (
                <button onClick={() => setEditingGoal(true)} className="font-mono-label hover:text-accent transition-colors flex items-center gap-1 mt-1">
                  <Target className="w-3 h-3" /> Editar meta
                </button>
              )
            }
          />
          <StatCard icon={Wind} label="Vel. promedio" value={stats.avgSpeed ? `${stats.avgSpeed} palabras/min` : "—"} />
        </section>

        {/* Oracle recommend bar */}
        <section className="bg-card border border-border rounded-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-mono-label">Pregúntale al Oráculo</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="¿Cómo te sientes hoy? ej. 'Quiero algo gótico y corto, estoy en bloqueo lector'"
              className="flex-1 bg-background border border-border px-3 py-3 rounded-sm focus:outline-none focus:border-foreground text-sm font-serif italic"
            />
            <button
              onClick={askOracle}
              disabled={!userInput.trim() || recLoading}
              className="bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {recLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Recomendar
            </button>
          </div>
        </section>

        {/* Search + filter + add */}
        <section className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar título o autor..." className="w-full bg-card border border-border pl-10 pr-3 py-2.5 rounded-sm text-sm focus:outline-none focus:border-foreground" />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="bg-card border border-border pl-10 pr-8 py-2.5 rounded-sm text-sm focus:outline-none focus:border-foreground appearance-none">
              {genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-foreground text-background px-5 py-2.5 rounded-sm font-mono-label flex items-center justify-center gap-2 hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Añadir libro
          </button>
        </section>

        {/* Sections */}
        {STATUS_ORDER.map((status) => {
          const list = grouped[status];
          if (!list.length) return null;
          return (
            <section key={status}>
              <h2 className="font-serif text-2xl font-black tracking-tight mb-4 flex items-center gap-3">
                {STATUS_LABEL[status]}
                <span className="font-mono-label">{list.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((b) => (
                  <BookRow
                    key={b.id}
                    book={b}
                    updating={updatingProgressId === b.id}
                    onStartProgress={() => setUpdatingProgressId(b.id)}
                    onSaveProgress={(p) => saveProgress(b, p)}
                    onCancelProgress={() => setUpdatingProgressId(null)}
                    onStatus={(s) => updateStatus(b, s)}
                    onEdit={() => setEditingBook(b)}
                    onDelete={() => removeBook(b.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {!books.length && (
          <div className="border border-dashed border-border rounded-sm p-12 text-center">
            <BookMarked className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-serif text-xl font-bold">Tu estantería está vacía</h3>
            <p className="text-sm text-muted-foreground mt-2">Añade tu primer libro para que el Oráculo empiece a conocer tu gusto.</p>
            <button onClick={() => setIsAdding(true)} className="mt-5 inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-sm font-mono-label">
              <Plus className="w-3.5 h-3.5" /> Añadir libro
            </button>
          </div>
        )}
      </main>

      {/* Add book modal */}
      <AnimatePresence>
        {isAdding && (
          <Modal onClose={() => !enriching && setIsAdding(false)}>
            <h2 className="font-serif text-2xl font-black tracking-tight mb-1">Añadir un libro</h2>
            <p className="text-xs text-muted-foreground italic mb-5">El Oráculo enriquecerá automáticamente con género, sinopsis y portada.</p>
            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <label className="font-mono-label block mb-1">Título</label>
                <input name="title" required className="w-full bg-background border border-border px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-foreground" />
              </div>
              <div>
                <label className="font-mono-label block mb-1">Autor (opcional)</label>
                <input name="author" className="w-full bg-background border border-border px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-foreground" />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIsAdding(false)} disabled={enriching} className="flex-1 border border-border py-3 font-mono-label rounded-sm hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={enriching} className="flex-1 bg-foreground text-background py-3 font-mono-label rounded-sm hover:opacity-90 flex items-center justify-center gap-2">
                  {enriching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enriqueciendo</> : <><Sparkles className="w-3.5 h-3.5" /> Añadir</>}
                </button>
              </div>
              {actionError && <p className="text-xs text-destructive">{actionError}</p>}
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Recommendation modal */}
      <AnimatePresence>
        {view === "recommendation" && (
          <Modal onClose={() => { setView("library"); setRecommendation(null); }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-mono-label">El Oráculo sugiere</span>
            </div>
            {recLoading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground italic font-serif">Consultando el archivo…</p>
              </div>
            ) : recommendation?.errorType ? (
              <div className="py-6">
                <AlertCircle className="w-5 h-5 text-destructive mb-2" />
                <p className="font-serif">{recommendation.reasoning}</p>
              </div>
            ) : recommendation ? (
              <RecommendationView rec={recommendation} books={books} onAccept={acceptExternal} onClose={() => { setView("library"); setRecommendation(null); }} />
            ) : null}
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      {editingBook && <EditBookModal book={editingBook} onClose={() => setEditingBook(null)} onSave={saveEdit} />}

      {/* Feedback modal */}
      <AnimatePresence>
        {showFeedback && <FeedbackModal email={userEmail} onClose={() => setShowFeedback(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------ Sub-components ------------ */
function StatCard({ icon: Icon, label, value, extra }: { icon: any; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <span className="font-mono-label truncate">{label}</span>
      </div>
      <div className="font-serif text-2xl sm:text-3xl font-black tracking-tight">{value}</div>
      {extra}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="max-w-lg w-full bg-card p-8 border border-foreground/80 rounded-sm shadow-2xl relative max-h-[85vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-2" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function BookRow({
  book, updating, onStartProgress, onSaveProgress, onCancelProgress, onStatus, onEdit, onDelete,
}: {
  book: Book; updating: boolean;
  onStartProgress: () => void; onSaveProgress: (page: number) => void; onCancelProgress: () => void;
  onStatus: (s: BookStatus) => void; onEdit: () => void; onDelete: () => void;
}) {
  const [page, setPage] = useState(book.current_page);
  useEffect(() => { setPage(book.current_page); }, [book.current_page]);
  const pct = book.pages > 0 ? Math.min(100, Math.round((book.current_page / book.pages) * 100)) : 0;

  return (
    <div className="bg-card border border-border rounded-sm p-4 flex gap-4">
      <BookCover book={book} className="w-16 h-24 sm:w-20 sm:h-28 text-xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif font-bold leading-tight truncate">{book.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
            {book.series_name && (
              <p className="text-[10px] text-accent font-mono uppercase tracking-wider mt-0.5">
                {book.series_name}{book.series_index ? ` · #${book.series_index}` : ""}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-sm">{book.genre}</span>
          {book.pages > 0 && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-sm">{book.pages} págs</span>}
          {book.moods?.slice(0, 2).map((m) => <span key={m} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-sm">#{m}</span>)}
        </div>

        {book.status === "READING" && book.pages > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-mono-label mb-1">
              <span>Progreso · {pct}%</span>
              {!updating && (
                <button onClick={onStartProgress} className="text-accent hover:underline">
                  {book.current_page}/{book.pages}
                </button>
              )}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            {updating && (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" min={0} max={book.pages} value={page} onChange={(e) => setPage(Math.max(0, Math.min(book.pages, parseInt(e.target.value) || 0)))} className="w-20 bg-background border border-border px-2 py-1 text-xs rounded-sm" />
                <button onClick={() => onSaveProgress(page)} className="text-xs font-mono-label text-accent">Guardar</button>
                <button onClick={onCancelProgress} className="text-xs font-mono-label text-muted-foreground">Cancelar</button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1 mt-3">
          {(["TBR", "READING", "READ"] as BookStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              className={`text-[10px] font-mono-label px-2 py-1 rounded-sm transition-colors ${book.status === s ? "bg-foreground text-background" : "bg-muted hover:bg-border"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecommendationView({ rec, books, onAccept, onClose }: { rec: RecommendationResult; books: Book[]; onAccept: () => void; onClose: () => void }) {
  const internal = rec.bookId ? books.find((b) => b.id === rec.bookId) : null;
  const ext = rec.external;
  const display = internal
    ? { title: internal.title, author: internal.author, cover_url: internal.cover_url }
    : ext
      ? { title: ext.title, author: ext.author, cover_url: ext.cover_url ?? null }
      : null;
  const amazonUrl = display ? amazonWishlistUrl(display.title, display.author) : null;

  return (
    <div>
      <h3 className="font-serif text-2xl font-black tracking-tight mb-4">
        {internal ? "De tu estantería" : ext ? "Una sugerencia externa" : "Sin coincidencias claras"}
      </h3>
      {display && (
        <div className="flex gap-4 mb-4">
          <BookCover book={{ title: display.title, author: display.author, cover_url: display.cover_url }} className="w-20 h-28 text-xs" />
          <div>
            <h4 className="font-serif font-bold text-lg">{display.title}</h4>
            <p className="text-sm text-muted-foreground">{display.author}</p>
            {ext?.series_name && <p className="text-[10px] text-accent font-mono uppercase tracking-wider mt-1">Saga · {ext.series_name}</p>}
          </div>
        </div>
      )}
      <p className="font-serif italic leading-relaxed text-sm border-l-2 border-accent pl-4">{rec.reasoning}</p>
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={onClose} className="flex-1 border border-border py-3 font-mono-label rounded-sm hover:bg-muted">Cerrar</button>
        {amazonUrl && (
          <a href={amazonUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-accent text-accent-foreground py-3 font-mono-label rounded-sm hover:opacity-90 flex items-center justify-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5" /> Lista de deseos Amazon
          </a>
        )}
        {ext && !internal && (
          <button onClick={onAccept} className="flex-1 bg-foreground text-background py-3 font-mono-label rounded-sm hover:opacity-90 flex items-center justify-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Añadir a mi TBR
          </button>
        )}
      </div>
    </div>
  );
}

function FeedbackModal({ email, onClose }: { email: string | null; onClose: () => void }) {
  const submit = useServerFn(submitFeedback);
  const [type, setType] = useState<"suggestion" | "bug" | "other">("suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(email ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setSending(true);
    setErr(null);
    try {
      await submit({ data: { type, message, email: contactEmail || undefined } });
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || "No pude enviar tu mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        <span className="font-mono-label">Sugerencias y errores</span>
      </div>
      <h2 className="font-serif text-2xl font-black tracking-tight mb-2">Cuéntame qué mejorar</h2>
      <p className="text-xs text-muted-foreground italic mb-5">Lo recibo directamente en mi portal de admin. Lo leo todo.</p>
      {sent ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
          <p className="font-serif">¡Gracias! Tu mensaje llegó al estudio.</p>
          <button onClick={onClose} className="mt-3 bg-foreground text-background px-5 py-2.5 font-mono-label rounded-sm">Cerrar</button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <div>
            <label className="font-mono-label block mb-1">Tipo</label>
            <div className="flex gap-2">
              {(["suggestion", "bug", "other"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`text-xs font-mono-label px-3 py-2 rounded-sm border ${type === t ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}>
                  {t === "suggestion" ? "Sugerencia" : t === "bug" ? "Error" : "Otro"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono-label block mb-1">Mensaje</label>
            <textarea required minLength={5} value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full bg-background border border-border px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-foreground font-serif" />
          </div>
          <div>
            <label className="font-mono-label block mb-1">Email de contacto (opcional)</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-sm text-sm focus:outline-none focus:border-foreground" />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={sending} className="flex-1 border border-border py-3 font-mono-label rounded-sm hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={sending || message.trim().length < 5} className="flex-1 bg-foreground text-background py-3 font-mono-label rounded-sm hover:opacity-90 flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />} Enviar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}