// Adviento con Koa: 24 ventanas. 14 traen un descubrimiento de libro y 10 traen un
// reto o una experiencia para cuidar el hábito de lectura.
// La verificación vive en drizzle/migrations/0017_advent_challenges.sql
// (reader_advent_challenge); tests/advent-challenges.test.ts comprueba que coincidan.
// Ningún reto suma a la racha: la racha solo cuenta avance real de lectura.

export type ChallengeKind = "pages" | "minutes" | "note" | "self";
export type AdventChallenge = { slot: number; text: string; kind: ChallengeKind; target: number };

export const ADVENT_CHALLENGES: AdventChallenge[] = [
  { slot: 2, text: "Prepara un rincón cómodo para leer", kind: "self", target: 0 },
  { slot: 4, text: "Lee 10 páginas", kind: "pages", target: 10 },
  { slot: 7, text: "Guarda en tu cuaderno una frase que te guste", kind: "note", target: 0 },
  { slot: 9, text: "Lee 15 minutos antes de dormir", kind: "minutes", target: 15 },
  { slot: 11, text: "Visita una librería o una biblioteca", kind: "self", target: 0 },
  { slot: 14, text: "Lee 20 páginas", kind: "pages", target: 20 },
  { slot: 16, text: "Escribe en tu cuaderno qué sentiste en un capítulo", kind: "note", target: 0 },
  { slot: 18, text: "Lee 20 minutos con el móvil lejos", kind: "minutes", target: 20 },
  { slot: 21, text: "Recomienda un libro a alguien", kind: "self", target: 0 },
  { slot: 23, text: "Lee 25 páginas", kind: "pages", target: 25 },
];

export const ADVENT_CHALLENGE_SLOTS = ADVENT_CHALLENGES.map((c) => c.slot);
export const ADVENT_BOOK_SLOTS = Array.from({ length: 24 }, (_, i) => i + 1).filter((s) => !ADVENT_CHALLENGE_SLOTS.includes(s));
export const challengeFor = (slot: number) => ADVENT_CHALLENGES.find((c) => c.slot === slot);

export function challengeHint(c: AdventChallenge): string {
  if (c.kind === "pages") return `Se cumple cuando registras hoy ${c.target} páginas o más en Leer.`;
  if (c.kind === "minutes") return `Se cumple cuando registras hoy ${c.target} minutos o más de lectura en Leer.`;
  if (c.kind === "note") return "Se cumple cuando guardas hoy una nota o una cita en tu cuaderno.";
  return "Márcalo tú cuando lo hayas hecho.";
}
