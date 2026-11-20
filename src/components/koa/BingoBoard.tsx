import { useId, useState } from "react";
import { BookOpen, Calendar, Check, Lock, Pencil, Play, Repeat, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ErrorNotice, Modal } from "./UI";
import { CellOracle } from "./CreativeBingo";
import { completedLines, describeCell, matchesCell, type BingoDraft } from "@/lib/bingo";
import type { getBingoProgress, getBingos } from "@/lib/bingo-data";
import { koaDb, userError } from "@/lib/koa-data";
import type { Book } from "@/types";

export type Board = Awaited<ReturnType<typeof getBingos>>[number];
export type CellProgress = Awaited<ReturnType<typeof getBingoProgress>>[number];

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });

export function BingoBoardCard({ board, progress, books, refresh, edit }: { board: Board; progress: CellProgress[]; books: Book[]; refresh: () => Promise<void>; edit: (draft: BingoDraft, id: string) => void }) {
  const [selected, setSelected] = useState<number>();
  const [confirm, setConfirm] = useState<"activate" | "delete">();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = board.size * board.size;
  const rows = progress.filter((p) => p.board_id === board.id);
  const done = new Set(rows.filter((p) => p.completed_at).map((p) => p.cell_index));
  const lines = completedLines(board.size, done);
  const inLine = new Set(lines.flat());
  const draft = board.state === "draft";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      setConfirm(undefined);
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="adv-pebble">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-3">
            {draft ? <span className="adv-chip ember"><Pencil size={12} /> Borrador</span> : <span className="adv-chip mint"><Play size={12} /> Activo</span>}
            <span className="adv-chip"><Lock size={12} /> Privado</span>
            {lines.length > 0 && <span className="adv-chip mint">¡{lines.length} {lines.length === 1 ? "línea" : "líneas"}!</span>}
          </div>
          <h3 className="text-xl font-bold break-words">{board.title}</h3>
          {board.purpose && <p className="koa-muted mt-1 break-words">{board.purpose}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar size={13} />{board.starts_on || board.ends_on ? `${board.starts_on ? day(board.starts_on) : "Sin inicio"} – ${board.ends_on ? day(board.ends_on) : "sin final"}` : "Sin fechas"}</span>
            <span className="inline-flex items-center gap-1"><Repeat size={13} />{board.allow_reuse ? "Un libro puede valer por varias casillas" : "Un libro por casilla"}</span>
          </div>
          {board.source_credit && <p className="koa-muted text-xs mt-2">Fuente: {board.source_credit}</p>}
        </div>
        {draft && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => edit(board, board.id)}><Pencil />Editar</Button>
            <Button variant="secondary" size="sm" aria-label={`Eliminar ${board.title}`} onClick={() => setConfirm("delete")}><Trash2 /></Button>
            <Button size="sm" onClick={() => setConfirm("activate")}><Play />Activar</Button>
          </div>
        )}
      </div>

      {!draft && (
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-2"><span className="font-semibold">{done.size} de {total} casillas</span><span className="koa-muted">{Math.round((100 * done.size) / total)}%</span></div>
          <div className="adv-meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done.size} aria-label="Progreso del bingo"><span style={{ width: `${(100 * done.size) / total}%` }} /></div>
        </div>
      )}
      {draft && <p className="koa-muted text-sm mb-4">Revisa las casillas y pulsa «Activar» para empezar a completarlas.</p>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className={`adv-board s${board.size}`}>
        {board.cells.map((cell, index) => {
          const saved = rows.find((p) => p.cell_index === index);
          const book = books.find((b) => b.id === saved?.book_id);
          const isDone = done.has(index);
          const status = isDone ? (book ? `Hecha · ${book.title}` : "Hecha") : book ? `Con ${book.title}` : describeCell(cell);
          return (
            <button
              key={index}
              type="button"
              disabled={draft || busy}
              aria-label={`${cell.label}. ${status}`}
              className={`adv-cell ${cell.kind === "experience" ? "experience" : ""} ${isDone ? "done" : ""} ${inLine.has(index) ? "line" : ""} ${book && !isDone ? "assigned" : ""}`}
              onClick={() => { setError(""); setSelected(index); }}
            >
              <span className="icon">{isDone ? <Check size={15} /> : cell.kind === "experience" ? <Sparkles size={14} /> : <BookOpen size={14} />}</span>
              <span className="title">{cell.label}</span>
              <span className="meta">{status}</span>
            </button>
          );
        })}
      </div>

      {selected !== undefined && board.cells[selected] && (
        <CellDialog key={selected} board={board} index={selected} saved={rows.find((p) => p.cell_index === selected)} books={books} refresh={refresh} onClose={() => setSelected(undefined)} />
      )}
      {confirm === "delete" && (
        <Modal title="¿Eliminar este borrador?" onClose={() => { if (!busy) setConfirm(undefined); }}>
          <p className="my-2">Se borra el bingo «{board.title}». Tus libros y tu historial no cambian.</p>
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(undefined)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy} onClick={() => run(async () => { const { error } = await supabase.from("reader_bingos").delete().eq("id", board.id); if (error) throw error; })}>Eliminar borrador</Button>
          </div>
        </Modal>
      )}
      {confirm === "activate" && (
        <Modal title="¿Activar esta aventura?" onClose={() => { if (!busy) setConfirm(undefined); }}>
          <p className="my-2">Al activarla podrás completar casillas. Las casillas y sus condiciones quedan fijas para que tu progreso siempre signifique lo mismo.</p>
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(undefined)}>Seguir editando</Button>
            <Button disabled={busy} onClick={() => run(async () => { const { error } = await supabase.from("reader_bingos").update({ state: "active" }).eq("id", board.id).eq("state", "draft"); if (error) throw error; })}><Play />Activar y empezar</Button>
          </div>
        </Modal>
      )}
    </article>
  );
}

function CellDialog({ board, index, saved, books, refresh, onClose }: { board: Board; index: number; saved?: CellProgress; books: Book[]; refresh: () => Promise<void>; onClose: () => void }) {
  const uid = useId();
  const cell = board.cells[index];
  const [bookId, setBookId] = useState(saved?.book_id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isDone = Boolean(saved?.completed_at);
  const matching = books.filter((b) => matchesCell(b, cell));
  const finished = matching.filter((b) => b.status === "READ" || b.reading_cycle > 1);
  const pending = matching.filter((b) => !finished.includes(b));
  const chosen = books.find((b) => b.id === bookId);
  const chosenFinished = chosen ? finished.includes(chosen) : false;

  async function setCell(book: string | null, complete: boolean) {
    setBusy(true);
    setError("");
    try {
      const { error } = await koaDb.rpc("set_bingo_cell", { p_board: board.id, p_index: index, p_book: book, p_complete: complete });
      if (error) throw error;
      await refresh();
      onClose();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={cell.label} onClose={() => { if (!busy) onClose(); }}>
      <p className="koa-muted text-sm -mt-2 mb-4">{describeCell(cell)}</p>
      {isDone ? (
        <div className="adv-whisper mb-4" style={{ borderColor: "oklch(0.8 0.13 180 / 0.35)", background: "oklch(0.8 0.13 180 / 0.06)" }}>
          <Check className="shrink-0" style={{ color: "var(--adv-mint)" }} />
          <p>
            Casilla completada{saved?.completed_at ? ` el ${new Date(saved.completed_at).toLocaleDateString("es", { day: "numeric", month: "long" })}` : ""}
            {chosen ? ` con «${chosen.title}».` : "."}
          </p>
        </div>
      ) : cell.kind === "book" ? (
        <div className="space-y-4">
          <div>
            <label htmlFor={`${uid}-book`} className="koa-label">Libro de mi biblioteca</label>
            <select id={`${uid}-book`} className="koa-field" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">Sin asignar</option>
              {finished.length > 0 && <optgroup label="Terminados">{finished.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.author}</option>)}</optgroup>}
              {pending.length > 0 && <optgroup label="Por terminar">{pending.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.author}</option>)}</optgroup>}
            </select>
            {!matching.length && <p className="koa-muted text-xs mt-2">Ningún libro de tu biblioteca cumple esta condición todavía. Pide ideas al Oráculo abajo.</p>}
            {chosen && !chosenFinished && <p className="koa-muted text-xs mt-2">Puedes reservar este libro para la casilla. Se completa cuando lo termines.</p>}
            {(board.starts_on || board.ends_on) && <p className="koa-muted text-xs mt-2">Solo cuenta si lo terminas dentro de las fechas del bingo.</p>}
          </div>
          <CellOracle board={board.id} index={index} assign={setBookId} />
        </div>
      ) : (
        <p className="koa-muted mb-4">Márcala cuando la hayas vivido. Las experiencias no registran lectura ni cambian tu racha.</p>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <div className="flex flex-wrap gap-3 mt-5">
        {isDone ? (
          <Button variant="secondary" disabled={busy} onClick={() => setCell(null, false)}><Undo2 />Deshacer casilla</Button>
        ) : cell.kind === "book" ? (
          <>
            <Button disabled={busy || !chosenFinished} title={chosenFinished ? undefined : "Elige un libro terminado"} onClick={() => setCell(bookId, true)}><Check />Completar con este libro</Button>
            <Button variant="secondary" disabled={busy || bookId === (saved?.book_id ?? "")} onClick={() => setCell(bookId || null, false)}>{bookId ? "Reservar para esta casilla" : "Quitar libro"}</Button>
          </>
        ) : (
          <Button disabled={busy} onClick={() => setCell(null, true)}><Check />Marcar como vivida</Button>
        )}
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}
