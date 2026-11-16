import { useState } from "react";
import { PrivateImage } from "@/components/koa/PrivateImage";
import { BookOpen } from "lucide-react";
import type { Book } from "@/types";

interface BookCoverProps {
  book: Pick<Book, "title" | "author" | "cover_url"> & { private_cover_path?: string | null };
  className?: string;
}


export function BookCover({ book, className = "w-16 h-24 text-xs" }: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (book.private_cover_path) return <PrivateImage path={book.private_cover_path} alt={`Portada de ${book.title}`} className={`${className} object-cover rounded-md border border-border shrink-0`} fallback={<BookCover book={{ ...book, private_cover_path: null }} className={className} />}/>;
  if (book.cover_url && book.cover_url !== failedUrl) {
    return (
      <img
        src={book.cover_url}
        onError={() => setFailedUrl(book.cover_url)}
        alt={`Portada de ${book.title}`}
        className={`${className} object-cover rounded shadow-md border border-border shrink-0`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  const palette = "bg-secondary text-foreground border-border";
  return (
    <div
      className={`${className} ${palette} rounded shadow-lg border-2 flex flex-col justify-between p-3 shrink-0 relative overflow-hidden select-none`}
      title={`${book.title} — ${book.author}`}
    >
      <div className="absolute left-1.5 inset-y-0 w-[2px] bg-border" />
      <div className="absolute top-0 inset-x-0 h-1 bg-border" />
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