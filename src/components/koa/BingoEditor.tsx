import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ErrorNotice } from "./UI";
import { blankCell, type BingoDraft, type BingoCell } from "@/lib/bingo";
import { saveBingo } from "@/lib/bingo-data";
import { userError } from "@/lib/koa-data";
import { Save } from "lucide-react";

export function BingoEditor({ initial, id, onClose, onSaved }: { initial: BingoDraft; id?: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changeCell = (index: number, patch: Partial<BingoCell>) => setDraft((old) => ({ ...old, cells: old.cells.map((cell, i) => i === index ? { ...cell, ...patch } : cell) }));
  return <Modal title={id ? "Editar borrador" : "Crear aventura"} onClose={() => { if (!busy) onClose(); }}>
    <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      try { await saveBingo(draft, id); await onSaved(); onClose(); } catch (e) { setError(userError(e)); } finally { setBusy(false); }
    }}>
      <label className="block">Título<input className="koa-field" required maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">Propósito<textarea className="koa-field" maxLength={1200} value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} /></label>
      <fieldset><legend className="mb-2">Tamaño del bingo</legend><div className="flex gap-2">{([3, 4, 5] as const).map((size) => <Button key={size} type="button" variant={draft.size === size ? "default" : "secondary"} aria-pressed={draft.size === size} onClick={() => setDraft({ ...draft, size, cells: Array.from({ length: size * size }, (_, i) => draft.cells[i] ?? blankCell()) })}>{size} × {size}</Button>)}</div></fieldset>
      <div className="grid sm:grid-cols-2 gap-3">
        <label>Inicio opcional<input type="date" className="koa-field" value={draft.starts_on ?? ""} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value || null })} /></label>
        <label>Final opcional<input type="date" className="koa-field" min={draft.starts_on ?? undefined} value={draft.ends_on ?? ""} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value || null })} /></label>
      </div>
      <label className="flex items-center gap-3"><input type="checkbox" checked={draft.allow_reuse} onChange={(e) => setDraft({ ...draft, allow_reuse: e.target.checked })} />Permitir un libro en varias casillas</label>
      <div className="space-y-4">{draft.cells.map((cell, i) => <fieldset key={i} className="border-t border-border pt-4 space-y-3"><legend className="font-semibold">Casilla {i + 1}</legend>
        <label className="block">Tipo<select className="koa-field" value={cell.kind} onChange={(e) => changeCell(i, { kind: e.target.value === "experience" ? "experience" : "book" })}><option value="book">Lectura completada</option><option value="experience">Pequeña experiencia</option></select></label>
        <label className="block">Nombre de la casilla<input className="koa-field" required maxLength={200} value={cell.label} onChange={(e) => changeCell(i, { label: e.target.value })} /></label>
        {cell.kind === "book" && <><label className="block">Condición<select className="koa-field" value={cell.condition} onChange={(e) => {
          const parsed = e.target.value;
          if (parsed === "any" || parsed === "genre" || parsed === "author" || parsed === "max_pages") changeCell(i, { condition: parsed, value: parsed === "max_pages" ? "250" : "" });
        }}><option value="any">Un libro a mi elección</option><option value="genre">Género exacto</option><option value="author">Autor exacto</option><option value="max_pages">Máximo de páginas</option></select></label>
        {cell.condition !== "any" && <label className="block">{cell.condition === "max_pages" ? "Número máximo de páginas" : "Valor exacto en tu biblioteca"}<input className="koa-field" required maxLength={160} inputMode={cell.condition === "max_pages" ? "numeric" : "text"} value={cell.value} onChange={(e) => changeCell(i, { value: e.target.value })} /></label>}</>}
      </fieldset>)}</div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}><Save />{busy ? "Guardando…" : "Guardar borrador"}</Button></div>
    </form>
  </Modal>;
}