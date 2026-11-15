CREATE FUNCTION public.install_reader_candidates(p_user uuid,p_calendar uuid,p_entries jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.reader_calendars; item jsonb; v_slot integer; v_identity text; v_isbn text;
BEGIN
 SELECT * INTO STRICT c FROM public.reader_calendars WHERE id=p_calendar AND user_id=p_user FOR UPDATE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  v_slot:=(item->>'slot')::integer; v_identity:=public.reader_identity(item->>'title',item->>'author'); v_isbn:=public.reader_isbn(item->>'isbn');
  IF v_slot<1 OR v_slot>(CASE WHEN c.kind='advent' THEN 24 ELSE 12 END) OR coalesce(item->>'catalog_id','') !~ '^(google:|openlibrary:)' OR length(trim(coalesce(item->>'title','')))=0 OR length(trim(coalesce(item->>'author','')))=0 THEN RAISE EXCEPTION 'Invalid catalog entry'; END IF;
  IF c.kind='advent' AND EXISTS(SELECT 1 FROM public.reader_calendar_entries e WHERE e.calendar_id=c.id AND e.slot=v_slot AND e.opened_at IS NOT NULL) THEN RAISE EXCEPTION 'Opened window immutable'; END IF;
  IF EXISTS(SELECT 1 FROM public.books b WHERE b.user_id=p_user AND (public.reader_identity(b.title,b.author)=v_identity OR (v_isbn<>'' AND public.reader_isbn(b.isbn)=v_isbn))) OR EXISTS(SELECT 1 FROM public.reader_wishes w WHERE w.user_id=p_user AND (public.reader_identity(w.title,w.author)=v_identity OR (v_isbn<>'' AND public.reader_isbn(w.isbn)=v_isbn))) THEN RAISE EXCEPTION 'Duplicate shelf identity'; END IF;
  INSERT INTO public.reader_calendar_entries(calendar_id,slot,title,author,isbn,catalog_id,cover_url,description,task) VALUES(c.id,v_slot,item->>'title',item->>'author',nullif(item->>'isbn',''),item->>'catalog_id',item->>'cover_url',coalesce(item->>'description',''),coalesce(item->>'task','')) ON CONFLICT(calendar_id,slot) DO UPDATE SET title=excluded.title,author=excluded.author,isbn=excluded.isbn,catalog_id=excluded.catalog_id,cover_url=excluded.cover_url,description=excluded.description,task=excluded.task,saved_wish_id=NULL;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.install_reader_candidates(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.install_reader_candidates(uuid,uuid,jsonb) TO service_role;