import { describe, expect, it } from "vitest";
import { completedLines, describeCell } from "../src/lib/bingo";

describe("bingo lines", () => {
  it("finds nothing on an empty or scattered board", () => {
    expect(completedLines(3, new Set())).toEqual([]);
    expect(completedLines(3, new Set([0, 4, 5]))).toEqual([]);
  });
  it("detects rows, columns and both diagonals", () => {
    expect(completedLines(3, new Set([3, 4, 5]))).toEqual([[3, 4, 5]]);
    expect(completedLines(4, new Set([1, 5, 9, 13]))).toEqual([[1, 5, 9, 13]]);
    expect(completedLines(3, new Set([0, 4, 8]))).toEqual([[0, 4, 8]]);
    expect(completedLines(5, new Set([4, 8, 12, 16, 20]))).toEqual([[4, 8, 12, 16, 20]]);
  });
  it("counts every line on a full board", () => {
    expect(completedLines(3, new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]))).toHaveLength(8);
  });
  it("describes what each cell asks for", () => {
    expect(describeCell({ kind: "experience", label: "x", condition: "any", value: "" })).toMatch(/Experiencia/);
    expect(describeCell({ kind: "book", label: "x", condition: "max_pages", value: "250" })).toBe("Lectura · hasta 250 páginas");
    expect(describeCell({ kind: "book", label: "x", condition: "genre", value: "Poesía" })).toBe("Lectura · género Poesía");
  });
});
