export function localDay(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function readingStreak(days: string[], today: string) {
  const active = new Set(days.map((day) => Date.parse(day + "T00:00:00Z") / 86400000));
  const current = Date.parse(today + "T00:00:00Z") / 86400000;
  let cursor = active.has(current) ? current : current - 1;
  let count = 0;
  while (active.has(cursor--)) count++;
  return count;
}

export function isbn13(raw: string) {
  const value = raw.replace(/[\s-]/g, "").toUpperCase();
  const digit = (prefix: string) =>
    (10 - ([...prefix].reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0) % 10)) % 10;
  if (/^(978|979)\d{10}$/.test(value) && digit(value.slice(0, 12)) === Number(value[12]))
    return value;
  if (
    /^\d{9}[\dX]$/.test(value) &&
    [...value].reduce((n, c, i) => n + (c === "X" ? 10 : Number(c)) * (10 - i), 0) % 11 === 0
  ) {
    const prefix = "978" + value.slice(0, 9);
    return prefix + digit(prefix);
  }
  return null;
}
