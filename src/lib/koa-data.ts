import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Book } from "@/types";
export type Preferences = {
  user_id: string;
  pace: "gentle" | "weekend" | "flexible";
  moods: string[];
  onboarding_version: number;
  updated_at: string;
};
export type Note = {
  id: string;
  user_id: string;
  book_id: string;
  kind: "quote" | "note";
  content: string;
  reflection: string;
  page: number | null;
  chapter: string;
  tags: string[];
  feeling_tags?: string[];
  favorite: boolean;
  created_at: string;
};
export type Wish = {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string;
  created_at: string;
};
export type Conversation = {
  id: string;
  user_id: string;
  book_id: string;
  question: string;
  answer: string;
  created_at: string;
};
type Table<T, Required extends keyof T> = {
  Row: T;
  Insert: Pick<T, Required> & Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type KoaDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      reader_preferences: Table<Preferences, "user_id">;
      reader_notes: Table<Note, "book_id" | "content">;
      reader_wishes: Table<Wish, "title">;
      reader_conversations: Table<Conversation, "book_id" | "question" | "answer">;
      reader_timer_receipts: Table<
        {
          id: string;
          user_id: string;
          book_id: string;
          cycle: number;
          minutes: number;
          saved_at: string;
        },
        "id" | "user_id" | "book_id" | "cycle" | "minutes"
      >;
    };
    Functions: Omit<Database["public"]["Functions"], "set_bingo_cell"> & {
      // PostgreSQL accepts NULL to clear a cell; generated RPC arguments omit nullability.
      set_bingo_cell: { Args: { p_board: string; p_index: number; p_book: string | null; p_complete: boolean }; Returns: undefined };
      claim_koa_request: { Args: Record<string, never>; Returns: undefined };
      close_reader_session: {
        Args: {
          p_id: string;
          p_book: string;
          p_cycle: number;
          p_from: number;
          p_to: number;
          p_minutes: number;
          p_day: string;
          p_zone: string;
          p_note: string;
          p_finish: boolean;
        };
        Returns: undefined;
      };
    };
  };
};
// Schema extension lives beside its migration; generated integration files stay intact.
export const koaDb = supabase as unknown as SupabaseClient<KoaDatabase>;
export function userError(error: unknown) {
  const msg =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "No se pudo completar. Inténtalo de nuevo.";
  return /schema cache|does not exist|PGRST/i.test(msg)
    ? "Este módulo necesita terminar su actualización. Tu biblioteca y tu historial siguen disponibles."
    : msg;
}
export async function getBooks(): Promise<Book[]> {
  const result: Book[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 499);
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) return result;
  }
}
export function identity(title: string, author: string) {
  return `${title.trim().toLocaleLowerCase()}|${author.trim().toLocaleLowerCase()}`;
}
