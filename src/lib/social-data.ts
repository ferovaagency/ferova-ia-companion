import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const profileSchema = z.object({ handle: z.string().regex(/^[a-z0-9_]{3,30}$/), name: z.string().max(100), bio: z.string().max(1200), visibility: z.enum(["private", "friends", "club", "public"]), club_id: z.string().uuid().nullable(), avatar_path: z.string().nullable(), cover_path: z.string().nullable() });
export type ProfileInput = z.infer<typeof profileSchema>;
export const connectionSchema = z.array(z.object({ handle: z.string(), state: z.enum(["pending", "accepted"]), incoming: z.boolean() }));
export const summarySchema = z.object({ streak: z.number(), my_percent: z.number(), participants: z.array(z.object({ handle: z.string(), percent: z.number().nullable(), days: z.number() })) });
export const payloadSchema = z.object({ title: z.string(), author: z.string().optional(), stars: z.number().nullable().optional(), description: z.string().optional(), purpose: z.string().optional(), items: z.array(z.object({ title: z.string().nullable(), author: z.string().nullable() })).optional() }).passthrough();
export async function socialData() {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error("Inicia sesión.");
  const id = user.data.user.id;
  const [profile, clubs, invites, shares, connections, books, lists, bingos, blocks] = await Promise.all([
    supabase.from("reader_social_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("reader_clubs").select("*"), supabase.from("reader_club_invites").select("*"),
    supabase.from("reader_shares").select("*").eq("user_id", id), supabase.rpc("reader_connections"),
    supabase.from("books").select("id,title,author"), supabase.from("reader_lists").select("id,name"),
    supabase.from("reader_bingos").select("id,title,state"), supabase.from("reader_blocks").select("blocked_id"),
  ]);
  for (const r of [profile, clubs, invites, shares, connections, books, lists, bingos, blocks]) if (r.error) throw r.error;
  return { id, profile: profile.data, clubs: clubs.data ?? [], invites: invites.data ?? [], shares: shares.data ?? [], connections: connectionSchema.parse(connections.data), books: books.data ?? [], lists: lists.data ?? [], bingos: bingos.data ?? [], blocks: blocks.data ?? [] };
}
export const socialOptions = { queryKey: ["koa-social"], queryFn: socialData };
export async function visibleShares() {
  const result = await supabase.from("reader_shares").select("id,user_id,kind,visibility,club_id").neq("visibility", "private");
  if (result.error) throw result.error;
  return Promise.all((result.data ?? []).map(async (share) => {
    const payload = await supabase.rpc("reader_share_payload", { p_id: share.id });
    if (payload.error) throw payload.error;
    return { ...share, payload: payload.data ? payloadSchema.parse(payload.data) : null };
  }));
}
export const sharedOptions = { queryKey: ["koa-shared"], queryFn: visibleShares };
export async function uploadProfileImage(file: File, kind: "avatar" | "cover", userId: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error("Elige JPG, PNG o WebP de hasta 5 MB.");
  const image = await createImageBitmap(file);
  try {
    if (image.width > 8192 || image.height > 8192 || image.width < 32 || image.height < 32) throw new Error("Revisa el tamaño de la imagen (32–8192 píxeles).");
    // Decode then re-encode: strips embedded metadata and rejects disguised image files.
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No pudimos preparar la imagen.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("No pudimos preparar la imagen.")), "image/webp", .86));
    const path = `${userId}/${kind}/${crypto.randomUUID()}.webp`;
    const result = await supabase.storage.from("reader-profile-media").upload(path, blob, { contentType: "image/webp", upsert: false });
    if (result.error) throw result.error;
    return path;
  } finally { image.close(); }
}