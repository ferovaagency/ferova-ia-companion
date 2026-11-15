import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
export async function readerContext(client: SupabaseClient<Database>, userId: string) {
  const books: Database["public"]["Tables"]["books"]["Row"][] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from("books").select("*").eq("user_id", userId).order("id").range(from, from + 499);
    if (error) throw error;
    books.push(...data);
    if (data.length < 500) break;
  }
  const [feelings, notes, prefs] = await Promise.all([
    client.from("reader_feelings").select("*").eq("user_id", userId),
    client.from("reader_notes").select("book_id,page,chapter,feeling_tags").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    client.from("reader_preferences").select("pace,moods").eq("user_id", userId).maybeSingle(),
  ]);
  for (const result of [feelings, notes, prefs]) if (result.error) throw result.error;
  return { books, feelings: feelings.data ?? [], pageFeelings: notes.data ?? [], preferences: prefs.data };
}