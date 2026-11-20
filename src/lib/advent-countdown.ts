/** Tiempo hasta el 1 de diciembre a medianoche local. null fuera de noviembre. */
export function adventCountdown(now: Date): { days: number; hours: number; minutes: number; seconds: number } | null {
  if (now.getMonth() !== 10) return null;
  const ms = new Date(now.getFullYear(), 11, 1).getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** Fecha local YYYY-MM-DD (para mostrar el aviso una vez al día). */
export const todayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
