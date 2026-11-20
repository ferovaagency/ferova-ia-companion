import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { clearPrivateView } from "@/lib/privacy-cache";
import { BookOpen, Library, NotebookPen, Sparkles, LogOut, Settings, Loader2, Compass, List, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export function Koa({
  pose = "welcome",
  className = "",
}: {
  pose?: "welcome" | "read" | "meditate" | "celebrate";
  className?: string;
}) {
  return (
    <img
      src={`/koa/${pose}.webp`}
      alt={`Koa, tu compañero lector`}
      className={`koa-portrait ${className}`}
      width={320}
      height={320}
    />
  );
}
export function Brand() {
  return (
    <Link to="/discover" className="koa-brand">
      <img src="/koa/icon.webp" alt="" width={40} height={40} />
      <span>
        Lee con Koa<small>Tu próxima lectura empieza contigo</small>
      </span>
    </Link>
  );
}
const tabs = [
  { to: "/discover", label: "Descubrir", icon: Sparkles },
  { to: "/library", label: "Biblioteca", icon: Library },
  { to: "/read", label: "Leer", icon: BookOpen },
  { to: "/adventures", label: "Aventuras", icon: Compass },
  { to: "/refuge", label: "Mi refugio", icon: House },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <div className="koa-app">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="koa-header">
        <Brand />
        <nav aria-label="Navegación principal" className="koa-desktop-nav">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to} className={pathname.startsWith(t.to) ? "active" : ""}>
              <t.icon size={16} />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <Link to="/notebook" search={{ book: undefined }} className="koa-icon" aria-label="Cuaderno" title="Cuaderno"><NotebookPen size={18} /></Link>
          <Link to="/lists" className="koa-icon" aria-label="Mis listas" title="Mis listas"><List size={18} /></Link>
          <Link to="/settings" className="koa-icon" aria-label="Ajustes y ayuda">
            <Settings size={18} />
          </Link>
          <Button variant="ghost" size="icon"
            className="koa-icon"
            aria-label="Cerrar sesión"
            onClick={async () => {
              await queryClient.cancelQueries();
              clearPrivateView(queryClient);
              await supabase.auth.signOut();
              await navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>
      <div id="main-content" className="koa-container">
        {children}
      </div>
      <nav aria-label="Navegación móvil" className="koa-mobile-nav">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className={pathname.startsWith(t.to) ? "active" : ""}>
            <t.icon size={20} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
      <footer className="koa-footer">
        Lee con Koa <span>Un libro para tu momento. A tu ritmo.</span>
      </footer>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="koa-page-title">
      <div>
        <p className="koa-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="koa-muted mt-3 max-w-2xl">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="koa-error">
      {children}
      {typeof children === "string" && /Lee con Koa Pro/.test(children) && (
        <>
          {" "}
          <Link to="/pro" className="underline font-semibold">Ver Lee con Koa Pro</Link>
        </>
      )}
    </p>
  );
}
export function Loading() {
  return (
    <div role="status" className="py-20 flex justify-center gap-3">
      <Loader2 className="animate-spin" /> Preparando tu refugio…
    </div>
  );
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="koa-empty">
      <Koa pose="read" className="w-32 mx-auto" />
      <h2>{title}</h2>
      <div className="koa-muted mt-3">{children}</div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={wide ? "koa-modal sm:max-w-4xl" : "koa-modal"} aria-describedby={undefined}>
        <DialogTitle>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function KoaMessage({ children }: { children: ReactNode }) {
  return (
    <aside className="koa-message">
      <img src="/koa/welcome.webp" alt="" />
      <div>
        <p className="koa-eyebrow text-accent mb-2">Un momento con Koa</p>
        <p>{children}</p>
      </div>
    </aside>
  );
}
