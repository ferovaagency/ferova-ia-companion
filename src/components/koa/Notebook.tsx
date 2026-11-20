import { deviceImage } from "@/lib/image-device";
import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star, Copy, Trash2, Pencil, Camera, Mic, Download, Volume2 } from "lucide-react";
import type { Book } from "@/types";
import { koaDb, userError, type Note } from "@/lib/koa-data";
import { askKoa } from "@/lib/koa-ai.functions";
import { ErrorNotice, Empty } from "./UI";
import { currentUser } from "@/hooks/use-reader";
import { usePlan } from "@/hooks/use-plan";
import { Link } from "@tanstack/react-router";
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: { [n: number]: { [n: number]: { transcript: string } }; length: number };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
export function Notebook({ books, initialBook }: { books: Book[]; initialBook?: string }) {
  const [bookId, setBookId] = useState(initialBook ?? books[0]?.id ?? "");
  const [filter, setFilter] = useState(initialBook ?? "");
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [reflection, setReflection] = useState("");
  const [kind, setKind] = useState<"quote" | "note">("quote");
  const [page, setPage] = useState("");
  const [tags, setTags] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(false);
  const { isFree } = usePlan();
  const [more, setMore] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ask = useServerFn(askKoa);
  const load = useCallback(
    async (start = 0) => {
      let q = koaDb
        .from("reader_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(start, start + 199);
      if (filter) q = q.eq("book_id", filter);
      const { data, error } = await q;
      if (error) throw error;
      setNotes((previous) => (start ? [...previous, ...data] : data));
      setMore(data.length === 200);
    },
    [filter],
  );
  useEffect(() => {
    void load().catch((e) => setError(userError(e)));
  }, [load]);
  useEffect(
    () => () => {
      recognition.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  function clear() {
    setEditing(null);
    setContent("");
    setReflection("");
    setTags("");
    setPage("");
  }
  async function save() {
    if (!bookId) return;
    setBusy(true);
    setError("");
    try {
      const u = await currentUser();
      const fields = {
        book_id: bookId,
        user_id: u.id,
        kind,
        content: content.trim(),
        reflection: reflection.trim(),
        page: page === "" ? null : Number(page),
        tags: tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean)
          .slice(0, 20),
      };
      const result = editing
        ? await koaDb.from("reader_notes").update(fields).eq("id", editing)
        : await koaDb.from("reader_notes").insert(fields);
      if (result.error) throw result.error;
      clear();
      setNotice("Guardado en tu cuaderno.");
      await load();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  async function scan(f: File) {
    setBusy(true);
    setError("");
    try {
      if (f.size > 4_000_000 || !/^image\/(jpeg|png|webp)$/.test(f.type))
        throw Error("Usa una imagen JPG, PNG o WebP de hasta 4 MB.");
      const image = await deviceImage(f);
      const r = await ask({ data: { bookId, mode: "ocr", image } });
      setContent(r.text);
      setKind("quote");
      setNotice("Revisa la transcripción y su página antes de guardarla.");
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  function dictate() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const w = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) {
      setNotice("El dictado no está disponible en este navegador. Puedes escribir tu nota.");
      return;
    }
    const r = new C();
    recognition.current = r;
    r.lang = "es-CO";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) =>
      setContent((c) => [c, e.results[0][0].transcript].filter(Boolean).join(" "));
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Permite el micrófono para dictar o escribe tu nota."
          : "No se pudo capturar la voz. Puedes escribir tu nota.",
      );
      setListening(false);
    };
    r.onend = () => setListening(false);
    try {
      r.start();
      setListening(true);
    } catch {
      setError("No se pudo iniciar el dictado.");
    }
  }
  async function postcard(n: Note) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#0e0f32";
    c.fillRect(0, 0, 1080, 1350);
    c.strokeStyle = "#818cf8";
    c.lineWidth = 2;
    c.strokeRect(50, 50, 980, 1250);
    c.fillStyle = "#ffb95f";
    c.font = "28px sans-serif";
    c.fillText("MI CUADERNO · LEE CON KOA", 100, 140);
    c.fillStyle = "#e1e0ff";
    c.font = "42px Georgia";
    let y = 280,
      line = "";
    for (const word of n.content.slice(0, 850).split(/\s+/)) {
      if (c.measureText(line + word).width > 870) {
        c.fillText(line, 100, y);
        line = "";
        y += 62;
        if (y > 1080) {
          line = "…";
          break;
        }
      }
      line += word + " ";
    }
    c.fillText(line, 100, y);
    c.font = "26px sans-serif";
    const book = books.find((b) => b.id === n.book_id);
    c.fillStyle = "#bdc2ff";
    c.fillText((book?.title ?? "Reflexión personal").slice(0, 52), 100, 1200);
    c.fillText(
      n.kind === "quote"
        ? `${book?.author ?? ""}${n.page !== null ? " · pág. " + n.page : ""}`
        : "Nota personal",
      100,
      1245,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mi-cita-lee-con-koa.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }
  const visible = notes.filter(
    (n) =>
      (!favorites || n.favorite) &&
      `${n.content} ${n.reflection} ${n.tags.join(" ")} ${(n.feeling_tags ?? []).join(" ")} ${n.chapter}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  if (!books.length)
    return (
      <Empty title="Tu cuaderno empieza con un libro">
        Añade una lectura a tu biblioteca para guardar sus citas y tus ideas.
      </Empty>
    );
  return (
    <>
      <section className="koa-card no-print">
        <h2>{editing ? "Editar fragmento" : "Añadir una cita o reflexión"}</h2>
        <p className="koa-muted mt-2 mb-4">
          Un espacio privado para las palabras que se quedan contigo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="koa-label">
              Libro
              <select
                className="koa-field mt-1"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                required
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="koa-label">
              Tipo
              <select
                className="koa-field mt-1"
                value={kind}
                onChange={(e) => setKind(e.target.value as "quote" | "note")}
              >
                <option value="quote">Cita del libro</option>
                <option value="note">Reflexión personal</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="koa-label">{kind === "quote" ? "Fragmento" : "Tu reflexión"}</span>
            <textarea
              className="koa-field font-serif"
              rows={4}
              required
              value={content}
              maxLength={10000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Las palabras que quieres recordar…"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label>
              <span className="koa-label">Página (opcional)</span>
              <input
                className="koa-field"
                type="number"
                min="0"
                step="1"
                value={page}
                onChange={(e) => setPage(e.target.value)}
              />
            </label>
            <label>
              <span className="koa-label">Etiquetas, separadas por comas</span>
              <input
                className="koa-field"
                value={tags}
                maxLength={500}
                onChange={(e) => setTags(e.target.value)}
                placeholder="misterio, memoria…"
              />
            </label>
          </div>
          {kind === "quote" && (
            <label className="block">
              <span className="koa-label">¿Qué te hizo pensar? (opcional)</span>
              <textarea
                className="koa-field"
                value={reflection}
                maxLength={5000}
                onChange={(e) => setReflection(e.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="koa-button" disabled={busy || !content.trim()}>
              {busy ? "Guardando…" : "Guardar en mi cuaderno"}
            </button>
            <button
              type="button"
              className="koa-secondary"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              <Camera size={16} />
              Escanear texto
            </button>
            <button type="button" className="koa-secondary" onClick={dictate}>
              <Mic size={16} />
              {listening ? "Detener dictado" : "Dictar"}
            </button>
            {editing && (
              <button type="button" className="koa-secondary" onClick={clear}>
                Cancelar edición
              </button>
            )}
          </div>
          <input
            ref={file}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void scan(f);
              e.target.value = "";
            }}
          />
          <p className="koa-muted text-xs">
            El escaneo envía la foto a la IA para transcribirla. El dictado depende del servicio de
            voz de tu navegador.
          </p>
        </form>
      </section>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {notice && (
        <p role="status" className="koa-muted my-4">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3 my-6 no-print">
        <input
          aria-label="Buscar en notas"
          className="koa-field flex-1 min-w-40"
          placeholder="Buscar entre tus palabras…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar notas por libro"
          className="koa-field w-auto max-w-full"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todos mis libros</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <button
          className={`koa-chip ${favorites ? "active" : ""}`}
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Star size={16} />
          Favoritas
        </button>
        {isFree ? (
          <Link to="/pro" className="koa-secondary" title="Exportar a PDF es parte de Lee con Koa Pro">
            <Download size={16} />
            PDF · Pro
          </Link>
        ) : (
          <button className="koa-secondary" onClick={() => window.print()}>
            <Download size={16} />
            Imprimir / PDF
          </button>
        )}
      </div>
      <div className="space-y-4">
        {visible.map((n) => (
          <article key={n.id} className="koa-card">
            <p className="koa-eyebrow">
              {books.find((b) => b.id === n.book_id)?.title} {n.page !== null && `· pág. ${n.page}`} {n.chapter && `· capítulo ${n.chapter}`}
            </p>
            <div className="koa-quote">{n.content}</div>
            {n.reflection && (
              <p className="koa-muted mt-4 whitespace-pre-wrap">Tu reflexión · {n.reflection}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {n.tags.map((t) => (
                <span className="koa-chip" key={t}>
                  #{t}
                </span>
              ))}
              {(n.feeling_tags ?? []).map((t) => <span className="koa-chip" key={`feeling-${t}`}>{t}</span>)}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 no-print">
              <button
                className="koa-icon"
                aria-label={n.favorite ? "Quitar de favoritas" : "Guardar en favoritas"}
                onClick={async () => {
                  const { error } = await koaDb
                    .from("reader_notes")
                    .update({ favorite: !n.favorite })
                    .eq("id", n.id);
                  if (error) setError(userError(error));
                  else
                    setNotes(
                      notes.map((x) => (x.id === n.id ? { ...x, favorite: !x.favorite } : x)),
                    );
                }}
              >
                <Star size={16} fill={n.favorite ? "currentColor" : "none"} />
              </button>
              <button
                className="koa-icon"
                aria-label="Copiar cita"
                onClick={() =>
                  navigator.clipboard
                    .writeText(n.content)
                    .then(() => setNotice("Texto copiado."))
                    .catch(() => setError("No se pudo copiar. Selecciona el texto para copiarlo."))
                }
              >
                <Copy size={16} />
              </button>
              <button
                className="koa-icon"
                aria-label="Editar nota"
                onClick={() => {
                  setEditing(n.id);
                  setBookId(n.book_id);
                  setKind(n.kind);
                  setContent(n.content);
                  setReflection(n.reflection);
                  setPage(n.page === null ? "" : String(n.page));
                  setTags(n.tags.join(", "));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="koa-icon"
                aria-label="Eliminar nota"
                onClick={async () => {
                  if (!confirm("¿Eliminar esta nota?")) return;
                  const { error } = await koaDb.from("reader_notes").delete().eq("id", n.id);
                  if (error) setError(userError(error));
                  else setNotes(notes.filter((x) => x.id !== n.id));
                }}
              >
                <Trash2 size={16} />
              </button>
              <button className="koa-secondary" onClick={() => postcard(n)}>
                Crear postal
              </button>
              <button
                className="koa-icon"
                aria-label="Escuchar fragmento"
                onClick={() => {
                  if (!("speechSynthesis" in window)) {
                    setNotice("La lectura en voz alta no está disponible.");
                    return;
                  }
                  window.speechSynthesis.cancel();
                  const speech = new SpeechSynthesisUtterance(n.content);
                  speech.lang = "es";
                  window.speechSynthesis.speak(speech);
                }}
              >
                <Volume2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <Empty title="Tus palabras tienen un lugar aquí">
          Guarda tu primer fragmento o ajusta los filtros.
        </Empty>
      )}
      {more && (
        <button
          className="koa-secondary mt-5"
          onClick={() => load(notes.length).catch((e) => setError(userError(e)))}
        >
          Cargar más notas
        </button>
      )}
    </>
  );
}
