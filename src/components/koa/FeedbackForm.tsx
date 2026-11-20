import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "./UI";

export function FeedbackForm() {
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSent(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("feedback").insert({ type, message: message.trim(), user_id: auth.user?.id ?? null });
      if (error) throw error;
      setSent(true); setMessage("");
    } catch { setError("No pudimos enviar tu mensaje. Conservamos el texto para que puedas reintentarlo."); } finally { setBusy(false); }
  }}>
    <label className="block">Tipo de mensaje<select className="koa-field" value={type} onChange={(e) => setType(e.target.value)}><option value="suggestion">Sugerencia</option><option value="bug">Reportar un error</option><option value="other">Otra consulta</option></select></label>
    <label className="block">Tu mensaje<textarea className="koa-field min-h-32" required minLength={5} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
    <p className="koa-muted">No incluyas contraseñas ni información privada. Tu mensaje llega al equipo de Lee con Koa.</p>
    {error && <ErrorNotice>{error}</ErrorNotice>}{sent && <p role="status">Gracias. Tu mensaje quedó enviado.</p>}
    <Button disabled={busy || message.trim().length < 5} type="submit">{busy ? "Enviando…" : "Enviar mensaje"}</Button>
  </form>;
}