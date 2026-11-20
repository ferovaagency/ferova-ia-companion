import { createFileRoute } from "@tanstack/react-router";

// Whop avisa aquí cuando una membresía se activa, renueva o cancela.
export const Route = createFileRoute("/api/whop/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleWhopWebhook } = await import("@/lib/whop.server");
        return handleWhopWebhook(request);
      },
    },
  },
});
