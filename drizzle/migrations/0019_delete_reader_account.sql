-- Idempotente. Borrado de cuenta desde la app (exigido por App Store 5.1.1(v) y Google Play).
-- auth.users ya borra en cascada perfiles, libros, notas, deseos, conversaciones y uso;
-- esta función limpia el resto de tablas del lector, que guardan user_id sin llave foránea.
-- Los mensajes de feedback se conservan anónimos. Solo la ejecuta el servidor (service_role).

CREATE OR REPLACE FUNCTION public.validate_reader_bingo() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c jsonb;
BEGIN
 -- Borrado de cuenta: el lector se va con todas sus aventuras, también las activas.
 IF TG_OP='DELETE' AND current_setting('koa.account_deletion', true) = OLD.user_id::text THEN RETURN OLD; END IF;
 -- Y los bingos que otros copiaron de él solo pierden el vínculo con el original.
 IF TG_OP='UPDATE' AND coalesce(current_setting('koa.account_deletion', true), '') <> '' AND NEW.shared_source_id IS NULL
    AND (to_jsonb(NEW) - 'shared_source_id') = (to_jsonb(OLD) - 'shared_source_id') THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.state<>'draft' THEN RAISE EXCEPTION 'Solo puedes eliminar borradores.'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='INSERT' AND NEW.state<>'draft' THEN RAISE EXCEPTION 'Primero guarda un borrador.'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'El propietario no puede cambiar.'; END IF;
  IF OLD.state='active' THEN RAISE EXCEPTION 'La aventura activa conserva sus condiciones.'; END IF;
 END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(NEW.cells) LOOP
  IF jsonb_typeof(c)<>'object' OR coalesce(c->>'kind','') NOT IN ('book','experience') OR length(trim(coalesce(c->>'label',''))) NOT BETWEEN 1 AND 200 OR coalesce(c->>'condition','') NOT IN ('any','genre','author','max_pages') OR length(coalesce(c->>'value',''))>160 THEN
   RAISE EXCEPTION 'Revisa las casillas de la aventura.';
  END IF;
  IF c->>'kind'='book' AND c->>'condition' IN ('genre','author') AND length(trim(coalesce(c->>'value','')))=0 THEN RAISE EXCEPTION 'La condición necesita un valor.'; END IF;
  IF c->>'kind'='book' AND c->>'condition'='max_pages' THEN
   IF coalesce(c->>'value','') !~ '^[0-9]{1,5}$' THEN RAISE EXCEPTION 'Revisa el límite de páginas.'; END IF;
   IF (c->>'value')::integer<1 THEN RAISE EXCEPTION 'Revisa el límite de páginas.'; END IF;
  END IF;
 END LOOP;
 IF NEW.state='active' THEN NEW.activated_at:=now(); ELSE NEW.activated_at:=NULL; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.delete_reader_data(p_user uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; blocked text; pending integer; pass integer := 0; removed integer := 0; n integer;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'Falta el lector.'; END IF;
  PERFORM set_config('koa.account_deletion', p_user::text, true);
  IF to_regclass('public.feedback') IS NOT NULL THEN UPDATE public.feedback SET user_id = NULL WHERE user_id = p_user; END IF;
  IF to_regclass('public.courtesy_accounts') IS NOT NULL THEN UPDATE public.courtesy_accounts SET granted_by = NULL WHERE granted_by = p_user; END IF;
  -- Lo de otros lectores que apunta a lo suyo: se conserva, sin el vínculo.
  UPDATE public.reader_bingos SET shared_source_id = NULL
   WHERE user_id <> p_user AND shared_source_id IN (SELECT id FROM public.reader_shares WHERE user_id = p_user);
  UPDATE public.reader_social_profiles SET visibility = 'private', club_id = NULL
   WHERE user_id <> p_user AND club_id IN (SELECT id FROM public.reader_clubs WHERE owner_id = p_user);
  UPDATE public.reader_shares SET visibility = 'private', club_id = NULL
   WHERE user_id <> p_user AND club_id IN (SELECT id FROM public.reader_clubs WHERE owner_id = p_user);
  -- Varias pasadas: algunas tablas dependen de otras (listas e ítems, clubes e invitaciones).
  LOOP
    pass := pass + 1; pending := 0;
    FOR r IN
      SELECT c.table_name, c.column_name FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
       WHERE c.table_schema = 'public' AND c.data_type = 'uuid'
         AND c.column_name IN ('user_id', 'owner_id', 'requester', 'recipient', 'blocked_id', 'target_id')
         AND c.table_name NOT IN ('feedback', 'courtesy_accounts')
       ORDER BY c.table_name, c.column_name
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.table_name, r.column_name) USING p_user;
        GET DIAGNOSTICS n = ROW_COUNT; removed := removed + n;
      EXCEPTION WHEN foreign_key_violation THEN pending := pending + 1; blocked := r.table_name || ' (' || SQLERRM || ')';
      END;
    END LOOP;
    EXIT WHEN pending = 0 OR pass >= 6;
  END LOOP;
  IF pending > 0 THEN RAISE EXCEPTION 'No pudimos borrar todos los datos del lector: %', blocked; END IF;
  PERFORM set_config('koa.account_deletion', '', true);
  RETURN removed;
END $$;
REVOKE ALL ON FUNCTION public.delete_reader_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_reader_data(uuid) TO service_role;
