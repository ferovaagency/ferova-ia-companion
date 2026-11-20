import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanStatus } from "@/lib/plans.functions";

/**
 * Plan del lector. `isFree` solo es true cuando el servidor confirma el plan gratis:
 * si el estado no se puede leer, la pantalla no bloquea nada (la base de datos manda).
 */
export function usePlan() {
  const read = useServerFn(getPlanStatus);
  const query = useQuery({ queryKey: ["koa-plan"], queryFn: () => read(), staleTime: 60_000, retry: 1 });
  return { ...query, plan: query.data, isFree: query.data?.pro === false, isPro: query.data?.pro === true };
}
