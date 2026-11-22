import { Star } from "lucide-react";

/** Texto de una calificación: 4 → "4", 4.5 → "4,5". */
export function formatStars(value: number | string | null | undefined) {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return "";
  return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

function StarIcon({ fill, size }: { fill: 0 | 0.5 | 1; size: string }) {
  return (
    <span className={`relative inline-block ${size}`} aria-hidden>
      <Star className={`absolute inset-0 ${size} text-muted-foreground`} />
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fill === 1 ? "100%" : "50%" }}>
          <Star className={`${size} fill-accent text-accent`} />
        </span>
      )}
    </span>
  );
}

const fillFor = (n: number, s: number): 0 | 0.5 | 1 => (n >= s ? 1 : n >= s - 0.5 ? 0.5 : 0);

/** Solo muestra las estrellas (perfiles y vistas previas). */
export function StarDisplay({ value, size = "w-4 h-4" }: { value: number | string | null | undefined; size?: string }) {
  const n = Number(value) || 0;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" role="img" aria-label={n ? `${formatStars(n)} de 5 estrellas` : "Sin valoración"}>
      {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} size={size} fill={fillFor(n, s)} />)}
    </span>
  );
}

/**
 * Selector de 0,5 a 5 estrellas. La mitad izquierda de cada estrella vale media,
 * la derecha la estrella completa. Pulsar el valor actual lo quita.
 */
export function StarRating({
  value, onChange, disabled, size = "w-7 h-7",
}: {
  value: number | string | null | undefined;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  size?: string;
}) {
  const current = Number(value) || 0;
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Estrellas, se permiten medias">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="relative inline-flex p-0.5">
          <StarIcon size={size} fill={fillFor(current, s)} />
          {[s - 0.5, s].map((v, half) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(current === v ? null : v)}
              aria-pressed={current === v}
              aria-label={`${formatStars(v)} ${v === 1 ? "estrella" : "estrellas"}`}
              className={`absolute inset-y-0 ${half ? "right-0" : "left-0"} w-1/2 rounded-sm disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
