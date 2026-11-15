import { supabase } from "@/integrations/supabase/client";
export async function listData() {
  const [lists, items, books, wishes] = await Promise.all([supabase.from("reader_lists").select("*").order("created_at"), supabase.from("reader_list_items").select("*").order("position"), supabase.from("books").select("id,title,author"), supabase.from("reader_wishes").select("id,title,author")]);
  for (const r of [lists, items, books, wishes]) if (r.error) throw r.error;
  return { lists: lists.data ?? [], items: items.data ?? [], books: books.data ?? [], wishes: wishes.data ?? [] };
}
export const listsOptions = { queryKey: ["koa-lists"], queryFn: listData };