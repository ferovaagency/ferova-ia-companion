import { supabase } from "@/integrations/supabase/client";
import { bingoDraftSchema, type BingoDraft } from "./bingo";

export async function getBingos() {
  const { data, error } = await supabase.from("reader_bingos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((board) => ({ ...board, ...bingoDraftSchema.parse(board) }));
}
export async function getBingoProgress() {
  const { data, error } = await supabase.from("reader_bingo_progress").select("*");
  if (error) throw error;
  return data ?? [];
}
export async function saveBingo(input: BingoDraft, id?: string) {
  const draft = bingoDraftSchema.parse(input);
  const result = id
    ? await supabase.from("reader_bingos").update(draft).eq("id", id).eq("state", "draft").select("id").single()
    : await supabase.from("reader_bingos").insert(draft).select("id").single();
  if (result.error) throw result.error;
  return result.data.id;
}
export const bingoQueryOptions = { queryKey: ["koa-bingos"], queryFn: getBingos };
export const bingoProgressQueryOptions = { queryKey: ["koa-bingo-progress"], queryFn: getBingoProgress };