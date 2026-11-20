-- Idempotente: ya aplicada en producción el 2026-11-20; se puede volver a correr sin efectos.
-- Adviento con Koa: retos y experiencias en 10 de las 24 ventanas (2,4,7,9,11,14,16,18,21,23).
-- Las otras 14 siguen trayendo un libro del catálogo. Aditiva y posterior a 0016.
-- Completar un reto no escribe en el historial de lectura ni suma a la racha.

CREATE TABLE IF NOT EXISTS public.reader_advent_progress(
  calendar_id uuid NOT NULL REFERENCES public.reader_calendars(id) ON DELETE CASCADE,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 24),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  done_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_id, slot)
);
ALTER TABLE public.reader_advent_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reader_advent_progress FROM anon, authenticated;
GRANT SELECT ON public.reader_advent_progress TO authenticated;
DROP POLICY IF EXISTS own_advent_progress ON public.reader_advent_progress;
CREATE POLICY own_advent_progress ON public.reader_advent_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Debe coincidir con src/lib/advent-challenges.ts.
CREATE OR REPLACE FUNCTION public.reader_advent_challenge(p_slot integer) RETURNS TABLE(kind text, target integer)
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT v.kind, v.target FROM (VALUES
    (2,'self',0),(4,'pages',10),(7,'note',0),(9,'minutes',15),(11,'self',0),
    (14,'pages',20),(16,'note',0),(18,'minutes',20),(21,'self',0),(23,'pages',25)
  ) AS v(slot, kind, target) WHERE v.slot = p_slot
$$;

CREATE OR REPLACE FUNCTION public.complete_advent_challenge(p_calendar uuid, p_slot integer, p_zone text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.reader_calendars; ch record; today date; n integer;
BEGIN
  SELECT * INTO c FROM public.reader_calendars WHERE id = p_calendar AND user_id = auth.uid();
  IF NOT FOUND OR c.kind <> 'advent' THEN RAISE EXCEPTION 'No encontramos tu calendario.'; END IF;
  today := (now() AT TIME ZONE p_zone)::date;
  IF NOT public.advent_unlocked(c.year, p_slot, today) THEN
    RAISE EXCEPTION 'Este reto se abre el % de diciembre, según tu fecha local.', p_slot;
  END IF;
  SELECT * INTO ch FROM public.reader_advent_challenge(p_slot);
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta ventana trae un libro, no un reto.'; END IF;
  IF p_slot > 3 AND NOT public.reader_is_pro(auth.uid()) THEN
    RAISE EXCEPTION 'Con el plan gratis abres las ventanas 1 a 3. Pasa a Lee con Koa Pro para abrir las 24.';
  END IF;
  IF ch.kind = 'pages' THEN
    SELECT coalesce(sum(s.to_page - s.from_page), 0) INTO n
      FROM public.reading_sessions s JOIN public.books b ON b.id = s.book_id
     WHERE b.user_id = auth.uid() AND s.day = today;
    IF n < ch.target THEN RAISE EXCEPTION 'Hoy llevas % de % páginas. Registra tu avance en Leer y vuelve.', n, ch.target; END IF;
  ELSIF ch.kind = 'minutes' THEN
    SELECT coalesce(sum(coalesce(s.minutes, 0)), 0) INTO n
      FROM public.reading_sessions s JOIN public.books b ON b.id = s.book_id
     WHERE b.user_id = auth.uid() AND s.day = today;
    IF n < ch.target THEN RAISE EXCEPTION 'Hoy llevas % de % minutos. Registra tu lectura en Leer y vuelve.', n, ch.target; END IF;
  ELSIF ch.kind = 'note' THEN
    IF NOT EXISTS (SELECT 1 FROM public.reader_notes r WHERE r.user_id = auth.uid() AND (r.created_at AT TIME ZONE p_zone)::date = today) THEN
      RAISE EXCEPTION 'Guarda hoy una nota o una cita en tu cuaderno y vuelve.';
    END IF;
  END IF;
  INSERT INTO public.reader_advent_progress(calendar_id, slot, user_id) VALUES (c.id, p_slot, auth.uid())
  ON CONFLICT (calendar_id, slot) DO NOTHING;
  RETURN jsonb_build_object('slot', p_slot, 'done', true);
END $$;
REVOKE ALL ON FUNCTION public.complete_advent_challenge(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_advent_challenge(uuid, integer, text) TO authenticated;
