-- Idempotente. Defensa en profundidad sobre la llave pública (anon), que viaja en el navegador.
-- Todas las tablas ya tienen RLS, pero Supabase concede por defecto INSERT/UPDATE/DELETE/TRUNCATE
-- a anon en cada tabla: si una política quedara mal escrita, un visitante sin sesión podría
-- escribir. TRUNCATE además no pasa por RLS.
-- Lo que anon sí necesita se mantiene: leer perfiles y contenidos públicos (vía RLS y
-- reader_share_payload) y enviar comentarios desde formularios públicos (feedback INSERT).

REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
DO $$ BEGIN
  IF to_regclass('public.feedback') IS NOT NULL THEN GRANT INSERT ON public.feedback TO anon; END IF;
END $$;

-- Acciones que solo tienen sentido con sesión: fuera del alcance de anon (también vía PUBLIC).
DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname IN (
       'reader_club_action', 'reader_friend_action', 'reader_joint_action', 'reader_copy_bingo',
       'reader_equip_reward', 'reader_share', 'reader_set_chapter_ends',
       'reader_close_club_participation', 'reader_connections')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
