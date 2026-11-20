import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, CalendarHeart, Grid3x3, ImageUp, PenLine, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/koa/UI";
import { BingoEditor } from "@/components/koa/BingoEditor";
import { BingoBoardCard } from "@/components/koa/BingoBoard";
import { ReaderCalendars } from "@/components/koa/ReaderCalendars";
import { SharedAdventures, useSharedBingos } from "@/components/koa/SharedAdventures";
import { BingoImageImport } from "@/components/koa/CreativeBingo";
import { sharedOptions } from "@/lib/social-data";
import { bingoTemplates, newDraft, type BingoDraft } from "@/lib/bingo";
import { bingoQueryOptions, bingoProgressQueryOptions } from "@/lib/bingo-data";
import { getBooks } from "@/lib/koa-data";
import { Link } from "@tanstack/react-router";
import { usePlan } from "@/hooks/use-plan";

const booksOptions = { queryKey: ["koa-books"], queryFn: getBooks };
type Tab = "bingos" | "start" | "calendars" | "shared";

export const Route = createFileRoute("/_authenticated/adventures")({
  head: () => ({
    meta: [
      { title: "Aventuras con Koa — Lee con Koa" },
      { name: "description", content: "Bingos lectores, calendarios de descubrimientos y retos opcionales, a tu ritmo." },
      { property: "og:title", content: "Aventuras con Koa — Lee con Koa" },
      { property: "og:description", content: "Bingos personales, Adviento lector y un año de lecturas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(bingoQueryOptions),
      context.queryClient.ensureQueryData(bingoProgressQueryOptions),
      context.queryClient.ensureQueryData(booksOptions),
      context.queryClient.ensureQueryData(sharedOptions),
    ]);
  },
  component: Adventures,
});

function Adventures() {
  const { data: boards, refetch } = useSuspenseQuery(bingoQueryOptions);
  const { data: progress, refetch: refetchProgress } = useSuspenseQuery(bingoProgressQueryOptions);
  const { data: books } = useSuspenseQuery(booksOptions);
  const shared = useSharedBingos();
  const { isFree } = usePlan();
  const proLink = <Link to="/pro" className="koa-button mt-auto w-fit">Con Lee con Koa Pro</Link>;
  const [tab, setTab] = useState<Tab>(boards.length ? "bingos" : "start");
  const [editor, setEditor] = useState<{ initial: BingoDraft; id?: string; review?: boolean }>();
  async function refresh() {
    await Promise.all([refetch(), refetchProgress()]);
  }
  const active = boards.filter((b) => b.state === "active");
  const drafts = boards.filter((b) => b.state === "draft");

  const tabs: { id: Tab; label: string; icon: ReactNode; count?: number }[] = [
    { id: "bingos", label: "Mis bingos", icon: <Grid3x3 size={16} />, count: boards.length },
    { id: "start", label: "Empezar uno nuevo", icon: <Plus size={16} /> },
    { id: "calendars", label: "Calendarios", icon: <CalendarHeart size={16} /> },
    { id: "shared", label: "Compartidas", icon: <Users size={16} />, count: shared.length || undefined },
  ];

  return (
    <>
      <PageTitle eyebrow="Retos opcionales, a tu ritmo" title="Aventuras con Koa" actions={isFree ? undefined : <Button onClick={() => setEditor({ initial: newDraft() })}><Plus />Crear bingo</Button>}>
        Bingos y calendarios para elegir, disfrutar y seguir leyendo. Las experiencias son opcionales y nunca cuentan como días de lectura.
      </PageTitle>

      <div className="adv-tabs" role="tablist" aria-label="Secciones de Aventuras">
        {tabs.map((t) => (
          <button key={t.id} id={`adv-tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`adv-panel-${t.id}`} className="adv-tab" onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="adv-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div id={`adv-panel-${tab}`} role="tabpanel" aria-labelledby={`adv-tab-${tab}`}>
        {tab === "bingos" &&
          (boards.length ? (
            <div className="space-y-10">
              {active.length > 0 && (
                <section className="space-y-5">
                  <div className="adv-section-head"><h2 className="text-xl font-bold">En marcha <span className="koa-muted font-normal text-sm">· {active.length}</span></h2></div>
                  {active.map((board) => <BingoBoardCard key={board.id} board={board} progress={progress} books={books} refresh={refresh} edit={(initial, id) => setEditor({ initial, id })} />)}
                </section>
              )}
              {drafts.length > 0 && (
                <section className="space-y-5">
                  <div className="adv-section-head"><h2 className="text-xl font-bold">Borradores <span className="koa-muted font-normal text-sm">· {drafts.length}</span></h2></div>
                  {drafts.map((board) => <BingoBoardCard key={board.id} board={board} progress={progress} books={books} refresh={refresh} edit={(initial, id) => setEditor({ initial, id })} />)}
                </section>
              )}
              <div className="adv-whisper">
                <img src="/koa/meditate.webp" alt="" />
                <div>
                  <p className="label">Cómo se completan</p>
                  <p>Las casillas de lectura se completan con un libro que hayas terminado. Puedes reservar uno mientras lo lees. Las experiencias las marcas tú.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="koa-empty">
              <img src="/koa/read.webp" alt="" className="w-32 mx-auto" />
              <h2 className="text-xl font-bold mt-2">Tu primera aventura te espera</h2>
              <p className="koa-muted mt-2">Elige un bingo de Koa, crea el tuyo o súbelo desde una imagen.</p>
              <Button className="mt-5" onClick={() => setTab("start")}><Sparkles />Empezar una aventura</Button>
            </div>
          ))}

        {tab === "start" && (
          <div className="space-y-10">
            <div className="grid md:grid-cols-3 gap-4">
              <article className="adv-pebble">
                <div className="adv-start">
                  <span className="glyph"><BookOpen /></span>
                  <h2 className="text-lg font-bold">Un bingo de Koa</h2>
                  <p className="koa-muted text-sm">Cinco tableros originales para distintos momentos. Puedes ajustarlos antes de empezar.{isFree ? " Con el plan gratis tienes uno." : ""}</p>
                  <a href="#plantillas" className="koa-secondary mt-auto w-fit">Ver los bingos de Koa</a>
                </div>
              </article>
              <article className="adv-pebble">
                <div className="adv-start">
                  <span className="glyph ember"><PenLine /></span>
                  <h2 className="text-lg font-bold">Crear el mío</h2>
                  <p className="koa-muted text-sm">Título, propósito, casillas de lectura o de experiencias, fechas opcionales y tamaño de 3×3 a 5×5.</p>
                  {isFree ? proLink : <Button className="mt-auto w-fit" onClick={() => setEditor({ initial: newDraft() })}><Plus />Crear desde cero</Button>}
                </div>
              </article>
              <article className="adv-pebble">
                <div className="adv-start">
                  <span className="glyph mint"><ImageUp /></span>
                  <h2 className="text-lg font-bold">Desde una imagen</h2>
                  <p className="koa-muted text-sm">Sube la foto de un bingo. Koa lee las casillas y tú las revisas antes de guardar.</p>
                  {isFree ? proLink : <div className="mt-auto"><BingoImageImport review={(initial) => setEditor({ initial, review: true })} /></div>}
                </div>
              </article>
            </div>

            <section id="plantillas" className="scroll-mt-24">
              <div className="adv-section-head">
                <div>
                  <p className="koa-eyebrow">Bingos de Koa</p>
                  <h2 className="text-xl font-bold">Elige un propósito</h2>
                </div>
                <p className="koa-muted text-xs inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: "oklch(0.71 0.15 278 / 0.45)" }} />Lectura</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: "oklch(0.83 0.14 75 / 0.55)" }} />Experiencia</span>
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bingoTemplates.map((template) => {
                  const experiences = template.cells.filter((c) => c.kind === "experience").length;
                  return (
                    <article className="adv-pebble flex flex-col gap-3" key={template.title}>
                      <div className="flex items-start gap-4">
                        <div className="adv-mini" style={{ gridTemplateColumns: `repeat(${template.size}, 1fr)` }} aria-hidden="true">
                          {template.cells.map((c, i) => <span key={i} className={c.kind === "experience" ? "exp" : ""} />)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold">{template.title}</h3>
                          <p className="koa-muted text-xs mt-1">{template.size}×{template.size} · {template.cells.length - experiences} lecturas · {experiences} experiencias</p>
                        </div>
                      </div>
                      <p className="koa-muted text-sm">{template.purpose}</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {template.cells.slice(0, 3).map((c, i) => <li key={i}>· {c.label}</li>)}
                      </ul>
                      <Button variant="secondary" className="mt-auto w-fit" onClick={() => setEditor({ initial: structuredClone(template) })}>Usar este bingo</Button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "calendars" && <ReaderCalendars />}
        {tab === "shared" && <SharedAdventures joined={() => setTab("bingos")} />}
      </div>

      {editor && (
        <BingoEditor
          {...editor}
          onSaved={async () => {
            await refresh();
            setTab("bingos");
          }}
          onClose={() => setEditor(undefined)}
        />
      )}
    </>
  );
}
