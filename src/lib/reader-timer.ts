export type TimerDraft = {
  id: string;
  bookId: string;
  cycle: number;
  from: number;
  elapsed: number;
  runningSince: number | null;
  page: string;
  note: string;
};
export function elapsedMs(d: TimerDraft, now = Date.now()) {
  return Math.min(
    86_400_000,
    Math.max(0, d.elapsed + (d.runningSince === null ? 0 : Math.max(0, now - d.runningSince))),
  );
}
export function pauseTimer(d: TimerDraft, now = Date.now()): TimerDraft {
  return { ...d, elapsed: elapsedMs(d, now), runningSince: null };
}
export function parseTimer(raw: string | null, bookId: string, cycle: number): TimerDraft | null {
  try {
    const d = JSON.parse(raw ?? "null");
    if (
      !d ||
      d.bookId !== bookId ||
      d.cycle !== cycle ||
      !Number.isFinite(d.elapsed) ||
      d.elapsed < 0 ||
      !Number.isInteger(d.from) ||
      d.from < 0 ||
      typeof d.id !== "string" ||
      typeof d.page !== "string" ||
      typeof d.note !== "string" ||
      (d.runningSince !== null && !Number.isFinite(d.runningSince))
    )
      return null;
    return d;
  } catch {
    return null;
  }
}
