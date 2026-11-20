import { describe, expect, it } from "vitest";
import { SOCIAL, shareTargets, shareText, shareUrl } from "../src/lib/share";
import { adventCountdown, todayKey } from "../src/lib/advent-countdown";

describe("compartir en redes", () => {
  it("cada texto etiqueta la cuenta y el hashtag", () => {
    const kinds = ["oracle", "chosen", "advent-book", "advent-challenge", "monthly", "bingo"] as const;
    for (const kind of kinds) {
      const t = shareText({ kind, title: "Rayuela", author: "Julio Cortázar", detail: "ventana 3", progress: { done: 4, total: 9, lines: 1 } });
      expect(t).toContain(SOCIAL.handle);
      expect(t).toContain(SOCIAL.hashtag);
    }
    expect(shareText({ kind: "oracle", title: "Rayuela", author: "Julio Cortázar" })).toContain("«Rayuela» de Julio Cortázar");
    expect(shareText({ kind: "bingo", detail: "Verano", progress: { done: 4, total: 9, lines: 2 } })).toContain("4 de 9 casillas en mi bingo lector «Verano» y ya canté 2 líneas");
  });

  it("los enlaces van codificados y con utm", () => {
    const url = shareUrl("oracle");
    expect(url).toContain("utm_campaign=oracle");
    const targets = shareTargets("Hola & #LeeConKoa", url);
    const wa = targets.find((t) => t.id === "whatsapp")!;
    expect(wa.href).toContain("%26%20%23LeeConKoa");
    expect(targets.every((t) => t.href.startsWith("https://"))).toBe(true);
  });
});

describe("cuenta regresiva de Adviento", () => {
  it("cuenta hasta el 1 de diciembre a medianoche local", () => {
    expect(adventCountdown(new Date(2026, 10, 30, 23, 59, 30))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 30 });
    expect(adventCountdown(new Date(2026, 10, 20, 12, 0, 0))?.days).toBe(10);
  });
  it("no aparece fuera de noviembre", () => {
    expect(adventCountdown(new Date(2026, 11, 1, 0, 0, 1))).toBeNull();
    expect(adventCountdown(new Date(2026, 9, 31))).toBeNull();
  });
  it("la clave diaria es la fecha local", () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
