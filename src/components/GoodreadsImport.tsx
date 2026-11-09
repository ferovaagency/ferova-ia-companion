import { useState } from "react";
import type { Book } from "@/types";
import { previewGoodreads } from "@/lib/goodreads";
import { supabase } from "@/integrations/supabase/client";
export function GoodreadsImport({
  books,
  refresh,
  onBusy,
}: {
  books: Book[];
  refresh: () => Promise<void>;
  onBusy: (v: boolean) => void;
}) {
  const [rows, setRows] = useState<ReturnType<typeof previewGoodreads>>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(40);
  async function load(file?: File) {
    setRows([]);
    setSelected(new Set());
    setMessage("");
    setLimit(40);
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("El archivo supera los 20 MB.");
      const parsed = previewGoodreads(await file.text(), books);
      setRows(parsed);
      setSelected(new Set(parsed.filter((r) => !r.reason && !r.review).map((r) => r.index)));
      if (!parsed.length) setMessage("El archivo está vacío.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }
  async function save() {
    setBusy(true);
    onBusy(true);
    let added = 0;
    const pending = new Set(selected);
    try {
      const chosen = rows.filter((r) => selected.has(r.index));
      for (let i = 0; i < chosen.length; i += 100) {
        const batch = chosen.slice(i, i + 100);
        const { data, error } = await supabase.rpc("import_goodreads", {
          p_rows: batch.map((r) => r.data),
        });
        if (error) throw error;
        added += data;
        for (const r of batch) pending.delete(r.index);
        setSelected(new Set(pending));
        setRows((before) =>
          before.map((r) =>
            batch.some((item) => item.index === r.index) ? { ...r, reason: "Procesado" } : r,
          ),
        );
      }
      setMessage(
        `Importación terminada. Libros añadidos: ${added}. Coincidencias omitidas: ${chosen.length - added}.`,
      );
    } catch {
      setMessage(`Se añadieron ${added} libros. Puedes reintentar las filas pendientes.`);
    } finally {
      try {
        await refresh();
      } finally {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl font-bold">Importar de Goodreads</h2>
      <p className="text-sm">
        En Goodreads, abre My Books → Import and Export → Export Library. Elige aquí el CSV
        descargado para revisar tus libros antes de guardarlos.
      </p>
      <input
        aria-label="CSV de Goodreads"
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => void load(e.target.files?.[0])}
      />
      {rows.length > 0 && (
        <>
          <p>
            {rows.length} filas · {rows.filter((r) => r.reason === "Ya registrado").length}{" "}
            coincidencias · {rows.filter((r) => r.review && !r.reason).length} por revisar.
          </p>
          <p className="text-sm">
            Las posibles coincidencias de título y los datos incompletos quedan desmarcados.
            Selecciónalos solo si quieres crear esa ficha.
          </p>
          <div className="max-h-64 overflow-auto divide-y">
            {rows.slice(0, limit).map((r) => (
              <label key={r.index} className="flex items-start gap-2 py-2 text-sm">
                <input
                  type="checkbox"
                  disabled={busy || !!r.reason}
                  checked={selected.has(r.index)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(r.index);
                    else next.delete(r.index);
                    setSelected(next);
                  }}
                />
                <span>
                  {r.data.title || "Sin título"} · {r.data.author}
                  <small className="block">
                    {r.reason || (r.review ? "Revisar antes de crear" : "Nuevo")}
                    {r.data.isbn && " · " + r.data.isbn}
                  </small>
                </span>
              </label>
            ))}
            {limit < rows.length && (
              <button onClick={() => setLimit(limit + 80)}>Mostrar más</button>
            )}
          </div>
          <button
            className="bg-foreground text-background px-4 py-2"
            disabled={busy || !selected.size}
            onClick={save}
          >
            {busy ? "Importando…" : `Importar ${selected.size} libros`}
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
