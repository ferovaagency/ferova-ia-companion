CREATE POLICY "No direct courtesy account access"
ON public.courtesy_accounts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);