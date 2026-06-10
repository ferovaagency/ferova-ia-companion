import { BookOpen } from "lucide-react";
import type { Book } from "@/types";

interface BookCoverProps {
  book: Pick<Book, "title" | "author" | "cover_url">;
  className?: string;
}

const palettes = [
  "bg-gradient-to-tr from-[#3C3225] to-[#705e46] text-[#FAF8F5] border-amber-900/10",
  "bg-gradient-to-tr from-[#1E2522] to-[#45504b] text-[#FAF8F5] border-emerald-950/10",
  "bg-gradient-to-tr from-[#3D2024] to-[#784048] text-[#FAF8F5] border-rose-950/10",
  "bg-gradient-to-tr from-[#1F2432] to-[#454e66] text-[#FAF8F5] border-blue-950/10",
  "bg-gradient-to-tr from-[#504533] to-[#8C7A5C] text-[#FAF8F5] border-stone-800/10",
];

export function BookCover({ book, className = "w-16 h-24 text-xs" }: BookCoverProps) {
  if (book.cover_url) {
    return (
      <img
        src={book.cover_url}
        alt={`Portada de ${book.title}`}
        className={`${className} object-cover rounded shadow-md border border-border shrink-0`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  const charSum = book.title.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const palette = palettes[charSum % palettes.length];
  return (
    <div
      className={`${className} ${palette} rounded shadow-lg border-2 flex flex-col justify-between p-3 shrink-0 relative overflow-hidden select-none`}
      title={`${book.title} — ${book.author}`}
    >
      <div className="absolute left-1.5 inset-y-0 w-[2px] bg-white/10" />
      <div className="absolute top-0 inset-x-0 h-1 bg-white/20" />
      <div className="leading-tight font-black tracking-tight text-center line-clamp-3 mt-1.5 z-10" style={{ fontSize: "0.65rem" }}>
        {book.title}
      </div>
      <div className="flex flex-col items-center gap-1 z-10">
        <BookOpen className="w-2.5 h-2.5 opacity-40" />
        <div className="text-[7px] tracking-widest font-mono uppercase text-center opacity-80 truncate max-w-full">
          {book.author}
        </div>
      </div>
    </div>
  );
}