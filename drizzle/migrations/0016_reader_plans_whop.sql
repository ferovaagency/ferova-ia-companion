-- Idempotente: ya aplicada en producción el 2026-11-20; se puede volver a correr sin efectos.
-- Planes Gratis / Pro (Whop). Aditiva: no borra datos y no cambia las RPC existentes.
-- Pro = memberships.is_paid (Whop, cortesía, manual o admin). Los límites se validan aquí,
-- no solo en pantalla.

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS whop_membership_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS plan text CHECK (plan IS NULL OR plan IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  -- Vencimiento de un acceso de cortesía o manual (NULL = sin vencimiento).
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

ALTER TABLE public.courtesy_accounts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '' CHECK (length(note) <= 300);

CREATE OR REPLACE FUNCTION public.reader_is_pro(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_user IS NOT NULL AND (
    EXISTS(SELECT 1 FROM public.memberships m WHERE m.user_id=p_user AND m.is_paid AND (m.access_expires_at IS NULL OR m.access_expires_at > now()))
    OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role='admin')
  )
$$;
REVOKE ALL ON FUNCTION public.reader_is_pro(uuid) FROM PUBLIC, anon, authenticated;

-- Contadores mensuales (UTC) de funciones con IA.
CREATE TABLE IF NOT EXISTS public.reader_feature_usage(
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  month date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (user_id, feature, month)
);
ALTER TABLE public.reader_feature_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reader_feature_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reader_feature_limit(p_feature text) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE p_feature
    WHEN 'oracle' THEN 3
    WHEN 'koa_chat' THEN 5
    WHEN 'koa_ocr' THEN 3
    ELSE 0 END
$$;

-- Consume una unidad. Pro: sin tope mensual (el límite por hora sigue en claim_koa_request).
-- Gratis: tope mensual; las funciones con límite 0 son solo Pro.
CREATE OR REPLACE FUNCTION public.claim_reader_feature(p_feature text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lim integer; n integer; m date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_feature NOT IN ('oracle','koa_chat','koa_ocr','cover_vision','image_import','bingo_oracle','monthly_calendar','cover_upload') THEN
    RAISE EXCEPTION 'Función desconocida.';
  END IF;
  IF public.reader_is_pro(auth.uid()) THEN RETURN -1; END IF;
  lim := public.reader_feature_limit(p_feature);
  IF lim = 0 THEN RAISE EXCEPTION 'Esta función es parte de Lee con Koa Pro.'; END IF;
  INSERT INTO public.reader_feature_usage(user_id, feature, month, used) VALUES (auth.uid(), p_feature, m, 1)
  ON CONFLICT (user_id, feature, month) DO UPDATE SET used = public.reader_feature_usage.used + 1
  RETURNING used INTO n;
  IF n > lim THEN
    RAISE EXCEPTION 'Usaste tus % de este mes en el plan gratis. Se renuevan el día 1, o pasa a Lee con Koa Pro.',
      CASE p_feature WHEN 'oracle' THEN lim || ' consultas del Oráculo' WHEN 'koa_chat' THEN lim || ' conversaciones con Koa' ELSE lim || ' transcripciones de fotos' END;
  END IF;
  RETURN lim - n;
END $$;
REVOKE ALL ON FUNCTION public.claim_reader_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_reader_feature(text) TO authenticated;

-- Estado del plan para la pantalla (solo del propio usuario).
CREATE OR REPLACE FUNCTION public.reader_plan_status() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'pro', public.reader_is_pro(auth.uid()),
    'plan', m.plan, 'source', coalesce(m.payment_source, 'none'), 'status', m.status,
    'current_period_end', m.current_period_end, 'cancel_at_period_end', coalesce(m.cancel_at_period_end, false),
    'access_expires_at', m.access_expires_at,
    'books', (SELECT count(*) FROM public.books b WHERE b.user_id = auth.uid()),
    'lists', (SELECT count(*) FROM public.reader_lists l WHERE l.user_id = auth.uid() AND l.annual_year IS NULL),
    'bingos', (SELECT count(*) FROM public.reader_bingos g WHERE g.user_id = auth.uid()),
    'usage', coalesce((SELECT jsonb_object_agg(u.feature, u.used) FROM public.reader_feature_usage u
                       WHERE u.user_id = auth.uid() AND u.month = date_trunc('month', now() AT TIME ZONE 'UTC')::date), '{}'::jsonb)
  )
  FROM (SELECT 1) one LEFT JOIN public.memberships m ON m.user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.reader_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reader_plan_status() TO authenticated;

-- Topes de cantidad del plan gratis.
CREATE OR REPLACE FUNCTION public.reader_enforce_free_caps() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid; n integer;
BEGIN
  IF TG_TABLE_NAME = 'books' THEN
    who := NEW.user_id;
    IF NOT public.reader_is_pro(who) THEN
      SELECT count(*) INTO n FROM public.books WHERE user_id = who;
      IF n >= 50 THEN RAISE EXCEPTION 'Tu plan gratis guarda hasta 50 libros. Pasa a Lee con Koa Pro para una biblioteca ilimitada.'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'reader_lists' THEN
    who := NEW.user_id;
    IF NEW.annual_year IS NULL AND NOT public.reader_is_pro(who) THEN
      SELECT count(*) INTO n FROM public.reader_lists WHERE user_id = who AND annual_year IS NULL;
      IF n >= 3 THEN RAISE EXCEPTION 'Tu plan gratis incluye 3 listas propias. Pasa a Lee con Koa Pro para crear más.'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'reader_bingos' THEN
    who := NEW.user_id;
    IF NOT public.reader_is_pro(who) THEN
      SELECT count(*) INTO n FROM public.reader_bingos WHERE user_id = who;
      IF n >= 1 THEN RAISE EXCEPTION 'Tu plan gratis incluye un bingo. Pasa a Lee con Koa Pro para tener todos los que quieras.'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'reader_clubs' THEN
    IF NOT public.reader_is_pro(NEW.owner_id) THEN RAISE EXCEPTION 'Crear clubes es parte de Lee con Koa Pro. Puedes unirte a clubes con el plan gratis.'; END IF;
  ELSIF TG_TABLE_NAME = 'reader_joint_readings' THEN
    IF auth.uid() IS NOT NULL AND NOT public.reader_is_pro(auth.uid()) THEN RAISE EXCEPTION 'Crear lecturas conjuntas es parte de Lee con Koa Pro. Puedes participar en las de tu club.'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reader_enforce_free_caps() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reader_free_cap_books ON public.books;
CREATE TRIGGER reader_free_cap_books BEFORE INSERT ON public.books FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_free_caps();
DROP TRIGGER IF EXISTS reader_free_cap_lists ON public.reader_lists;
CREATE TRIGGER reader_free_cap_lists BEFORE INSERT ON public.reader_lists FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_free_caps();
DROP TRIGGER IF EXISTS reader_free_cap_bingos ON public.reader_bingos;
CREATE TRIGGER reader_free_cap_bingos BEFORE INSERT ON public.reader_bingos FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_free_caps();
DROP TRIGGER IF EXISTS reader_free_cap_clubs ON public.reader_clubs;
CREATE TRIGGER reader_free_cap_clubs BEFORE INSERT ON public.reader_clubs FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_free_caps();
DROP TRIGGER IF EXISTS reader_free_cap_joint ON public.reader_joint_readings;
CREATE TRIGGER reader_free_cap_joint BEFORE INSERT ON public.reader_joint_readings FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_free_caps();

-- Adviento gratis: solo las ventanas 1 a 3 se pueden abrir.
CREATE OR REPLACE FUNCTION public.reader_enforce_advent_free() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.reader_calendars;
BEGIN
  IF OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL AND NEW.slot > 3 THEN
    SELECT * INTO c FROM public.reader_calendars WHERE id = NEW.calendar_id;
    IF c.kind = 'advent' AND NOT public.reader_is_pro(c.user_id) THEN
      RAISE EXCEPTION 'Con el plan gratis abres las ventanas 1 a 3. Pasa a Lee con Koa Pro para abrir las 24.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reader_enforce_advent_free() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS reader_advent_free_windows ON public.reader_calendar_entries;
CREATE TRIGGER reader_advent_free_windows BEFORE UPDATE ON public.reader_calendar_entries FOR EACH ROW EXECUTE FUNCTION public.reader_enforce_advent_free();

-- Resumen por lector para el panel de admin (solo el servidor, con la llave de servicio).
CREATE OR REPLACE FUNCTION public.reader_admin_overview() RETURNS TABLE(user_id uuid, books bigint, usage jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT u.id,
    (SELECT count(*) FROM public.books b WHERE b.user_id = u.id),
    coalesce((SELECT jsonb_object_agg(f.feature, f.used) FROM public.reader_feature_usage f
              WHERE f.user_id = u.id AND f.month = date_trunc('month', now() AT TIME ZONE 'UTC')::date), '{}'::jsonb)
  FROM auth.users u
$$;
REVOKE ALL ON FUNCTION public.reader_admin_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reader_admin_overview() TO service_role;
