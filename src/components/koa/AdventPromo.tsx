import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BookPlus, Gift } from "lucide-react";
import { Modal } from "./UI";
import { usePlan } from "@/hooks/use-plan";
import { adventCountdown, todayKey } from "@/lib/advent-countdown";

const SEEN_KEY = "koa-advent-promo";
const SKIP = ["/onboarding", "/admin", "/pro"];

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="adv-pebble text-center py-3 px-2 min-w-[4.5rem]">
      <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--adv-ember)" }}>{String(value).padStart(2, "0")}</p>
      <p className="koa-muted text-xs">{label}</p>
    </div>
  );
}

/** Una vez al día durante noviembre: cuenta regresiva y empujón a cargar libros. */
export function AdventPromo() {
  const { pathname } = useLocation();
  const { plan } = usePlan();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!adventCountdown(new Date())) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === todayKey(new Date())) return;
    } catch {
      // Sin almacenamiento se muestra igual.
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const left = adventCountdown(now);
  if (!open || !left || SKIP.some((p) => pathname.startsWith(p))) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, todayKey(new Date()));
    } catch {
      // Ignorado.
    }
  };
  const books = plan?.books ?? 0;

  return (
    <Modal title="Tu Adviento lector está por abrir" onClose={close}>
      <div className="adv-whisper">
        <img src="/koa/celebrate.webp" alt="" />
        <div>
          <p className="label">Del 1 al 24 de diciembre</p>
          <p>Cada día una ventana con un libro elegido para ti o un reto lector para mantener tu hábito.</p>
        </div>
      </div>
      <div className="flex justify-center gap-2 my-2" role="timer" aria-live="off" aria-label={`Faltan ${left.days} días y ${left.hours} horas`}>
        <Unit value={left.days} label="días" />
        <Unit value={left.hours} label="horas" />
        <Unit value={left.minutes} label="min" />
        <Unit value={left.seconds} label="seg" />
      </div>
      <p className="text-sm">
        <strong>Carga tus libros antes del 1 de diciembre.</strong> Koa elige las 24 ventanas a partir de lo que ya leíste y de lo que tienes pendiente: cuantos más libros tenga tu biblioteca, más precisas serán tus recomendaciones.
      </p>
      {plan && (
        <p className="koa-muted text-sm">
          {books === 0 ? "Aún no tienes libros en tu biblioteca." : `Hoy tienes ${books} ${books === 1 ? "libro" : "libros"} en tu biblioteca.`}
          {books < 10 ? " Con unos 10 Koa ya te conoce bastante bien." : " ¡Vas muy bien!"}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mt-2">
        <Link to="/library" className="koa-button" onClick={close}><BookPlus size={16} />Cargar mis libros</Link>
        <Link to="/adventures" className="koa-secondary" onClick={close}><Gift size={16} />Ver mi calendario</Link>
      </div>
    </Modal>
  );
}
