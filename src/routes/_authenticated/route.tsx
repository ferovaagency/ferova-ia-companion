import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/koa/UI";
import { getSessionUser, needsOnboarding } from "@/lib/session-user";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Sesión local: sin ida y vuelta al servidor en cada navegación.
    const { data } = await getSessionUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // Todo lector nuevo pasa primero por el onboarding (una consulta por carga).
    if (location.pathname !== "/onboarding" && (await needsOnboarding(data.user.id))) {
      throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
