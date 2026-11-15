import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PRIVACY_EVENT } from "@/lib/privacy-cache";
export function PrivateImage({ path, alt, className, viewer = supabase }: { path: string | null; alt: string; className?: string; viewer?: SupabaseClient<Database> }) {
  const [src, setSrc] = useState("");
  const [epoch, setEpoch] = useState(0);
  useEffect(()=>{const reset=()=>{setSrc("");setEpoch(n=>n+1);};window.addEventListener(PRIVACY_EVENT,reset);return()=>window.removeEventListener(PRIVACY_EVENT,reset);},[]);
  useEffect(() => {
    let active = true; let url = ""; setSrc("");
    if (path) void viewer.storage.from("reader-profile-media").download(path).then(({ data }) => { if (active && data) { url = URL.createObjectURL(data); setSrc(url); } });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [path, viewer, epoch]);
  return src ? <img src={src} alt={alt} className={className} /> : null;
}