import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function PrivateImage({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true; let url = ""; setSrc("");
    if (path) void supabase.storage.from("reader-profile-media").download(path).then(({ data }) => { if (active && data) { url = URL.createObjectURL(data); setSrc(url); } });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return src ? <img src={src} alt={alt} className={className} /> : null;
}