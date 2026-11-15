ALTER TABLE public.reader_wishes ADD COLUMN isbn text;
CREATE FUNCTION public.reader_identity(p_title text,p_author text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT lower(regexp_replace(trim(p_title),'[[:space:][:punct:]]+','','g'))||'|'||lower(regexp_replace(trim(p_author),'[[:space:][:punct:]]+','','g')) $$;
CREATE FUNCTION public.reader_isbn(p_isbn text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN length(regexp_replace(coalesce(p_isbn,''),'[^0-9Xx]','','g'))=10 THEN '978'||left(regexp_replace(p_isbn,'[^0-9]','','g'),9) ELSE left(regexp_replace(coalesce(p_isbn,''),'[^0-9]','','g'),12) END $$;
CREATE TABLE public.reader_lists(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL DEFAULT auth.uid(),name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160),description text NOT NULL DEFAULT '' CHECK(length(description)<=1200),annual_year integer,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,annual_year));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reader_lists TO authenticated; GRANT ALL ON public.reader_lists TO service_role;
ALTER TABLE public.reader_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_lists ON public.reader_lists FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE TABLE public.reader_list_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),list_id uuid NOT NULL REFERENCES public.reader_lists(id) ON DELETE CASCADE,user_id uuid NOT NULL DEFAULT auth.uid(),book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,wish_id uuid REFERENCES public.reader_wishes(id) ON DELETE CASCADE,position integer NOT NULL DEFAULT 0,CHECK((book_id IS NULL)<>(wish_id IS NULL)),UNIQUE(list_id,book_id),UNIQUE(list_id,wish_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reader_list_items TO authenticated; GRANT ALL ON public.reader_list_items TO service_role;
ALTER TABLE public.reader_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_list_items ON public.reader_list_items FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.reader_lists l WHERE l.id=list_id AND l.user_id=auth.uid()) AND (book_id IS NULL OR EXISTS(SELECT 1 FROM public.books b WHERE b.id=book_id AND b.user_id=auth.uid())) AND (wish_id IS NULL OR EXISTS(SELECT 1 FROM public.reader_wishes w WHERE w.id=wish_id AND w.user_id=auth.uid())));
CREATE TABLE public.reader_feelings(book_id uuid PRIMARY KEY REFERENCES public.books(id) ON DELETE CASCADE,user_id uuid NOT NULL DEFAULT auth.uid(),tears smallint CHECK(tears BETWEEN 0 AND 5),immersion smallint CHECK(immersion BETWEEN 0 AND 5),tags text[] NOT NULL DEFAULT '{}',tier text CHECK(tier IN ('S','A','B','C','D')),tier_rank integer CHECK(tier_rank>=1),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(cardinality(tags)<=12));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reader_feelings TO authenticated; GRANT ALL ON public.reader_feelings TO service_role;
ALTER TABLE public.reader_feelings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_feelings ON public.reader_feelings FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.books b WHERE b.id=book_id AND b.user_id=auth.uid()));
ALTER TABLE public.reader_notes ADD COLUMN feeling_tags text[] NOT NULL DEFAULT '{}';
CREATE TABLE public.reader_calendars(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('advent','monthly')),year integer NOT NULL CHECK(year BETWEEN 2026 AND 2200),context text NOT NULL DEFAULT '',UNIQUE(user_id,kind,year));
GRANT SELECT ON public.reader_calendars TO authenticated; GRANT ALL ON public.reader_calendars TO service_role;
ALTER TABLE public.reader_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_calendars ON public.reader_calendars FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE TABLE public.reader_calendar_entries(calendar_id uuid NOT NULL REFERENCES public.reader_calendars(id) ON DELETE CASCADE,slot integer NOT NULL CHECK(slot BETWEEN 1 AND 24),title text NOT NULL,author text NOT NULL,isbn text,catalog_id text NOT NULL,cover_url text,description text NOT NULL DEFAULT '',task text NOT NULL DEFAULT '',opened_at timestamptz,saved_wish_id uuid REFERENCES public.reader_wishes(id) ON DELETE SET NULL,PRIMARY KEY(calendar_id,slot));
GRANT ALL ON public.reader_calendar_entries TO service_role;
ALTER TABLE public.reader_calendar_entries ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX calendar_title_identity ON public.reader_calendar_entries(calendar_id,public.reader_identity(title,author));
CREATE UNIQUE INDEX calendar_isbn_identity ON public.reader_calendar_entries(calendar_id,public.reader_isbn(isbn)) WHERE isbn IS NOT NULL;
CREATE FUNCTION public.advent_unlocked(p_year integer,p_slot integer,p_day date) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT p_slot BETWEEN 1 AND 24 AND p_day>=make_date(p_year,12,p_slot) AND p_day<=make_date(p_year,12,31) $$;
CREATE FUNCTION public.reveal_reader_window(p_calendar uuid,p_slot integer,p_zone text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.reader_calendars; e public.reader_calendar_entries; day date;
BEGIN
 SELECT * INTO STRICT c FROM public.reader_calendars WHERE id=p_calendar AND user_id=auth.uid() FOR UPDATE;
 day:=(now() AT TIME ZONE p_zone)::date;
 IF c.kind<>'advent' OR NOT public.advent_unlocked(c.year,p_slot,day) THEN RAISE EXCEPTION 'Esta ventana se abre en diciembre, según tu fecha local.'; END IF;
 SELECT * INTO STRICT e FROM public.reader_calendar_entries WHERE calendar_id=c.id AND slot=p_slot;
 IF e.opened_at IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.books b WHERE b.user_id=c.user_id AND (public.reader_identity(b.title,b.author)=public.reader_identity(e.title,e.author) OR (e.isbn IS NOT NULL AND b.isbn IS NOT NULL AND public.reader_isbn(b.isbn)=public.reader_isbn(e.isbn)))) OR EXISTS(SELECT 1 FROM public.reader_wishes w WHERE w.user_id=c.user_id AND (public.reader_identity(w.title,w.author)=public.reader_identity(e.title,e.author) OR (e.isbn IS NOT NULL AND w.isbn IS NOT NULL AND public.reader_isbn(w.isbn)=public.reader_isbn(e.isbn)))) THEN RAISE EXCEPTION 'REPLACE_UNOPENED_DUPLICATE'; END IF;
  UPDATE public.reader_calendar_entries SET opened_at=now() WHERE calendar_id=c.id AND slot=p_slot RETURNING * INTO e;
 END IF;
 RETURN to_jsonb(e);
END $$;
REVOKE ALL ON FUNCTION public.reveal_reader_window(uuid,integer,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.reveal_reader_window(uuid,integer,text) TO authenticated;
CREATE FUNCTION public.save_reader_discovery(p_calendar uuid,p_slot integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.reader_calendars; e public.reader_calendar_entries; wish uuid; list uuid;
BEGIN
 SELECT * INTO STRICT c FROM public.reader_calendars WHERE id=p_calendar AND user_id=auth.uid() FOR UPDATE;
 SELECT * INTO STRICT e FROM public.reader_calendar_entries WHERE calendar_id=c.id AND slot=p_slot;
 IF c.kind='advent' AND e.opened_at IS NULL THEN RAISE EXCEPTION 'Abre primero esta ventana.'; END IF;
 SELECT id INTO wish FROM public.reader_wishes WHERE user_id=c.user_id AND public.reader_identity(title,author)=public.reader_identity(e.title,e.author) LIMIT 1;
 IF wish IS NULL THEN INSERT INTO public.reader_wishes(user_id,title,author,isbn,cover_url,description) VALUES(c.user_id,e.title,e.author,e.isbn,e.cover_url,e.description) RETURNING id INTO wish; END IF;
 INSERT INTO public.reader_lists(user_id,name,annual_year) VALUES(c.user_id,'Lecturas para '||(CASE WHEN c.kind='advent' THEN c.year+1 ELSE c.year END),CASE WHEN c.kind='advent' THEN c.year+1 ELSE c.year END) ON CONFLICT(user_id,annual_year) DO UPDATE SET annual_year=excluded.annual_year RETURNING id INTO list;
 INSERT INTO public.reader_list_items(list_id,user_id,wish_id,position) SELECT list,c.user_id,wish,coalesce(max(position),-1)+1 FROM public.reader_list_items WHERE list_id=list ON CONFLICT(list_id,wish_id) DO NOTHING;
 UPDATE public.reader_calendar_entries SET saved_wish_id=wish WHERE calendar_id=c.id AND slot=p_slot;
 RETURN wish;
END $$;
REVOKE ALL ON FUNCTION public.save_reader_discovery(uuid,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_reader_discovery(uuid,integer) TO authenticated;
CREATE FUNCTION public.reorder_reader_list(p_list uuid,p_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid;
BEGIN
 SELECT user_id INTO STRICT owner FROM public.reader_lists WHERE id=p_list AND user_id=auth.uid() FOR UPDATE;
 IF cardinality(p_ids)<>(SELECT count(*) FROM public.reader_list_items WHERE list_id=p_list) OR (SELECT count(DISTINCT x) FROM unnest(p_ids) x)<>cardinality(p_ids) OR EXISTS(SELECT 1 FROM unnest(p_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.reader_list_items i WHERE i.id=x AND i.list_id=p_list AND i.user_id=owner)) THEN RAISE EXCEPTION 'Actualiza la lista antes de ordenar.'; END IF;
 UPDATE public.reader_list_items i SET position=x.n-1 FROM unnest(p_ids) WITH ORDINALITY x(id,n) WHERE i.id=x.id AND i.list_id=p_list;
END $$;
REVOKE ALL ON FUNCTION public.reorder_reader_list(uuid,uuid[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.reorder_reader_list(uuid,uuid[]) TO authenticated;