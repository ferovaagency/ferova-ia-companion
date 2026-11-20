import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Modal } from "./UI";
import { SOCIAL, nativeShare, nativeShareAvailable, shareTargets, shareText, shareUrl, type ShareInput } from "@/lib/share";

export function ShareButton({ input, label = "Compartir", className = "koa-secondary" }: { input: ShareInput; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = shareText(input);
  const url = shareUrl(input.kind);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Share2 size={16} />
        {label}
      </button>
      {open && (
        <Modal title="Comparte tu lectura" onClose={() => setOpen(false)}>
          <p className="koa-muted text-sm">
            Etiquétanos como <strong>{SOCIAL.handle}</strong> y usa <strong>{SOCIAL.hashtag}</strong>: compartimos las publicaciones de la comunidad.
          </p>
          <blockquote className="adv-whisper text-sm whitespace-pre-wrap break-words">{text}</blockquote>
          <div className="flex flex-wrap gap-2">
            {nativeShareAvailable() && (
              <button type="button" className="koa-button" onClick={() => void nativeShare(text, url).catch(() => undefined)}>
                <Share2 size={16} />
                Compartir…
              </button>
            )}
            {shareTargets(text, url).map((t) => (
              <a key={t.id} className="koa-secondary" href={t.href} target="_blank" rel="noopener noreferrer">
                {t.label}
              </a>
            ))}
          </div>
          <div className="mt-2">
            <button type="button" className="koa-secondary" onClick={() => void copy()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Texto copiado" : "Copiar texto para Instagram o TikTok"}
            </button>
            <p className="koa-muted text-xs mt-2">Instagram y TikTok no dejan precargar el texto: cópialo y pégalo en tu historia o publicación.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
