import { useQuery } from "@tanstack/react-query";
import { getBooks } from "@/lib/koa-data";
import { supabase } from "@/integrations/supabase/client";
export function useReader() {
  return useQuery({ queryKey: ["koa-books"], queryFn: getBooks, staleTime: 0 });
}
export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Vuelve a iniciar sesión.");
  return data.user;
}
