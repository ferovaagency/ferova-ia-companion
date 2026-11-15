import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { sharedOptions } from "@/lib/social-data";
import { supabase } from "@/integrations/supabase/client";
import { ErrorNotice } from "./UI";
import { userError } from "@/lib/koa-data";
export function SharedAdventures() {
  const { data, refetch } = useSuspenseQuery(sharedOptions); const client = useQueryClient();
  const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  return <section className="border-t border-border py-8"><div className="flex flex-wrap gap-4 justify-between"><h2>Aventuras compartidas</h2><Link to="/refuge" className="text-primary">Mi refugio y clubes</Link></div>{error && <ErrorNotice>{error}</ErrorNotice>}<div className="grid sm:grid-cols-2 gap-4 mt-4">{data.filter(s => s.kind === "bingo" && s.payload).map(s => <article className="koa-card" key={s.id}><p className="koa-eyebrow">{s.visibility === "public" ? "Pública" : s.visibility === "club" ? "Del club" : "Amistades"}</p><h3>{s.payload?.title}</h3><p className="koa-muted my-3">{s.payload?.purpose}</p><Button disabled={Boolean(busy)} onClick={async () => { setBusy(s.id); setError(""); try { const r = await supabase.rpc("reader_copy_bingo", { p_share: s.id }); if (r.error) throw r.error; await client.invalidateQueries({ queryKey: ["koa-bingos"] }); await refetch(); } catch(e) { setError(userError(e)); } finally { setBusy(""); } }}>{busy === s.id ? "Preparando…" : "Unirme con mi progreso"}</Button></article>)}</div>{!data.some(s => s.kind === "bingo" && s.payload) && <p className="koa-muted mt-4">Todavía no hay aventuras disponibles para ti.</p>}</section>;
}