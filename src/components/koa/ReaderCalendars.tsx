import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { calendarState, prepareCalendar, revealWindow, saveDiscovery } from "@/lib/calendars.functions";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Loading, Modal } from "./UI";
import { BookCover } from "@/components/BookCover";
import { userError } from "@/lib/koa-data";
import { monthlyTasks } from "@/lib/reader-discoveries";
import { Gift, RefreshCw, Bookmark } from "lucide-react";

export function ReaderCalendars() {
  const [kind, setKind] = useState<"advent" | "monthly">("advent");
  const [request, setRequest] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [slot, setSlot] = useState<number>();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric" }).format(new Date()));
  const read = useServerFn(calendarState); const prepare = useServerFn(prepareCalendar); const reveal = useServerFn(revealWindow); const save = useServerFn(saveDiscovery);
  const query = useQuery({ queryKey: ["reader-calendar", kind, year, zone], queryFn: () => read({ data: { kind, year, zone } }) });
  async function act(fn: () => Promise<void>) { setBusy(true); setError(""); setNotice(""); try { await fn(); await query.refetch(); } catch (e) { setError(userError(e)); } finally { setBusy(false); } }
  const state = query.data;
  const entry = state?.entries.find((e) => e.slot === slot);
  const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2026, i, 1)));
  return <section className="border-t border-border py-8 mb-8"><div className="flex flex-wrap gap-3 mb-5"><Button variant={kind === "advent" ? "default" : "secondary"} aria-pressed={kind === "advent"} onClick={() => { setKind("advent"); setSlot(undefined); }}>Adviento</Button><Button variant={kind === "monthly" ? "default" : "secondary"} aria-pressed={kind === "monthly"} onClick={() => { setKind("monthly"); setSlot(undefined); }}>12 capítulos del año</Button><Link className="koa-secondary" to="/lists">Mis listas</Link></div>
    <h2>{kind === "advent" ? `24 descubrimientos para tus lecturas de ${year + 1}` : `Mis doce capítulos de ${year}`}</h2><p className="koa-muted my-4">{kind === "advent" ? "Libros distintos que aún no están en tu biblioteca ni en tus deseos. No tienes que terminar un libro cada día." : "Una lectura y una pequeña propuesta por mes, a tu ritmo. Puedes cambiar las sugerencias."}</p>
    {kind === "advent" && state?.local.month !== 12 && <p className="koa-message mb-4">Preparación para diciembre. Las ventanas se abrirán del 1 al 24 según tu fecha local; podrás ponerte al día hasta el 31.</p>}
    <label className="block my-3">¿Qué te apetece descubrir?<input className="koa-field" maxLength={1500} value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Mis próximos mundos, autores y sensaciones…" /></label>
    <Button disabled={busy} onClick={() => act(async () => { await prepare({ data: { kind, year, zone, request } }); setNotice("Calendario preparado con libros verificados."); })}><Gift />{busy ? "Koa está buscando en los catálogos…" : `Preparar ${kind === "advent" ? "mis 24 ventanas" : "mis capítulos"}`}</Button>
    {state && <p className="koa-muted mt-3">{state.ready} / {kind === "advent" ? 24 : 12} descubrimientos preparados</p>}{error && <ErrorNotice>{error}</ErrorNotice>}{query.error && <ErrorNotice>{userError(query.error)}</ErrorNotice>}{notice && <p role="status" className="my-4">{notice}</p>}{query.isLoading && <Loading />}
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 my-6">{Array.from({ length: kind === "advent" ? 24 : 12 }, (_, i) => i + 1).map((number) => { const opened = state?.entries.find((e) => e.slot === number); const unlocked = kind === "monthly" || !!state && state.local.month === 12 && state.local.year === year && state.local.day >= number; return <Button variant="secondary" key={number} className="h-auto min-h-28 flex flex-col whitespace-normal break-words px-2" disabled={busy || !state?.calendar || !unlocked || state.ready === 0} onClick={() => act(async () => { if (kind === "advent" && !opened) { await reveal({ data: { calendar: state?.calendar?.id ?? "", slot: number, zone } }); } setSlot(number); })}><span className="text-lg text-primary">{kind === "advent" ? number : months[number - 1]}</span><span className="text-xs">{opened ? opened.title : unlocked ? "Por descubrir" : "En diciembre"}</span></Button>; })}</div>
    {kind === "monthly" && <div className="grid sm:grid-cols-2 gap-3">{monthlyTasks.map((task, i) => <p key={task} className="koa-muted">{months[i]} · {task}</p>)}</div>}
    {slot && entry && state?.calendar && <Modal title={entry.title} onClose={() => { if (!busy) setSlot(undefined); }}><div className="flex gap-4 my-5"><BookCover book={entry} className="w-24 h-36 shrink-0" /><div><p>{entry.author}</p><p className="koa-muted mt-3">{entry.description || "Sin sinopsis disponible en el catálogo."}</p><p className="koa-muted mt-2">{entry.isbn ? `ISBN ${entry.isbn}` : entry.catalog_id}</p></div></div>{entry.task && <p className="koa-message my-4">{entry.task}</p>}{error && <ErrorNotice>{error}</ErrorNotice>}<div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => act(async () => { await save({ data: { calendar: state.calendar?.id ?? "", slot } }); setNotice(`Guardado en deseos y Lecturas para ${kind === "advent" ? year + 1 : year}.`); })}><Bookmark />{entry.saved_wish_id ? "Guardado · guardar de nuevo" : "Guardar en deseos y lista"}</Button>{kind === "monthly" && <Button variant="secondary" disabled={busy} onClick={() => act(async () => { await prepare({ data: { kind, year, zone, request, replace: slot } }); })}><RefreshCw />Otra sugerencia</Button>}</div>{notice && <p role="status" className="mt-4">{notice}</p>}</Modal>}
  </section>;
}