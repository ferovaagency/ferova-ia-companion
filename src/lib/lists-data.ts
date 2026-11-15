import { supabase } from "@/integrations/supabase/client";
export async function listData() {
  async function allBooks() {
    const result: { id: string; title: string; author: string }[] = [];
    for (let from = 0; ; from += 500) {
      const page = await supabase.from("books").select("id,title,author").order("id").range(from, from + 499);
      if (page.error) throw page.error;
      result.push(...page.data);
      if (page.data.length < 500) return result;
    }
  }
  const [lists, items, shelf, wishes] = await Promise.all([supabase.from("reader_lists").select("*").order("created_at"), supabase.from("reader_list_items").select("*").order("position").order("id"), allBooks(), supabase.from("reader_wishes").select("id,title,author")]);
  for (const r of [lists, items, wishes]) if (r.error) throw r.error;
  return { lists: lists.data ?? [], items: items.data ?? [], books: shelf, wishes: wishes.data ?? [] };
}
export const listsOptions = { queryKey: ["koa-lists"], queryFn: listData };