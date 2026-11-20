import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADVENT_BOOK_SLOTS, ADVENT_CHALLENGES, challengeHint } from "../src/lib/advent-challenges";

describe("Advent challenges", () => {
  it("mixes 14 book windows with 10 challenge windows, never on the same day", () => {
    expect(ADVENT_CHALLENGES).toHaveLength(10);
    expect(ADVENT_BOOK_SLOTS).toHaveLength(14);
    const all = [...ADVENT_BOOK_SLOTS, ...ADVENT_CHALLENGES.map((c) => c.slot)].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(ADVENT_BOOK_SLOTS).toContain(1);
    expect(ADVENT_BOOK_SLOTS).toContain(24);
  });
  it("matches the verification rules in migration 0017", () => {
    const sql = readFileSync(new URL("../drizzle/migrations/0017_advent_challenges.sql", import.meta.url), "utf8");
    const tuples = [...sql.matchAll(/\((\d+),'(pages|minutes|note|self)',(\d+)\)/g)].map((m) => ({ slot: Number(m[1]), kind: m[2], target: Number(m[3]) }));
    expect(tuples).toEqual(ADVENT_CHALLENGES.map(({ slot, kind, target }) => ({ slot, kind, target })));
  });
  it("explains how each challenge is checked", () => {
    expect(challengeHint({ slot: 4, text: "", kind: "pages", target: 10 })).toMatch(/10 páginas/);
    expect(challengeHint({ slot: 2, text: "", kind: "self", target: 0 })).toMatch(/Márcalo tú/);
  });
});
