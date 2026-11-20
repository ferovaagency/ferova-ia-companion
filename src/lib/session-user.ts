import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// En el navegador basta la sesión guardada para saber quién es el lector:
// cada consulta ya viaja con su token y Supabase la valida con RLS.
// supabase.auth.getUser() hacía una ida y vuelta al servidor de acceso
// (~0,4 s desde Colombia) en cada navegación y en cada acción.
// No usar en el servidor: allí se valida con requireSupabaseAuth.

export async function getSessionUser(): Promise<{ data: { user: User | null }; error: null }> {
  const { data } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null }, error: null };
}

// Onboarding: se consulta una vez por lector y carga de la app.
const onboarded = new Map<string, boolean>();

export async function needsOnboarding(userId: string): Promise<boolean> {
  const cached = onboarded.get(userId);
  if (cached !== undefined) return !cached;
  const { data, error } = await supabase.from("profiles").select("onboarding_finished_at").eq("id", userId).maybeSingle();
  // Ante un error no se bloquea la app: se vuelve a comprobar en la siguiente carga.
  if (error) return false;
  const done = Boolean(data?.onboarding_finished_at);
  onboarded.set(userId, done);
  return !done;
}

export function markOnboarded(userId: string) {
  onboarded.set(userId, true);
}
