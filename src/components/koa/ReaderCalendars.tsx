import { useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Bookmark, Check, Footprints, Gift, Loader2, Lock, NotebookPen, RefreshCw, Sparkles } from "lucide-react";
import { calendarState, completeAdventChallenge, prepareCalendar, revealWindow, saveDiscovery } from "@/lib/calendars.functions";
import { ADVENT_BOOK_SLOTS, ADVENT_CHALLENGES, challengeFor, challengeHint } from "@/lib/advent-challenges";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Modal } from "./UI";
import { BookCover } from "@/components/BookCover";
import { userError } from "@/lib/koa-data";
import { monthlyTasks } from "@/lib/reader-discoveries";
import { usePlan } from "@/hooks/use-plan";
import { FREE_LIMITS } from "@/lib/plans";

type Kind = "advent" | "monthly";
const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2026, i, 1)));

function daysUntilDecember(local: { year: number; month: number; day: number }) {
  const today = Date.UTC(local.year, local.month - 1, local.day);
  return Math.round((Date.UTC(local.year, 11, 1) - today) / 86_400_000);
}

export function ReaderCalendars() {
  const uid = useId();
  const [kind, setKind] = useState<Kind>("advent");
  const [direction, setDirection] = useState<"similar" | "different">("similar");
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState<"prepare" | "open" | "save" | "replace" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [slot, setSlot] = useState<number>();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric" }).format(new Date()));
  const read = useServerFn(calendarState);
  const prepare = useServerFn(prepareCalendar);
  const reveal = useServerFn(revealWindow);
  const save = useServerFn(saveDiscovery);
  const complete_ = useServerFn(completeAdventChallenge);
  const [challengeSlot, setChallengeSlot] = useState<number>();
  const query = useQuery({ queryKey: ["reader-calendar", kind, year, zone], queryFn: () => read({ data: { kind, year, zone } }) });
  const state = query.data;
  const total = kind === "advent" ? ADVENT_BOOK_SLOTS.length : 12;
  const ready = state?.ready ?? 0;
  const complete = ready >= total;
  const local = state?.local;
  const december = !!local && local.month === 12 && local.year === year;
  const opened = kind === "advent" ? (state?.entries.length ?? 0) : 0;
  const done = kind === "advent" ? (state?.done ?? []) : [];
  const entry = state?.entries.find((e) => e.slot === slot);
  const { isFree } = usePlan();
  const monthlyLocked = kind === "monthly" && isFree;

  async function act(kindOfBusy: typeof busy, fn: () => Promise<void>) {
    setBusy(kindOfBusy);
    setError("");
    setNotice("");
    try {
      await fn();
      await query.refetch();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy("");
    }
  }
  const switchKind = (next: Kind) => {
    setKind(next);
    setSlot(undefined);
    setError("");
    setNotice("");
  };

  let whisper: string;
  if (kind === "advent") {
    if (!local) whisper = "Preparando tu calendario…";
    else if (december) whisper = local.day <= 24 ? `Hoy puedes abrir la ventana ${local.day}. Si se te pasó alguna, ábrela cuando quieras: aquí nadie pierde días.` : "El Adviento terminó, pero puedes abrir las ventanas que te falten hasta el 31.";
    else if (!complete) whisper = "Cuéntame qué te apetece descubrir y preparo 14 libros que todavía no tienes. Las otras 10 ventanas traen pequeños retos para leer un poco cada día. Se abren del 1 al 24 de diciembre.";
    else whisper = `Tus 14 descubrimientos y 10 retos están listos. Faltan ${daysUntilDecember(local)} días para abrir la primera.`;
  } else {
    whisper = complete ? "Un libro y una pequeña propuesta para cada mes. Si una sugerencia no te encaja, pide otra." : "Prepara tus doce capítulos: un libro y una pequeña propuesta para cada mes, sin metas obligatorias.";
  }

  return (
    <div className="space-y-6">
      <div className="adv-tabs" role="tablist" aria-label="Tipo de calendario">
        <button type="button" role="tab" aria-selected={kind === "advent"} className="adv-tab" onClick={() => switchKind("advent")}><Gift size={16} />Adviento con Koa</button>
        <button type="button" role="tab" aria-selected={kind === "monthly"} className="adv-tab" onClick={() => switchKind("monthly")}><Sparkles size={16} />Un año de lecturas</button>
      </div>

      <section className="adv-pebble space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="koa-eyebrow">{kind === "advent" ? `Diciembre ${year}` : `Año ${year}`}</p>
            <h2 className="text-2xl font-bold">{kind === "advent" ? `14 descubrimientos y 10 retos lectores` : "Doce capítulos a tu ritmo"}</h2>
            <p className="koa-muted mt-2 max-w-2xl">{kind === "advent" ? `Las ventanas de libro guardan algo nuevo para leer en ${year + 1}; las de reto, un gesto pequeño para cuidar tu hábito. Ningún reto es obligatorio ni cambia tu racha.` : "Un mes, una lectura sugerida y una pequeña propuesta. Lo que abras queda guardado."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`adv-chip ${complete ? "mint" : ""}`}>{complete ? <Check size={12} /> : null}{ready} / {total} preparados</span>
            {kind === "advent" && opened > 0 && <span className="adv-chip ember">{opened} libros abiertos</span>}
            {kind === "advent" && <span className={`adv-chip ${done.length ? "mint" : ""}`}><Footprints size={12} />{done.length} / {ADVENT_CHALLENGES.length} retos</span>}
          </div>
        </div>

        <div className="adv-whisper">
          <img src="/koa/meditate.webp" alt="" />
          <div>
            <p className="label">Koa te cuenta</p>
            <p>{whisper}</p>
          </div>
        </div>

        {monthlyLocked && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="koa-muted text-sm">«Un año de lecturas» es parte de Lee con Koa Pro.</p>
            <Link to="/pro" className="koa-button">Ver Lee con Koa Pro</Link>
          </div>
        )}
        {!complete && !monthlyLocked && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void act("prepare", async () => {
                await prepare({ data: { kind, year, zone, request, direction } });
                setNotice(kind === "advent" ? "Listo. Tus ventanas están preparadas con libros verificados." : "Listo. Tus capítulos están preparados.");
              });
            }}
          >
            <div>
              <label htmlFor={`${uid}-request`} className="koa-label">¿Qué te apetece descubrir?</label>
              <input id={`${uid}-request`} className="koa-field" maxLength={1500} value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Ej. fantasía acogedora, autoras latinoamericanas, historias breves…" />
            </div>
            <fieldset>
              <legend className="koa-label">Según lo que ya valoraste, prefieres…</legend>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`koa-chip ${direction === "similar" ? "active" : ""}`} aria-pressed={direction === "similar"} onClick={() => setDirection("similar")}>Sentir algo parecido</button>
                <button type="button" className={`koa-chip ${direction === "different" ? "active" : ""}`} aria-pressed={direction === "different"} onClick={() => setDirection("different")}>Buscar otra cosa</button>
              </div>
            </fieldset>
            <Button type="submit" disabled={!!busy || query.isLoading}>
              {busy === "prepare" ? <Loader2 className="animate-spin" /> : <Gift />}
              {busy === "prepare" ? "Koa está buscando en los catálogos…" : ready > 0 ? `Completar los ${total - ready} que faltan` : kind === "advent" ? "Preparar mis 14 descubrimientos" : "Preparar mis 12 capítulos"}
            </Button>
          </form>
        )}
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {query.error && <ErrorNotice>{userError(query.error)}</ErrorNotice>}
        {notice && !slot && <p role="status" className="text-sm" style={{ color: "var(--adv-mint)" }}>{notice}</p>}
      </section>

      {query.isLoading ? (
        <p role="status" className="koa-muted flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando tu calendario…</p>
      ) : kind === "advent" ? (
        <div className="adv-windows">
          {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => {
            const open = state?.entries.find((e) => e.slot === n);
            const unlocked = december && !!local && local.day >= n;
            const today = december && local?.day === n && !open;
            const proOnly = isFree && n > FREE_LIMITS.adventWindows;
            const canOpen = !!state?.calendar && ready > 0 && unlocked && !proOnly;
            const challenge = challengeFor(n);
            if (challenge) {
              const isDone = done.includes(n);
              const available = unlocked && !proOnly && !!state?.calendar;
              return (
                <button key={n} type="button" disabled={!available || !!busy} onClick={() => setChallengeSlot(n)}
                  className={`adv-window challenge ${isDone ? "done" : december && local?.day === n ? "today" : unlocked ? "" : "locked"}`}
                  aria-label={unlocked ? `Ventana ${n}: reto ${challenge.text}${isDone ? ", cumplido" : ""}` : `Ventana ${n}, reto que se abre el ${n} de diciembre`}>
                  <span className="num">{n}</span>
                  {unlocked && !proOnly && <span className="text-xs font-semibold leading-snug line-clamp-3 my-2">{challenge.text}</span>}
                  <span className="state">
                    {isDone ? <Check size={12} /> : unlocked ? <Footprints size={12} /> : <Lock size={12} />}
                    {isDone ? "Cumplido" : proOnly && unlocked ? "Con Pro" : unlocked ? "Reto del día" : `Reto · ${n} dic`}
                  </span>
                </button>
              );
            }
            if (open) {
              return (
                <button key={n} type="button" className="adv-window opened" disabled={!!busy} aria-label={`Ventana ${n}: ${open.title}`} onClick={() => setSlot(n)}>
                  <BookCover book={open} className="cover-fallback" />
                  <span className="badge adv-chip mint">{n}</span>
                  <span className="shade">{open.title}</span>
                </button>
              );
            }
            return (
              <button
                key={n}
                type="button"
                disabled={!canOpen || !!busy}
                className={`adv-window ${today ? "today" : unlocked ? "" : "locked"}`}
                aria-label={unlocked ? `Abrir la ventana ${n}` : `Ventana ${n}, se abre el ${n} de diciembre`}
                onClick={() => act("open", async () => { await reveal({ data: { calendar: state?.calendar?.id ?? "", slot: n, zone } }); setSlot(n); })}
              >
                <span className="num">{n}</span>
                <span className="state">
                  {busy === "open" && unlocked ? <Loader2 size={12} className="animate-spin" /> : unlocked ? <Gift size={12} /> : <Lock size={12} />}
                  {!state?.calendar || ready === 0 ? "Sin preparar" : proOnly ? "Con Pro" : today ? "¡Ábrela hoy!" : unlocked ? "Lista para abrir" : `${n} dic`}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="adv-months">
          {MONTHS.map((name, i) => {
            const month = i + 1;
            const e = state?.entries.find((x) => x.slot === month);
            const current = local?.year === year && local.month === month;
            const past = local?.year === year && local.month > month;
            return (
              <button key={name} type="button" className={`adv-month ${current ? "current" : ""} ${past ? "past" : ""}`} disabled={!e || !!busy} onClick={() => setSlot(month)} aria-label={`${name}: ${e ? e.title : "sin preparar"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="name">{name}</span>
                  {current && <span className="adv-chip ember">Este mes</span>}
                </div>
                <p className="koa-muted text-sm">{e?.task || monthlyTasks[i]}</p>
                {e ? (
                  <div className="book">
                    <BookCover book={e} className="w-[42px] h-[62px] text-[0.5rem]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug line-clamp-2">{e.title}</p>
                      <p className="koa-muted text-xs truncate">{e.author}</p>
                    </div>
                  </div>
                ) : (
                  <p className="koa-muted text-xs mt-auto inline-flex items-center gap-1"><Lock size={12} /> Por preparar</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {challengeSlot && state?.calendar && (() => {
        const ch = challengeFor(challengeSlot);
        if (!ch) return null;
        const isDone = done.includes(challengeSlot);
        return (
          <Modal title={`Ventana ${challengeSlot} · Reto lector`} onClose={() => { if (!busy) { setChallengeSlot(undefined); setNotice(""); setError(""); } }}>
            <div className="adv-whisper">
              <img src="/koa/read.webp" alt="" />
              <div>
                <p className="label">{isDone ? "Reto cumplido" : "Tu reto de hoy"}</p>
                <p className="text-base font-semibold">{ch.text}</p>
                <p className="koa-muted text-sm mt-1">{challengeHint(ch)}</p>
              </div>
            </div>
            <p className="koa-muted text-xs">Los retos son opcionales y no cambian tu racha: la racha solo cuenta tu avance real de lectura.</p>
            {error && <ErrorNotice>{error}</ErrorNotice>}
            {notice && <p role="status" className="text-sm" style={{ color: "var(--adv-mint)" }}>{notice}</p>}
            <div className="flex flex-wrap gap-3">
              {isDone ? (
                <span className="adv-chip mint"><Check size={12} /> Cumplido</span>
              ) : (
                <Button disabled={!!busy} onClick={() => act("save", async () => { await complete_({ data: { calendar: state.calendar?.id ?? "", slot: challengeSlot, zone } }); setNotice("¡Reto cumplido! Koa lo celebra contigo."); })}>
                  {busy === "save" ? <Loader2 className="animate-spin" /> : <Check />}{ch.kind === "self" ? "Lo hice" : "Comprobar mi reto"}
                </Button>
              )}
              {(ch.kind === "pages" || ch.kind === "minutes") && !isDone && <Link className="koa-secondary" to="/read" search={{ book: undefined }}><BookOpen size={16} />Ir a Leer</Link>}
              {ch.kind === "note" && !isDone && <Link className="koa-secondary" to="/notebook" search={{ book: undefined }}><NotebookPen size={16} />Abrir mi cuaderno</Link>}
            </div>
          </Modal>
        );
      })()}
      {slot && entry && state?.calendar && (
        <Modal title={entry.title} onClose={() => { if (!busy) { setSlot(undefined); setNotice(""); } }}>
          <div className="flex gap-4">
            <BookCover book={entry} className="w-24 h-36 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{entry.author}</p>
              <p className="koa-muted text-xs mt-1">{kind === "advent" ? `Ventana ${slot}` : MONTHS[slot - 1]}{entry.isbn ? ` · ISBN ${entry.isbn}` : ""}</p>
              <p className="koa-muted text-sm mt-3 line-clamp-[8]">{entry.description || "El catálogo no trae sinopsis para este libro."}</p>
            </div>
          </div>
          {entry.task && (
            <div className="adv-whisper mt-2">
              <img src="/koa/read.webp" alt="" />
              <div><p className="label">Propuesta del mes</p><p>{entry.task}</p></div>
            </div>
          )}
          {error && <ErrorNotice>{error}</ErrorNotice>}
          {notice && <p role="status" className="text-sm" style={{ color: "var(--adv-mint)" }}>{notice}</p>}
          <div className="flex flex-wrap gap-3 mt-2">
            {entry.saved_wish_id ? (
              <span className="adv-chip mint"><Check size={12} /> Ya está en tus deseos</span>
            ) : (
              <Button disabled={!!busy} onClick={() => act("save", async () => { await save({ data: { calendar: state.calendar?.id ?? "", slot } }); setNotice(`Guardado en tus deseos y en la lista «Lecturas para ${kind === "advent" ? year + 1 : year}».`); })}>
                {busy === "save" ? <Loader2 className="animate-spin" /> : <Bookmark />}Guardar en mis deseos
              </Button>
            )}
            {kind === "monthly" && (
              <Button variant="secondary" disabled={!!busy} onClick={() => act("replace", async () => { await prepare({ data: { kind, year, zone, request, direction, replace: slot } }); setNotice("Te traje otra sugerencia para este mes."); })}>
                {busy === "replace" ? <Loader2 className="animate-spin" /> : <RefreshCw />}Otra sugerencia
              </Button>
            )}
            <Link className="koa-secondary" to="/lists">Ver mis listas</Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
