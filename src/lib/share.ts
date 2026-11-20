// Compartir en redes. Un solo lugar para la marca: cambia aquí la cuenta y el hashtag.
// PENDIENTE DE CONFIRMAR: las cuentas oficiales de Lee con Koa en cada red.
export const SOCIAL = {
  handle: "@leeconkoa",
  hashtag: "#LeeConKoa",
  site: "https://librero-ia.ferova.com.co",
} as const;

export type ShareKind = "oracle" | "chosen" | "advent-book" | "advent-challenge" | "monthly" | "bingo";

export type ShareInput = {
  kind: ShareKind;
  title?: string;
  author?: string;
  /** Texto libre: el reto, el nombre del bingo, la ventana… */
  detail?: string;
  progress?: { done: number; total: number; lines?: number };
};

const book = (i: ShareInput) => (i.title ? `«${i.title}»${i.author ? ` de ${i.author}` : ""}` : "un libro");

export function shareText(i: ShareInput): string {
  const tag = `${SOCIAL.handle} ${SOCIAL.hashtag}`;
  switch (i.kind) {
    case "oracle":
      return `El Oráculo de Koa me recomendó ${book(i)} 📚✨ ¿Lo has leído? ${tag}`;
    case "chosen":
      return `Mi próxima lectura: ${book(i)}. La elegí con el Oráculo de Koa 📖 ${tag}`;
    case "advent-book":
      return `Abrí la ${i.detail ?? "ventana"} de mi calendario de Adviento lector y me trajo ${book(i)} 🎁📚 ${tag}`;
    case "advent-challenge":
      return `Reto lector de Adviento cumplido${i.detail ? `: ${i.detail}` : ""} ✅📚 ${tag}`;
    case "monthly":
      return `Mi lectura de ${i.detail ?? "este mes"}: ${book(i)} 📅📚 ${tag}`;
    case "bingo": {
      const p = i.progress;
      const lines = p?.lines ? ` y ya canté ${p.lines} ${p.lines === 1 ? "línea" : "líneas"}` : "";
      return `Voy ${p ? `${p.done} de ${p.total} casillas` : "avanzando"} en mi bingo lector «${i.detail ?? "Bingo"}»${lines} 🎯📚 ${tag}`;
    }
  }
}

export function shareUrl(kind: ShareKind) {
  const u = new URL(SOCIAL.site);
  u.searchParams.set("utm_source", "share");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", kind);
  return u.toString();
}

export type ShareTarget = { id: string; label: string; href: string };

/** Redes que aceptan texto o enlace por URL. Instagram y TikTok no: se copia el texto. */
export function shareTargets(text: string, url: string): ShareTarget[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const both = encodeURIComponent(`${text} ${url}`);
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${both}` },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
    { id: "threads", label: "Threads", href: `https://www.threads.net/intent/post?text=${both}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}

type CapShare = { share: (o: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown> };
const capShare = () =>
  typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: { Plugins?: { Share?: CapShare } } }).Capacitor?.Plugins?.Share;

/** Hoja nativa: plugin de Capacitor en la app de tienda, Web Share en el navegador. */
export function nativeShareAvailable() {
  if (typeof window === "undefined") return false;
  return Boolean(capShare() || typeof navigator.share === "function");
}

export async function nativeShare(text: string, url: string) {
  const cap = capShare();
  if (cap) return cap.share({ title: "Lee con Koa", text, url, dialogTitle: "Compartir" });
  return navigator.share({ title: "Lee con Koa", text, url });
}
