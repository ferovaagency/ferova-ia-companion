// Planes de Lee con Koa. Los mismos límites se validan en la base de datos
// (drizzle/migrations/0016_reader_plans_whop.sql); este archivo solo los muestra.

export const PRICES = {
  monthly: { usd: 7, label: "7 USD al mes" },
  yearly: { usd: 70, label: "70 USD al año", note: "Equivale a 5,83 USD al mes: 2 meses gratis" },
} as const;
export type PlanKind = keyof typeof PRICES;

export const FREE_LIMITS = {
  oracle: 3,
  koa_chat: 5,
  koa_ocr: 3,
  books: 50,
  lists: 3,
  bingos: 1,
  adventWindows: 3,
  historyMonths: 6,
} as const;

export type PlanStatus = {
  pro: boolean;
  plan: PlanKind | null;
  source: string;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  books: number;
  lists: number;
  bingos: number;
  usage: Partial<Record<"oracle" | "koa_chat" | "koa_ocr", number>>;
  manageUrl?: string | null;
};

export const PLAN_ROWS: { feature: string; free: string; pro: string }[] = [
  { feature: "Oráculo (Descubrir)", free: "3 consultas al mes", pro: "Ilimitado" },
  { feature: "Biblioteca", free: "50 libros", pro: "Ilimitada" },
  { feature: "Escáner ISBN e importar Goodreads", free: "Sí", pro: "Sí" },
  { feature: "Reconocer portada con foto", free: "—", pro: "Sí" },
  { feature: "Progreso y rachas", free: "Completo", pro: "Completo" },
  { feature: "Historial de lectura", free: "Últimos 6 meses visibles", pro: "Completo" },
  { feature: "Chat con Koa y resumen de notas", free: "5 al mes", pro: "Ilimitado" },
  { feature: "Cuaderno de notas y citas", free: "Ilimitado", pro: "Ilimitado" },
  { feature: "Transcribir foto de una página", free: "3 al mes", pro: "Ilimitado" },
  { feature: "Exportar cuaderno a PDF", free: "—", pro: "Sí" },
  { feature: "Valoraciones, lágrimas y tier", free: "Sí", pro: "Sí" },
  { feature: "Listas propias", free: "3 listas", pro: "Ilimitadas" },
  { feature: "Bingos", free: "1 bingo de Koa y unirte a compartidos", pro: "Ilimitados, crear, importar y Oráculo por casilla" },
  { feature: "Adviento con Koa", free: "Ventanas 1 a 3", pro: "Las 24 ventanas" },
  { feature: "Un año de lecturas", free: "—", pro: "Sí" },
  { feature: "Perfil, amistades y unirse a clubes", free: "Sí", pro: "Sí" },
  { feature: "Crear clubes y lecturas conjuntas", free: "—", pro: "Sí" },
  { feature: "Portadas propias y personalización", free: "Básica", pro: "Completa" },
];

/** Un mensaje de error que invita a Pro (para mostrar el enlace a /pro). */
export const mentionsPro = (message: string) => /Lee con Koa Pro/.test(message);
