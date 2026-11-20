import { Modal, ErrorNotice } from "@/components/koa/UI";
import { userError } from "@/lib/koa-data";
import { IsbnEntry } from "@/components/IsbnEntry";
import { CoverCrop } from "@/components/koa/CoverCrop";
import { useId, useState } from "react";
import { Save } from "lucide-react";
import type { Book } from "@/types";

interface EditBookModalProps {
  book: Book;
  books: Book[];
  refresh: () => Promise<void>;
  onClose: () => void;
  onSave: (updatedFields: Partial<Book>) => Promise<void>;
}

// Estrellas y reseña viven en la ficha del libro (BookFeelings); este diálogo
// solo edita los datos de la edición para no pisar una valoración más reciente.
export function EditBookModal({ book, books, refresh, onClose, onSave }: EditBookModalProps) {
  const id = useId();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genre, setGenre] = useState(book.genre);
  const [pages, setPages] = useState<number>(book.pages || 0);
  const [description, setDescription] = useState(book.description || "");
  const [seriesName, setSeriesName] = useState(book.series_name || "");
  const [seriesIndex, setSeriesIndex] = useState<number | "">(book.series_index ?? "");
  const [coverUrl, setCoverUrl] = useState(book.cover_url || "");
  const [moodsInput, setMoodsInput] = useState(book.moods?.join(", ") ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      const moods = moodsInput
        .split(",")
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);
      await onSave({
        title: title.trim(),
        author: author.trim() || "Autor desconocido",
        genre: genre.trim() || "General",
        pages: Number(pages) || 0,
        description: description.trim(),
        series_name: seriesName.trim() || null,
        series_index: seriesIndex !== "" ? Number(seriesIndex) : null,
        cover_url: coverUrl.trim() || null,
        moods,
      });
      onClose();
    } catch (e) {
      setError(userError(e));
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    "w-full bg-background border border-border px-3 py-2 font-serif focus:outline-none focus:border-foreground transition-colors text-sm rounded-sm";
  const labelCls = "font-mono-label block mb-1";
  const f = (name: string) => `${id}-${name}`;

  return (
    <Modal
      title="Editar datos del libro"
      onClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <p className="text-xs text-muted-foreground italic mb-4">
        Ajusta los detalles de «{book.title}» para tu estantería. Tus estrellas y tu reseña se
        editan en la ficha del libro.
      </p>

      {book.isbn ? (
        <p className="my-3 text-sm">ISBN {book.isbn}</p>
      ) : (
        <IsbnEntry
          books={books}
          existingBook={book}
          saved={async () => {
            await refresh();
            onClose();
          }}
        />
      )}
      <CoverCrop book={book.id} saved={refresh} />
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={f("title")} className={labelCls}>
              Título
            </label>
            <input
              id={f("title")}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={f("author")} className={labelCls}>
              Autor
            </label>
            <input
              id={f("author")}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor={f("genre")} className={labelCls}>
              Género
            </label>
            <input
              id={f("genre")}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={f("pages")} className={labelCls}>
              Páginas
            </label>
            <input
              id={f("pages")}
              type="number"
              min={0}
              value={pages}
              onChange={(e) => setPages(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={f("moods")} className={labelCls}>
              Atmósferas (separadas por comas)
            </label>
            <input
              id={f("moods")}
              value={moodsInput}
              onChange={(e) => setMoodsInput(e.target.value)}
              placeholder="mágico, oscuro"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={f("series")} className={labelCls}>
              Saga
            </label>
            <input
              id={f("series")}
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="Ej. Terramar"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={f("index")} className={labelCls}>
              Número en la saga
            </label>
            <input
              id={f("index")}
              type="number"
              min={0}
              value={seriesIndex}
              onChange={(e) =>
                setSeriesIndex(
                  e.target.value !== "" ? Math.max(0, parseInt(e.target.value) || 0) : "",
                )
              }
              placeholder="Ej. 1"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label htmlFor={f("cover")} className={labelCls}>
            URL de portada
          </label>
          <input
            id={f("cover")}
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={f("description")} className={labelCls}>
            Sinopsis
          </label>
          <textarea
            id={f("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} italic min-h-[100px]`}
            placeholder="Breve descripción..."
          />
        </div>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-background border border-border py-3 font-mono-label hover:bg-muted transition-all rounded-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-foreground text-background py-3 font-mono-label hover:opacity-90 transition-all flex items-center justify-center gap-2 rounded-sm"
          >
            <Save className="w-3.5 h-3.5" /> Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
