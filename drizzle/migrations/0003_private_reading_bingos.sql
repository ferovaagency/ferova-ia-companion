CREATE TABLE public.reader_bingos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
 purpose text NOT NULL DEFAULT '' CHECK (length(purpose)<=1200),
 size integer NOT NULL DEFAULT 3 CHECK (size IN (3,4,5)),
 cells jsonb NOT NULL,
 starts_on date,
 ends_on date,
 allow_reuse boolean NOT NULL DEFAULT false,
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','active')),
 activated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on>=starts_on),
 CHECK (jsonb_typeof(cells)='array' AND jsonb_array_length(cells)=size*size)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reader_bingos TO authenticated;
GRANT ALL ON public.reader_bingos TO service_role;
ALTER TABLE public.reader_bingos ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_bingos ON public.reader_bingos FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE TABLE public.reader_bingo_progress (
 board_id uuid NOT NULL REFERENCES public.reader_bingos(id) ON DELETE CASCADE,
 cell_index integer NOT NULL CHECK(cell_index BETWEEN 0 AND 24),
 user_id uuid NOT NULL,
 book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
 completed_cycle integer,
 completed_at timestamptz,
 PRIMARY KEY(board_id,cell_index),
 FOREIGN KEY(book_id,completed_cycle) REFERENCES public.completed_readings(book_id,cycle)
);
GRANT SELECT ON public.reader_bingo_progress TO authenticated;
GRANT ALL ON public.reader_bingo_progress TO service_role;
ALTER TABLE public.reader_bingo_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_bingo_progress ON public.reader_bingo_progress FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.reader_bingos b WHERE b.id=board_id AND b.user_id=(SELECT auth.uid())));
CREATE FUNCTION public.validate_reader_bingo() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c jsonb;
BEGIN
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
CREATE TRIGGER validate_reader_bingo BEFORE INSERT OR UPDATE OR DELETE ON public.reader_bingos FOR EACH ROW EXECUTE FUNCTION public.validate_reader_bingo();
CREATE FUNCTION public.set_bingo_cell(p_board uuid,p_index integer,p_book uuid,p_complete boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE board public.reader_bingos; cell jsonb; book public.books; cycle integer; finished timestamptz;
BEGIN
 SELECT * INTO STRICT board FROM public.reader_bingos WHERE id=p_board AND user_id=auth.uid() FOR UPDATE;
 IF board.state<>'active' OR p_index<0 OR p_index>=board.size*board.size THEN RAISE EXCEPTION 'Activa la aventura y revisa la casilla.'; END IF;
 cell:=board.cells->p_index;
 IF cell->>'kind'='experience' THEN
  IF p_book IS NOT NULL THEN RAISE EXCEPTION 'Esta casilla es una experiencia.'; END IF;
 ELSE
  IF p_book IS NOT NULL THEN
   SELECT * INTO STRICT book FROM public.books WHERE id=p_book AND user_id=auth.uid();
   IF cell->>'condition'='genre' AND lower(trim(book.genre))<>lower(trim(cell->>'value')) THEN RAISE EXCEPTION 'El género no cumple esta condición.'; END IF;
   IF cell->>'condition'='author' AND lower(trim(book.author))<>lower(trim(cell->>'value')) THEN RAISE EXCEPTION 'El autor no cumple esta condición.'; END IF;
   IF cell->>'condition'='max_pages' AND (book.pages<=0 OR book.pages>(cell->>'value')::integer) THEN RAISE EXCEPTION 'La extensión no cumple esta condición.'; END IF;
   IF NOT board.allow_reuse AND EXISTS(SELECT 1 FROM public.reader_bingo_progress WHERE board_id=p_board AND cell_index<>p_index AND book_id=p_book) THEN RAISE EXCEPTION 'Esta aventura no permite repetir libros.'; END IF;
   IF p_complete THEN
    SELECT r.cycle,r.finished_at INTO cycle,finished FROM public.completed_readings r WHERE r.book_id=p_book AND r.finished_at IS NOT NULL AND (board.starts_on IS NULL OR r.finished_at::date>=board.starts_on) AND (board.ends_on IS NULL OR r.finished_at::date<=board.ends_on) ORDER BY r.finished_at DESC LIMIT 1;
    IF cycle IS NULL THEN RAISE EXCEPTION 'Primero registra la finalización real del libro dentro de las fechas de la aventura.'; END IF;
   END IF;
  ELSIF p_complete THEN RAISE EXCEPTION 'Elige un libro de tu biblioteca.';
  END IF;
 END IF;
 INSERT INTO public.reader_bingo_progress(board_id,cell_index,user_id,book_id,completed_cycle,completed_at) VALUES(p_board,p_index,auth.uid(),p_book,cycle,CASE WHEN p_complete THEN now() END)
 ON CONFLICT(board_id,cell_index) DO UPDATE SET book_id=excluded.book_id,completed_cycle=excluded.completed_cycle,completed_at=excluded.completed_at;
END $$;
REVOKE ALL ON FUNCTION public.set_bingo_cell(uuid,integer,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_bingo_cell(uuid,integer,uuid,boolean) TO authenticated;