ALTER TABLE public.reader_reports ADD COLUMN status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','done','wontfix'));
GRANT SELECT,UPDATE ON public.reader_reports TO authenticated;
CREATE POLICY admin_report_read ON public.reader_reports FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_report_update ON public.reader_reports FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));