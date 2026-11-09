import { isbn13 } from "./reading";
import type { Book, BookStatus } from "@/types";

function csv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw Error("Hay comillas sin cerrar en el CSV.");
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const number = (s: string) => (/^\d+$/.test(s) ? Number(s) : 0);
function signature(title: string, author: string) {
  return (title.trim() + "|" + author.trim())
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
export function previewGoodreads(text: string, books: Book[]) {
  const [header, ...lines] = csv(text);
  if (!["Book Id", "Title", "Author", "Exclusive Shelf"].every((k) => header?.includes(k)))
    throw Error("Selecciona el CSV de exportación de Goodreads.");
  const ids = new Set(books.map((b) => b.goodreads_id)),
    isbns = new Set(books.map((b) => b.isbn));
  const names = new Set(books.map((b) => signature(b.title, b.author)));
  return lines.map((line, index) => {
    const get = (k: string) => (line[header.indexOf(k)] ?? "").trim();
    const sourceId = get("Book Id"),
      title = get("Title"),
      author = get("Author") || "Autor desconocido";
    const rawIsbn = get("ISBN13").replace(/[="]/g, "") || get("ISBN").replace(/[="]/g, "");
    const isbn = isbn13(rawIsbn),
      shelf = get("Exclusive Shelf");
    const states: Record<string, BookStatus> = {
      read: "READ",
      "currently-reading": "READING",
      "to-read": "TBR",
      paused: "PAUSED",
      "on-hold": "PAUSED",
      dnf: "ABANDONED",
      "did-not-finish": "ABANDONED",
    };
    const rawDay = get("Date Read").replaceAll("/", "-");
    const date = new Date(rawDay + "T12:00:00Z");
    const lastDay =
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === rawDay ? rawDay : null;
    const pages = number(get("Number of Pages")),
      reads = number(get("Read Count")),
      rating = number(get("My Rating"));
    const data = {
      sourceId,
      title,
      author,
      isbn,
      pages,
      reads,
      rating: rating >= 1 && rating <= 5 ? rating : null,
      review: get("My Review") || null,
      status: states[shelf] ?? "TBR",
      lastDay,
    };
    const key = signature(title, author);
    let reason = "";
    if (!/^\d{1,20}$/.test(sourceId) || !title || reads > 1000 || pages > 2147483647)
      reason = "Fila inválida";
    else if (ids.has(sourceId) || (isbn && isbns.has(isbn))) reason = "Ya registrado";
    const review =
      !reason &&
      (names.has(key) ||
        !states[shelf] ||
        Boolean(rawIsbn && !isbn) ||
        Boolean(rawDay && !lastDay));
    if (!reason) {
      ids.add(sourceId);
      if (isbn) isbns.add(isbn);
      names.add(key);
    }
    return { index, data, reason, review };
  });
}
