import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { clearPrivateView } from "@/lib/privacy-cache";
import { userError } from "@/lib/koa-data";
import { ErrorNotice, Modal } from "./UI";

export function DeleteAccount() {
  const remove = useServerFn(deleteMyAccount);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await remove({ data: { confirm: "ELIMINAR" } });
      clearPrivateView(queryClient);
      await supabase.auth.signOut().catch(() => undefined);
      await navigate({ to: "/", replace: true });
    } catch (e) {
      setError(userError(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Trash2 />Eliminar mi cuenta</Button>
      {open && (
        <Modal title="Eliminar tu cuenta" onClose={() => { if (!busy) { setOpen(false); setTyped(""); setError(""); } }}>
          <p className="text-sm">Se borran para siempre tu biblioteca, historial de lectura, cuaderno, conversaciones con Koa, listas, bingos, calendarios, perfil, amistades, clubes que creaste e imágenes. No se puede deshacer.</p>
          <p className="koa-muted text-sm">Si pagas Pro en Whop, cancela primero la suscripción desde «Administrar o cancelar». Tus mensajes de sugerencias se conservan sin tu nombre.</p>
          <label className="block text-sm mt-2">
            Escribe <strong>ELIMINAR</strong> para confirmar
            <input className="koa-field mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <div className="flex flex-wrap gap-3 mt-2">
            <Button disabled={busy || typed.trim().toUpperCase() !== "ELIMINAR"} onClick={() => void confirm()}>
              {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}Eliminar definitivamente
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
