import { useState } from "react";
import { motion } from "motion/react";
import { X, Save, Edit, Star } from "lucide-react";
import type { Book } from "@/types";

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onSave: (updatedFields: Partial<Book>) => Promise<void>;
}

export function EditBookModal({ book, onClose, onSave }: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genre, setGenre] = useState(book.genre);
  const [pages, setPages] = useState<number>(book.pages || 0);
  const [description, setDescription] = useState(book.description || "");
  const [seriesName, setSeriesName] = useState(book.series_name || "");
  const [seriesIndex, setSeriesIndex] = useState<number | "">(book.series_index ?? "");
  const [coverUrl, setCoverUrl] = useState(book.cover_url || "");
  const [moodsInput, setMoodsInput] = useState(book.moods?.join(", ") ?? "");
  const [userRating, setUserRating] = useState<number | null>(book.user_rating ?? null);
  const [userReview, setUserReview] = useState(book.user_review ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const moods = moodsInput.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);
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
        user_rating: userRating,
        user_review: userReview.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    "w-full bg-background border border-border px-3 py-2 font-serif focus:outline-none focus:border-foreground transition-colors text-sm rounded-sm";
  const labelCls = "font-mono-label block mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="max-w-xl w-full bg-card p-8 sm:p-10 border border-foreground/80 shadow-2xl relative max-h-[85vh] overflow-y-auto rounded-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-2" disabled={isSaving} aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Edit className="w-4 h-4 text-accent" />
            <span className="font-mono-label">Edición Manual</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight">Editar Metadatos</h2>
          <p className="text-xs text-muted-foreground italic mt-1">Ajusta los detalles de "{book.title}" para tu estantería personal.</p>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Título</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Autor</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Género</label>
              <input value={genre} onChange={(e) => setGenre(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Páginas</label>
              <input type="number" min={0} value={pages} onChange={(e) => setPages(Math.max(0, parseInt(e.target.value) || 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Moods (comas)</label>
              <input value={moodsInput} onChange={(e) => setMoodsInput(e.target.value)} placeholder="mágico, oscuro" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Saga</label>
              <input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} placeholder="Ej. Harry Potter" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Índice en saga</label>
              <input type="number" min={0} value={seriesIndex} onChange={(e) => setSeriesIndex(e.target.value !== "" ? Math.max(0, parseInt(e.target.value) || 0) : "")} placeholder="Ej. 1" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>URL de portada</label>
            <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sinopsis</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} italic min-h-[100px]`} placeholder="Breve descripción..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 bg-background border border-border py-3 font-mono-label hover:bg-muted transition-all rounded-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 bg-foreground text-background py-3 font-mono-label hover:opacity-90 transition-all flex items-center justify-center gap-2 rounded-sm">
              <Save className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}