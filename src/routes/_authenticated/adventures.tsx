import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Play, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTitle, ErrorNotice, Empty, Modal, Koa } from "@/components/koa/UI";
import { BingoEditor } from "@/components/koa/BingoEditor";
import { ReaderCalendars } from "@/components/koa/ReaderCalendars";
import { SharedAdventures } from "@/components/koa/SharedAdventures";
import { sharedOptions } from "@/lib/social-data";
import { bingoTemplates, newDraft, matchesCell, type BingoDraft } from "@/lib/bingo";
import { bingoQueryOptions, bingoProgressQueryOptions } from "@/lib/bingo-data";
import { getBooks, userError, koaDb } from "@/lib/koa-data";

const booksOptions = { queryKey: ["koa-books"], queryFn: getBooks };
export const Route = createFileRoute("/_authenticated/adventures")({
  head: () => ({ meta: [
    { title: "Aventuras lectoras — Lee con Koa" },
    { name: "description", content: "Crea bingos privados y acompaña tus lecturas con pequeñas experiencias a tu ritmo." },
    { property: "og:title", content: "Tus aventuras lectoras — Lee con Koa" },
    { property: "og:description", content: "Bingos personales con lecturas y pequeñas experiencias." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(bingoQueryOptions), context.queryClient.ensureQueryData(bingoProgressQueryOptions), context.queryClient.ensureQueryData(booksOptions), context.queryClient.ensureQueryData(sharedOptions)]); },
  component: Adventures,
});
function Adventures() {
  const { data: boards, refetch } = useSuspenseQuery(bingoQueryOptions);
  const { data: progress, refetch: refetchProgress } = useSuspenseQuery(bingoProgressQueryOptions);
  const { data: books } = useSuspenseQuery(booksOptions);
  const [editor, setEditor] = useState<{ initial: BingoDraft; id?: string }>();
  const [selected, setSelected] = useState<{ board: typeof boards[number]; index: number }>();
  const [bookId, setBookId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string>();
  async function refresh() { await Promise.all([refetch(), refetchProgress()]); }
  async function action(fn: () => Promise<void>) { setBusy(true); setError(""); try { await fn(); await refresh(); } catch (e) { setError(userError(e)); } finally { setBusy(false); } }
  async function saveCell(complete: boolean) {
    if (!selected) return;
    await action(async () => {
      const { error } = await koaDb.rpc("set_bingo_cell", { p_board: selected.board.id, p_index: selected.index, p_book: bookId || null, p_complete: complete });
      if (error) throw error;
      setSelected(undefined);
    });
  }
  return <>
    <PageTitle eyebrow="Historias y pequeños momentos" title="Mis aventuras" actions={<Button onClick={() => setEditor({ initial: newDraft() })}><Plus />Crear bingo</Button>}>Un libro a la vez. Las experiencias son opcionales y no suman días de lectura.</PageTitle>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    <ReaderCalendars />
    <SharedAdventures />
    <section className="mb-10"><h2 className="mb-4">Una aventura para empezar</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{bingoTemplates.map((template) => <article className="koa-card" key={template.title}><p className="koa-eyebrow">Plantilla original · 3 × 3</p><h3 className="text-lg font-semibold">{template.title}</h3><p className="koa-muted my-3">{template.purpose}</p><Button variant="secondary" onClick={() => setEditor({ initial: structuredClone(template) })}>Personalizar</Button></article>)}</div></section>
    <section><h2 className="mb-5">Mis bingos y mi progreso</h2>{!boards.length && <Empty title="Tu primera aventura te espera">Elige una plantilla o crea tu propio bingo.</Empty>}
      <div className="space-y-8">{boards.map((board) => {
        const completed = progress.filter((p) => p.board_id === board.id && p.completed_at).length;
        return <article className="border-t border-border pt-6" key={board.id}>
          <div className="flex flex-wrap justify-between gap-4 mb-4"><div><p className="koa-eyebrow">{board.state === "draft" ? "Borrador" : `${completed} / ${board.size * board.size} casillas`} · Privado</p><h3 className="text-xl font-semibold break-words">{board.title}</h3><p className="koa-muted mt-2 break-words">{board.purpose}</p><p className="koa-muted mt-1">{board.starts_on ?? "Sin fecha de inicio"} · {board.ends_on ?? "Sin fecha límite"} · {board.allow_reuse ? "Se pueden repetir libros" : "Sin repetir libros"}</p></div>
          {board.state === "draft" && <div className="flex gap-2 items-start"><Button variant="secondary" aria-label={`Editar ${board.title}`} title="Editar borrador" onClick={() => setEditor({ initial: board, id: board.id })}><Pencil /></Button><Button variant="secondary" aria-label={`Eliminar ${board.title}`} title="Eliminar borrador" onClick={() => setDeleting(board.id)}><Trash2 /></Button><Button disabled={busy} onClick={() => action(async () => { const { error } = await supabase.from("reader_bingos").update({ state: "active" }).eq("id", board.id); if (error) throw error; })}><Play />Activar</Button></div>}</div>
          <div className={`bingo-grid bingo-grid-${board.size}`}>{board.cells.map((cell, index) => {
            const saved = progress.find((p) => p.board_id === board.id && p.cell_index === index);
            const assigned = books.find((b) => b.id === saved?.book_id);
            return <Button variant="secondary" className="bingo-cell" key={index} disabled={board.state === "draft" || busy} onClick={() => { setError(""); setSelected({ board, index }); setBookId(saved?.book_id ?? ""); }}>
              <span className="text-primary">{saved?.completed_at ? <Check size={20} /> : cell.kind === "book" ? <BookOpen size={20} /> : <span aria-hidden="true">{index + 1}</span>}</span><span className="font-semibold">{cell.label}</span><span className="text-xs text-muted-foreground">{saved?.completed_at ? "Completada" : assigned?.title ?? (cell.kind === "book" ? "Lectura" : "Experiencia")}</span>
            </Button>;
          })}</div>
        </article>;
      })}</div>
    </section>
    <aside className="koa-message mt-8"><Koa pose="meditate" className="w-20" /><p>Las casillas de lectura se completan con tu historial real. Puedes cambiar de libro antes de completarlas; una aventura activa conserva sus condiciones.</p></aside>
    {editor && <BingoEditor {...editor} onSaved={refresh} onClose={() => setEditor(undefined)} />}
    {deleting && <Modal title="¿Eliminar este borrador?" onClose={() => { if (!busy) setDeleting(undefined); }}><p className="my-4">Esta acción elimina el borrador, no tus libros ni tu historial.</p><div className="flex gap-3"><Button variant="secondary" disabled={busy} onClick={() => setDeleting(undefined)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => action(async () => { const { error } = await supabase.from("reader_bingos").delete().eq("id", deleting); if (error) throw error; setDeleting(undefined); })}>Eliminar borrador</Button></div></Modal>}
    {selected && <Modal title={selected.board.cells[selected.index]?.label ?? "Casilla"} onClose={() => { if (!busy) setSelected(undefined); }}>
      {selected.board.cells[selected.index]?.kind === "book" ? <label className="block my-5">Libro de mi biblioteca<select className="koa-field" value={bookId} onChange={(e) => setBookId(e.target.value)}><option value="">Sin asignar</option>{books.filter((b) => matchesCell(b, selected.board.cells[selected.index])).map((b) => <option key={b.id} value={b.id}>{b.title} · {b.author}</option>)}</select></label> : <p className="koa-muted my-5">Completar esta experiencia no registra lectura ni aumenta tu racha.</p>}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <div className="flex flex-wrap gap-3">{selected.board.cells[selected.index]?.kind === "book" && <Button variant="secondary" disabled={busy} onClick={() => saveCell(false)}>Guardar asignación</Button>}<Button disabled={busy} onClick={() => saveCell(true)}><Check />Completar</Button><Button variant="secondary" disabled={busy} onClick={() => { setBookId(""); void action(async () => { const { error } = await koaDb.rpc("set_bingo_cell", { p_board: selected.board.id, p_index: selected.index, p_book: null, p_complete: false }); if (error) throw error; setSelected(undefined); }); }}>Limpiar casilla</Button></div>
    </Modal>}
  </>;
}