import { useQuery } from "@tanstack/react-query";
import { getBooks } from "@/lib/koa-data";
import { getSessionUser } from "@/lib/session-user";
export function useReader() {
  return useQuery({ queryKey: ["koa-books"], queryFn: getBooks, staleTime: 30_000 });
}
export async function currentUser() {
  const { data } = await getSessionUser();
  if (!data.user) throw new Error("Vuelve a iniciar sesión.");
  return data.user;
}
