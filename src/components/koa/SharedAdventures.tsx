import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, Loader2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sharedOptions } from "@/lib/social-data";
import { supabase } from "@/integrations/supabase/client";
import { ErrorNotice } from "./UI";
import { userError } from "@/lib/koa-data";

export function useSharedBingos() {
  const { data } = useSuspenseQuery(sharedOptions);
  return data.filter((s) => s.kind === "bingo" && s.payload);
}

export function SharedAdventures({ joined }: { joined: () => void }) {
  const shares = useSharedBingos();
  const { refetch } = useSuspenseQuery(sharedOptions);
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<string[]>([]);

  return (
    <div className="space-y-5">
      <div className="adv-whisper">
        <img src="/koa/welcome.webp" alt="" />
        <div>
          <p className="label">Leer en compañía</p>
          <p>Al unirte recibes tu propia copia del bingo. Cada persona conserva su avance y nadie ve tus libros ni tus notas.</p>
        </div>
      </div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {shares.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shares.map((s) => (
            <article className="adv-pebble flex flex-col gap-3" key={s.id}>
              <span className="adv-chip lavender w-fit">
                {s.visibility === "public" ? <Globe size={12} /> : <Users size={12} />}
                {s.visibility === "public" ? "Pública" : s.visibility === "club" ? "De tu club" : "De tus amistades"}
              </span>
              <h3 className="text-lg font-bold break-words">{s.payload?.title}</h3>
              {s.payload?.purpose && <p className="koa-muted text-sm break-words">{s.payload.purpose}</p>}
              <div className="mt-auto pt-2">
                {done.includes(s.id) ? (
                  <Button variant="secondary" onClick={joined}>Ver en mis bingos</Button>
                ) : (
                  <Button
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      setBusy(s.id);
                      setError("");
                      try {
                        const r = await supabase.rpc("reader_copy_bingo", { p_share: s.id });
                        if (r.error) throw r.error;
                        await client.invalidateQueries({ queryKey: ["koa-bingos"] });
                        await refetch();
                        setDone((d) => [...d, s.id]);
                      } catch (e) {
                        setError(userError(e));
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    {busy === s.id ? <Loader2 className="animate-spin" /> : <UserPlus />}
                    {busy === s.id ? "Preparando tu copia…" : "Unirme con mi progreso"}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="koa-empty">
          <img src="/koa/read.webp" alt="" className="w-28 mx-auto" />
          <h3 className="text-lg font-bold mt-2">Todavía no hay bingos compartidos contigo</h3>
          <p className="koa-muted mt-2">Cuando una amistad o tu club comparta un bingo, aparecerá aquí.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link to="/refuge" className="koa-secondary">Mis amistades y clubes</Link>
            <Link to="/community" className="koa-secondary">Comunidad pública</Link>
          </div>
        </div>
      )}
    </div>
  );
}
