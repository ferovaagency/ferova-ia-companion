import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askKoa } from "@/lib/koa-ai.functions";
import { koaDb, userError, type Conversation } from "@/lib/koa-data";
import { ErrorNotice, KoaMessage } from "./UI";
export function Chat({ bookId }: { bookId: string }) {
  const ask = useServerFn(askKoa);
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [question, setQuestion] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await koaDb
      .from("reader_conversations")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    setMessages((data ?? []).reverse());
  }, [bookId]);
  useEffect(() => {
    setMessages([]);
    setSpoilers(false);
    void load().catch((e) => setError(userError(e)));
  }, [bookId, load]);
  async function send(mode: "chat" | "summary") {
    setBusy(true);
    setError("");
    try {
      await ask({ data: { bookId, mode, question, spoilers } });
      setQuestion("");
      await load();
    } catch (e) {
      setError(userError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="koa-card">
      <h2 className="mb-4">En sintonía con Koa</h2>
      <KoaMessage>
        Podemos explorar un pasaje, hablar de tus notas o buscar qué te está gustando de esta
        lectura.
      </KoaMessage>
      <div className="space-y-4 my-5 max-h-96 overflow-auto" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id}>
            <p className="rounded-2xl bg-primary/15 p-3 text-sm mb-2">Tú · {m.question}</p>
            <p className="text-sm whitespace-pre-wrap p-3">Koa · {m.answer}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send("chat");
        }}
      >
        <label className="koa-label" htmlFor="koa-question">
          ¿Qué te gustaría explorar?
        </label>
        <textarea
          id="koa-question"
          className="koa-field"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={3000}
          placeholder="Me llamó la atención este pasaje…"
        />
        <label className="flex items-center gap-2 text-sm my-3">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(e) => setSpoilers(e.target.checked)}
          />
          Permitir spoilers de este libro
        </label>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || !question.trim()} className="koa-button">
            {busy ? "Koa está pensando…" : "Conversar con Koa"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="koa-secondary"
            onClick={() => send("summary")}
          >
            Explorar mis notas
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="koa-secondary"
              disabled={busy}
              onClick={async () => {
                if (!confirm("¿Eliminar la conversación de este libro?")) return;
                const { error } = await koaDb
                  .from("reader_conversations")
                  .delete()
                  .eq("book_id", bookId);
                if (error) setError(userError(error));
                else setMessages([]);
              }}
            >
              Borrar conversación
            </button>
          )}
        </div>
      </form>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <p className="koa-muted mt-4">
        Koa usa IA y puede equivocarse. Comparte el fragmento para conversar con más contexto.
      </p>
    </section>
  );
}
