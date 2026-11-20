import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Bookmark, RefreshCw } from "lucide-react";
import { useReader, currentUser } from "@/hooks/use-reader";
import { recommendBook } from "@/lib/books.functions";
import { supabase } from "@/integrations/supabase/client";
import { koaDb, identity, userError } from "@/lib/koa-data";
import { BookCover } from "@/components/BookCover";
import { Koa, KoaMessage, Loading, ErrorNotice } from "@/components/koa/UI";
import type { RecommendationOption, RecommendationResult } from "@/types";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/koa/ShareButton";
export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Descubre tu próxima lectura — Lee con Koa" },
      { name: "description", content: "Tres recomendaciones para tus gustos y tu contexto lector actual." },
      { property: "og:title", content: "Descubrir — Lee con Koa" },
      { property: "og:description", content: "Elige tu próxima lectura entre tres opciones." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Discover,
});
const moods = [
  "Cansada y quiero desconectar",
  "Curiosidad despierta",
  "Estoy en bloqueo lector",
  "Una historia ligera",
  "Misterio e intriga",
];
function Discover() {
  const navigate = useNavigate();
  const { data: books = [], isLoading, error } = useReader();
  const call = useServerFn(recommendBook);
  const [request, setRequest] = useState("");
  const [minutes, setMinutes] = useState("20");
  const [result, setResult] = useState<RecommendationResult>();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [prefs, setPrefs] = useState("");
  const [direction, setDirection] = useState<"similar" | "different">("similar");
  useEffect(() => {
    void currentUser()
      .then(async (u) => {
        const p = await koaDb
          .from("reader_preferences")
          .select("*")
          .eq("user_id", u.id)
          .maybeSingle();
        if (p.data)
          setPrefs(`Preferencias: ${p.data.pace}; atmósferas: ${p.data.moods.join(", ")}.`);
      })
      .catch(() => {});
  }, [navigate]);
  async function ask(again = false) {
    setBusy(true);
    setFailure("");
    setNotice("");
    const prev = again
      ? [
          ...excluded,
          ...(result?.options ?? []).map((o) => {
            const b = books.find((x) => x.id === o.bookId);
            return b ? `${b.title} · ${b.author}` : `${o.external?.title} · ${o.external?.author}`;
          }),
        ].slice(-30)
      : [];
    setExcluded(prev);
    try {
      const response = await call({
        data: {
          userRequest: `${request}. Tengo ${minutes} minutos para esta sesión. ${prefs}`,
          books,
          exclude: prev,
          direction,
        },
      });
      setResult(response);
      if (response.errorType) setFailure(response.reasoning);
    } catch (e) {
      setFailure(userError(e));
    } finally {
      setBusy(false);
    }
  }
  async function choose(option: RecommendationOption, wish = false) {
    setSaving(true);
    setFailure("");
    try {
      const u = await currentUser();
      const ext = option.external;
      const existing = books.find(
        (b) =>
          b.id === option.bookId ||
          (ext && identity(b.title, b.author) === identity(ext.title, ext.author)),
      );
      if (wish) {
        if (!ext) return;
        const { error } = await koaDb.from("reader_wishes").insert({
          user_id: u.id,
          title: ext.title,
          author: ext.author,
          cover_url: ext.cover_url ?? null,
          description: ext.description ?? "",
        });
        if (error && error.code !== "23505") throw error;
        setNotice("Guardado en tu lista de deseos.");
        return;
      }
      let id = existing?.id;
      if (existing) {
        if (existing.status !== "READING") {
          const { error } = await supabase
            .from("books")
            .update({ status: "READING", started_reading_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        }
      } else if (ext) {
        const { data, error } = await supabase
          .from("books")
          .insert({
            user_id: u.id,
            title: ext.title,
            author: ext.author,
            cover_url: ext.cover_url ?? null,
            genre: ext.genre ?? "Literatura",
            pages: ext.pages ?? 0,
            moods: ext.moods ?? [],
            description: ext.description ?? "",
            series_name: ext.series_name ?? null,
            series_index: ext.series_index ?? null,
            status: "READING",
            started_reading_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      if (id) await navigate({ to: "/read", search: { book: id } });
    } catch (e) {
      setFailure(userError(e));
    } finally {
      setSaving(false);
    }
  }
  if (isLoading) return <Loading />;
  if (error) return <ErrorNotice>{userError(error)}</ErrorNotice>;
  const active = books.find((b) => b.status === "READING");
  return (
    <>
      <section className="koa-hero">
        <div>
          <p className="koa-eyebrow">Tu oráculo lector personal</p>
          <h1>
            ¿Cómo llegas hoy?
            <br />
            <span className="text-primary">Cuéntale a Koa tu momento.</span>
          </h1>
          <p className="koa-muted mt-5 max-w-xl">
            Tres libros según cómo te sientes, el tiempo que tienes y lo que te apetece leer. Tu
            próxima lectura empieza contigo.
          </p>
          <div className="flex gap-3 mt-5">
            <span className="koa-chip">Tres opciones, sin agobios</span>
            <span className="koa-chip gold">A tu propio ritmo</span>
          </div>
        </div>
        <Koa pose="welcome" />
      </section>
      <form
        className="koa-card mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <h2 className="mb-4">Afinemos tu lectura de hoy</h2>
        <fieldset className="mb-4"><legend className="mb-2">Respecto a mis sensaciones guardadas</legend><div className="flex flex-wrap gap-2"><Button type="button" variant={direction === "similar" ? "default" : "secondary"} aria-pressed={direction === "similar"} onClick={() => setDirection("similar")}>Una sensación parecida</Button><Button type="button" variant={direction === "different" ? "default" : "secondary"} aria-pressed={direction === "different"} onClick={() => setDirection("different")}>Algo diferente hoy</Button></div></fieldset>
        <div className="flex flex-wrap gap-2 mb-5">
          {moods.map((m) => (
            <button
              key={m}
              type="button"
              className={`koa-chip ${request === m ? "active" : ""}`}
              onClick={() => setRequest(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <label className="flex-1">
            <span className="sr-only">Qué te apetece leer</span>
            <input
              className="koa-field"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Hoy quiero una historia que…"
              maxLength={1500}
              required
            />
          </label>
          <label>
            <span className="sr-only">Minutos disponibles</span>
            <select
              className="koa-field"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            >
              {["10", "20", "30", "60"].map((n) => (
                <option key={n} value={n}>
                  {n} minutos
                </option>
              ))}
            </select>
          </label>
          <button className="koa-button" disabled={busy || !request.trim()}>
            <Sparkles size={17} />
            {busy ? "Koa está buscando…" : "Preguntar a Koa"}
          </button>
        </div>
      </form>
      {failure && <ErrorNotice>{failure}</ErrorNotice>}
      {notice && (
        <p role="status" className="koa-message mb-5">
          {notice}
        </p>
      )}
      {busy && <Loading />}
      {!busy && result?.options.length === 3 && (
        <section>
          <div className="flex justify-between items-center gap-3 mb-5">
            <h2>Tres lecturas para tu momento</h2>
            <button className="koa-secondary" onClick={() => ask(true)} disabled={saving}>
              <RefreshCw size={16} />
              <span>Otras tres</span>
            </button>
          </div>
          <div className="koa-recs">
            {result.options.map((o, i) => {
              const b = books.find((b) => b.id === o.bookId) ?? o.external;
              if (!b) return null;
              return (
                <article key={o.bookId ?? `${b.title}-${i}`} className="koa-card flex flex-col">
                  <span className="koa-eyebrow">
                    {o.bookId ? "De tu estantería" : "Por descubrir"}
                  </span>
                  <div className="flex gap-4 my-4">
                    <BookCover
                      book={{ title: b.title, author: b.author, cover_url: b.cover_url ?? null }}
                      className="w-24 h-36 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-lg">{b.title}</h3>
                      <p className="koa-muted mt-2">{b.author}</p>
                    </div>
                  </div>
                  <div className="bg-background/60 rounded-2xl p-4 mb-5 flex-1">
                    <p className="koa-eyebrow text-accent">Voz de Koa</p>
                    <p className="text-sm leading-relaxed">{o.reasoning}</p>
                  </div>
                  <button className="koa-button w-full" disabled={saving} onClick={() => choose(o)}>
                    Elijo este · Empezar <ArrowRight size={16} />
                  </button>
                  {!o.bookId && (
                    <button
                      className="koa-secondary mt-2"
                      disabled={saving}
                      onClick={() => choose(o, true)}
                    >
                      <Bookmark size={16} />
                      Guardar en deseos
                    </button>
                  )}
                  <ShareButton className="koa-secondary mt-2" label="Compartir recomendación" input={{ kind: "oracle", title: b.title, author: b.author }} />
                </article>
              );
            })}
          </div>
        </section>
      )}
      <div className="grid md:grid-cols-2 gap-5 mt-8">
        <KoaMessage>
          Unos días buscas aventura. Otros, una pausa. Podemos encontrar una historia para
          cualquiera de esos momentos.
        </KoaMessage>
        {active ? (
          <Link
            to="/read"
            search={{ book: active.id }}
            className="koa-card flex items-center gap-4"
          >
            <BookCover book={active} className="w-14 h-20 shrink-0" />
            <div>
              <p className="koa-eyebrow">Tu lectura te espera</p>
              <h3>{active.title}</h3>
              <p className="koa-muted">Continuar desde la página {active.current_page}</p>
            </div>
            <ArrowRight className="ml-auto" />
          </Link>
        ) : (
          <Link to="/library" className="koa-card">
            <p className="koa-eyebrow">Tu biblioteca personal</p>
            <h2>Trae las historias que ya tienes</h2>
            <p className="koa-muted mt-2">Añade un libro, escanea su ISBN o importa Goodreads.</p>
          </Link>
        )}
      </div>
    </>
  );
}
