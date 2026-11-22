import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSessionUser } from "@/lib/session-user";
import { PRIVACY_VERSION } from "@/lib/legal";
import { userError } from "@/lib/koa-data";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const consentKey = ["profile-consent"] as const;

/** Consentimiento actual del lector (política aceptada y permiso de contacto). */
export function useConsent() {
  return useQuery({
    queryKey: consentKey,
    staleTime: Infinity,
    queryFn: async () => {
      const { data: u } = await getSessionUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("profiles")
        .select("id,privacy_version,contact_consent").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Casillas de aceptación, iguales en el registro y en la ventana para cuentas existentes. */
export function ConsentFields({
  privacy, contact, onPrivacy, onContact,
}: { privacy: boolean; contact: boolean; onPrivacy: (v: boolean) => void; onContact: (v: boolean) => void }) {
  return (
    <div className="space-y-3 text-sm text-left">
      <label className="flex gap-2 items-start">
        <input type="checkbox" required checked={privacy} onChange={(e) => onPrivacy(e.target.checked)} className="mt-1" />
        <span>He leído y acepto la <Link to="/privacidad" target="_blank" className="underline">Política de tratamiento de datos</Link>. <span className="koa-muted">(Obligatorio)</span></span>
      </label>
      <label className="flex gap-2 items-start">
        <input type="checkbox" checked={contact} onChange={(e) => onContact(e.target.checked)} className="mt-1" />
        <span>Acepto que Lee con Koa me contacte por correo con novedades, retos y recomendaciones. Puedo retirarlo en Ajustes.</span>
      </label>
    </div>
  );
}

/** Ajustes: dar o retirar el permiso de contacto en cualquier momento. */
export function ContactConsentToggle() {
  const queryClient = useQueryClient();
  const consent = useConsent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = consent.data;
  if (!profile) return null;
  return (
    <div className="my-4">
      <label className="flex gap-2 items-start text-sm">
        <input type="checkbox" className="mt-1" disabled={busy} checked={profile.contact_consent} onChange={async (e) => {
          setBusy(true); setError("");
          const { error } = await supabase.from("profiles").update({ contact_consent: e.target.checked }).eq("id", profile.id);
          if (error) setError(userError(error));
          await queryClient.invalidateQueries({ queryKey: consentKey });
          setBusy(false);
        }} />
        <span>Quiero que Lee con Koa me contacte por correo con novedades, retos y recomendaciones.</span>
      </label>
      {error && <p role="alert" className="koa-error mt-2">{error}</p>}
      <p className="koa-muted text-sm mt-2">Consulta la <Link to="/privacidad" className="underline">Política de tratamiento de datos</Link>.</p>
    </div>
  );
}

/**
 * Pide aceptar la política a quien aún no lo hizo: cuentas creadas con Google
 * y cuentas anteriores a la política (o a una versión nueva).
 */
export function ConsentGate() {
  const queryClient = useQueryClient();
  const consent = useConsent();
  const [privacy, setPrivacy] = useState(false);
  const [contact, setContact] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = consent.data;
  if (!profile || profile.privacy_version === PRIVACY_VERSION) return null;
  const wantsContact = contact ?? profile.contact_consent;
  return (
    <Dialog open onOpenChange={() => { /* hay que aceptar para seguir */ }}>
      <DialogContent className="[&>button:last-child]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle>Tus datos, con tu permiso</DialogTitle>
        <DialogDescription>
          {profile.privacy_version ? "Actualizamos la política de tratamiento de datos." : "Antes de seguir, necesitamos tu autorización para tratar tus datos de lectura."}
        </DialogDescription>
        <form className="space-y-4 mt-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!privacy) return;
          setBusy(true); setError("");
          try {
            const { error } = await supabase.from("profiles")
              .update({ privacy_version: PRIVACY_VERSION, contact_consent: wantsContact }).eq("id", profile.id);
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: consentKey });
          } catch (err) { setError(userError(err)); }
          finally { setBusy(false); }
        }}>
          <ConsentFields privacy={privacy} contact={wantsContact} onPrivacy={setPrivacy} onContact={setContact} />
          {error && <p role="alert" className="koa-error">{error}</p>}
          <button className="koa-button w-full" disabled={busy || !privacy}>{busy ? "Guardando…" : "Aceptar y continuar"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
