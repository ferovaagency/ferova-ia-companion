import { useId, useState } from "react";
import { BookOpen, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ErrorNotice } from "./UI";
import { blankCell, describeCell, type BingoDraft, type BingoCell } from "@/lib/bingo";
import { saveBingo } from "@/lib/bingo-data";
import { userError } from "@/lib/koa-data";

type Props = {
  initial: BingoDraft;
  id?: string;
  review?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function BingoEditor({ initial, id, review = false, onClose, onSaved }: Props) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const [draft, setDraft] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(!review);
  const cell = draft.cells[selected] ?? draft.cells[0];
  const changeCell = (index: number, patch: Partial<BingoCell>) =>
    setDraft((old) => ({ ...old, cells: old.cells.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));
  const resize = (size: 3 | 4 | 5) => {
    setDraft((old) => ({ ...old, size, cells: Array.from({ length: size * size }, (_, i) => old.cells[i] ?? blankCell()) }));
    setSelected((s) => Math.min(s, size * size - 1));
  };
  const experiences = draft.cells.filter((c) => c.kind === "experience").length;

  return (
    <Modal wide title={id ? "Editar borrador" : review ? "Revisar bingo importado" : "Crear mi bingo"} onClose={() => { if (!busy) onClose(); }}>
      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (!reviewed) throw new Error("Revisa todas las casillas y confirma el borrador.");
            const empty = draft.cells.findIndex((c) => !c.label.trim());
            if (empty >= 0) {
              setSelected(empty);
              throw new Error(`La casilla ${empty + 1} necesita un texto.`);
            }
            await saveBingo(draft, id);
            await onSaved();
            onClose();
          } catch (e) {
            setError(userError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={f("title")} className="koa-label">Título</label>
            <input id={f("title")} className="koa-field" required maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label htmlFor={f("purpose")} className="koa-label">Propósito <span className="opacity-70">(para qué es esta aventura)</span></label>
            <textarea id={f("purpose")} className="koa-field min-h-24" maxLength={1200} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} placeholder="Ej. Volver a leer sin prisas, un capítulo a la vez." />
          </div>
          <fieldset>
            <legend className="koa-label">Tamaño del tablero</legend>
            <div className="flex gap-2">
              {([3, 4, 5] as const).map((size) => (
                <button key={size} type="button" className={`koa-chip ${draft.size === size ? "active" : ""}`} aria-pressed={draft.size === size} onClick={() => resize(size)}>
                  {size} × {size}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={f("start")} className="koa-label">Empieza (opcional)</label>
              <input id={f("start")} type="date" className="koa-field" value={draft.starts_on ?? ""} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value || null })} />
            </div>
            <div>
              <label htmlFor={f("end")} className="koa-label">Termina (opcional)</label>
              <input id={f("end")} type="date" className="koa-field" min={draft.starts_on ?? undefined} value={draft.ends_on ?? ""} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value || null })} />
            </div>
          </div>
          <p className="koa-muted text-xs -mt-2">Si pones fechas, solo cuentan los libros que termines dentro de ese periodo.</p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={draft.allow_reuse} onChange={(e) => setDraft({ ...draft, allow_reuse: e.target.checked })} />
            <span>Un mismo libro puede completar varias casillas</span>
          </label>
          <div>
            <label htmlFor={f("credit")} className="koa-label">Fuente o crédito (opcional)</label>
            <input id={f("credit")} className="koa-field" maxLength={1200} value={draft.source_credit} onChange={(e) => setDraft({ ...draft, source_credit: e.target.value })} placeholder="Ej. Bingo de @club_lector, 2026" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Toca una casilla para editarla</p>
            <div className="flex gap-2">
              <span className="adv-chip lavender"><BookOpen size={12} /> {draft.cells.length - experiences} lecturas</span>
              <span className="adv-chip ember"><Sparkles size={12} /> {experiences} experiencias</span>
            </div>
          </div>
          <div className={`adv-board s${draft.size}`} role="group" aria-label="Casillas del bingo">
            {draft.cells.map((c, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={selected === i}
                aria-label={`Casilla ${i + 1}: ${c.label || "sin texto"}`}
                className={`adv-cell ${c.kind === "experience" ? "experience" : ""} ${selected === i ? "selected" : ""}`}
                onClick={() => setSelected(i)}
              >
                <span className="icon">{c.kind === "experience" ? <Sparkles size={14} /> : <BookOpen size={14} />}</span>
                <span className="title">{c.label || <em className="opacity-60">Sin texto</em>}</span>
              </button>
            ))}
          </div>

          {cell && (
            <fieldset className="adv-pebble space-y-3">
              <legend className="sr-only">Editar casilla {selected + 1}</legend>
              <div className="flex items-center justify-between gap-2">
                <p className="koa-eyebrow mb-0">Casilla {selected + 1}</p>
                <span className="koa-muted text-xs">{describeCell(cell)}</span>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de casilla">
                <button type="button" className={`koa-chip ${cell.kind === "book" ? "active" : ""}`} aria-pressed={cell.kind === "book"} onClick={() => changeCell(selected, { kind: "book" })}>
                  <BookOpen size={14} /> Leer un libro
                </button>
                <button type="button" className={`koa-chip ${cell.kind === "experience" ? "active" : ""}`} aria-pressed={cell.kind === "experience"} onClick={() => changeCell(selected, { kind: "experience", condition: "any", value: "" })}>
                  <Sparkles size={14} /> Una experiencia
                </button>
              </div>
              <div>
                <label htmlFor={f("cell-label")} className="koa-label">Texto de la casilla</label>
                <input id={f("cell-label")} className="koa-field" required maxLength={200} value={cell.label} onChange={(e) => changeCell(selected, { label: e.target.value })} />
              </div>
              {cell.kind === "book" ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={f("cell-condition")} className="koa-label">¿Qué libro vale?</label>
                    <select
                      id={f("cell-condition")}
                      className="koa-field"
                      value={cell.condition}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "any" || v === "genre" || v === "author" || v === "max_pages") changeCell(selected, { condition: v, value: v === "max_pages" ? "250" : "" });
                      }}
                    >
                      <option value="any">Cualquiera que yo elija</option>
                      <option value="genre">De un género</option>
                      <option value="author">De un autor</option>
                      <option value="max_pages">Con un máximo de páginas</option>
                    </select>
                  </div>
                  {cell.condition !== "any" && (
                    <div>
                      <label htmlFor={f("cell-value")} className="koa-label">
                        {cell.condition === "max_pages" ? "Máximo de páginas" : cell.condition === "genre" ? "Género (como aparece en tu biblioteca)" : "Autor (como aparece en tu biblioteca)"}
                      </label>
                      <input id={f("cell-value")} className="koa-field" required maxLength={160} inputMode={cell.condition === "max_pages" ? "numeric" : "text"} value={cell.value} onChange={(e) => changeCell(selected, { value: e.target.value })} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="koa-muted text-sm">Las experiencias las marcas tú cuando las vives. No suman días de lectura ni afectan tu racha.</p>
              )}
              <div className="flex justify-between gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" disabled={selected === 0} onClick={() => setSelected(selected - 1)}>← Anterior</Button>
                <Button type="button" variant="ghost" size="sm" disabled={selected === draft.cells.length - 1} onClick={() => setSelected(selected + 1)}>Siguiente →</Button>
              </div>
            </fieldset>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {review && (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span>He revisado el texto, el tipo y la condición de todas las casillas y el crédito de la fuente.</span>
            </label>
          )}
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy}><Save />{busy ? "Guardando…" : "Guardar borrador"}</Button>
          </div>
          <p className="koa-muted text-xs text-right">Un borrador se puede editar. Cuando lo actives, sus casillas quedan fijas.</p>
        </div>
      </form>
    </Modal>
  );
}
