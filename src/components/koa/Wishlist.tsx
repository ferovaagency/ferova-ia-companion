import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { koaDb, userError, identity, type Wish } from "@/lib/koa-data";
import { supabase } from "@/integrations/supabase/client";
import { currentUser } from "@/hooks/use-reader";
import type { Book } from "@/types";
import { BookCover } from "@/components/BookCover";
import { ErrorNotice, Empty } from "./UI";
export function Wishlist({ books, refresh }: { books: Book[]; refresh: () => Promise<void> }) {
  const [items, setItems] = useState<Wish[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const { data, error } = await koaDb
      .from("reader_wishes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setItems(data);
  }
  useEffect(() => {
    void load().catch((e) => setError(userError(e)));
  }, []);
  async function add(w: Wish) {
    setBusy(true);
    setError("");
    try {
      const u = await currentUser();
      if (!books.some((b) => identity(b.title, b.author) === identity(w.title, w.author))) {
        const { error } = await supabase.from("books").insert({
          user_id: u.id,
          title: w.title,
          author: w.author,
          description: w.description,
          cover_url: w.cover_url,
          status: "TBR",
        });
        if (error) throw error;
      }
      const { error } = await koaDb.from("reader_wishes").delete().eq("id", w.id);
      if (error) throw error;
      await refresh();
      await load();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((w) => (
          <article key={w.id} className="koa-card flex gap-4">
            <BookCover book={w} className="w-20 h-28 shrink-0" />
            <div>
              <h3 className="font-bold">{w.title}</h3>
              <p className="koa-muted">{w.author}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button className="koa-button" disabled={busy} onClick={() => add(w)}>
                  Ya lo tengo · A mi biblioteca
                </button>
                <button
                  className="koa-secondary"
                  disabled={busy}
                  onClick={async () => {
                    const { error } = await koaDb.from("reader_wishes").delete().eq("id", w.id);
                    if (error) setError(userError(error));
                    else setItems(items.filter((x) => x.id !== w.id));
                  }}
                >
                  Quitar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!items.length && !error && (
        <Empty title="Historias por descubrir">
          Guarda aquí las recomendaciones que quieras conseguir después.
          <br />
          <Link to="/discover" className="koa-button mt-4">
            Descubrir con Koa
          </Link>
        </Empty>
      )}
    </section>
  );
}
