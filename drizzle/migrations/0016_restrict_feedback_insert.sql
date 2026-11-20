DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated
WITH CHECK (
  ((auth.uid() IS NULL AND user_id IS NULL) OR user_id = auth.uid())
  AND status = 'new'
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND char_length(type) BETWEEN 1 AND 40
  AND (email IS NULL OR char_length(email) <= 320)
);