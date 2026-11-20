import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { koaDb, userError } from "@/lib/koa-data";
import { currentUser } from "@/hooks/use-reader";
import { markOnboarded } from "@/lib/session-user";
import { supabase } from "@/integrations/supabase/client";
import { Koa, ErrorNotice } from "@/components/koa/UI";
export const Route = createFileRoute("/_authenticated/onboarding")({ head: () => ({ meta: [{ title: "Preferencias lectoras — Lee con Koa" }, { name: "description", content: "Elige tu ritmo y tus intereses de lectura." }, { property: "og:title", content: "Preferencias — Lee con Koa" }, { property: "og:description", content: "Tu próxima lectura empieza con tus gustos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: Onboarding });
function Onboarding() {
  const navigate = useNavigate();
  const [pace, setPace] = useState<"gentle" | "weekend" | "flexible">("flexible");
  const [moods, setMoods] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void currentUser()
      .then(async (u) => {
        const { data } = await koaDb
          .from("reader_preferences")
          .select("*")
          .eq("user_id", u.id)
          .maybeSingle();
        if (data) {
          setPace(data.pace);
          setMoods(data.moods);
        }
      })
      .catch((e) => setError(userError(e)));
  }, []);
  async function save(destination: "/discover" | "/library", skip = false) {
    setBusy(true);
    setError("");
    try {
      const u = await currentUser();
      if (!skip) {
        const { error } = await koaDb.from("reader_preferences").upsert({
          user_id: u.id,
          pace,
          moods,
          onboarding_version: 1,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_finished_at: new Date().toISOString() })
        .eq("id", u.id);
      if (error) throw error;
      markOnboarded(u.id);
      await navigate({ to: destination });
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center">
        <Koa pose="meditate" className="w-44 mx-auto mb-4" />
        <p className="koa-eyebrow">Bienvenida a tu refugio lector</p>
        <h1>Un libro para tu momento.</h1>
        <p className="koa-muted my-4">
          Koa te ayuda a elegir qué leer. Cuéntale un poco de ti; puedes cambiarlo cuando quieras.
        </p>
      </div>
      <section className="koa-card mt-7">
        <h2>¿Qué ritmo va contigo?</h2>
        <div className="grid gap-3 mt-5">
          {(
            [
              ["gentle", "Un ratito cada día", "10 a 15 minutos, sin prisa."],
              ["weekend", "Perderme entre páginas", "Una lectura larga cuando tenga tiempo."],
              ["flexible", "A mi propio ritmo", "Leer cuando me apetezca."],
            ] as const
          ).map(([v, t, d]) => (
            <button
              aria-pressed={pace === v}
              key={v}
              onClick={() => setPace(v)}
              className={`koa-secondary text-left justify-start ${pace === v ? "border-primary bg-primary/10" : ""}`}
            >
              <span>
                <strong>{t}</strong>
                <small className="block koa-muted">{d}</small>
              </span>
            </button>
          ))}
        </div>
        <h2 className="mt-8 mb-4">¿Qué te gusta encontrar?</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Misterio",
            "Humor",
            "Romance",
            "Fantasía",
            "Historia",
            "Ciencia ficción",
            "Poesía",
            "Aprender algo nuevo",
          ].map((m) => (
            <button
              aria-pressed={moods.includes(m)}
              key={m}
              className={`koa-chip ${moods.includes(m) ? "active" : ""}`}
              onClick={() =>
                setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="koa-message mt-7">
          Tu racha cuenta al guardar un avance o terminar un libro que estés leyendo. Si descansas
          un día, tu historial sigue contigo.
        </div>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button disabled={busy} className="koa-button flex-1" onClick={() => save("/discover")}>
            Descubrir mis tres opciones
          </button>
          <button disabled={busy} className="koa-secondary flex-1" onClick={() => save("/library")}>
            Añadir o importar mis libros
          </button>
        </div>
        <button
          disabled={busy}
          className="block mx-auto text-sm text-muted-foreground mt-5 underline"
          onClick={() => save("/discover", true)}
        >
          Ahora no, prefiero explorar
        </button>
      </section>
    </div>
  );
}
