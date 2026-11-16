-- A session's reward day is captured once. Editing/deleting history must not
-- turn the same reading evidence into another decoration or remove inventory.
CREATE TABLE public.reader_reward_evidence (
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('session', 'completion')),
  source_key text NOT NULL,
  day date NOT NULL,
  PRIMARY KEY (user_id, source, source_key)
);
ALTER TABLE public.reader_reward_evidence ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.reader_reward_evidence TO service_role;

INSERT INTO public.reader_reward_evidence
SELECT b.user_id, 'session', s.id::text, s.day
FROM public.reading_sessions s JOIN public.books b ON b.id=s.book_id
WHERE s.to_page>s.from_page
UNION ALL
SELECT b.user_id, 'completion', c.book_id::text || ':' || c.cycle::text, c.streak_day
FROM public.completed_readings c JOIN public.books b ON b.id=c.book_id
WHERE c.streak_day IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.reader_claim_rewards() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión.'; END IF;
  INSERT INTO public.reader_reward_evidence(user_id,source,source_key,day)
  SELECT auth.uid(), 'session', s.id::text, s.day
  FROM public.reading_sessions s JOIN public.books b ON b.id=s.book_id
  WHERE b.user_id=auth.uid() AND s.to_page>s.from_page
  UNION ALL
  SELECT auth.uid(), 'completion', c.book_id::text || ':' || c.cycle::text, c.streak_day
  FROM public.completed_readings c JOIN public.books b ON b.id=c.book_id
  WHERE b.user_id=auth.uid() AND c.streak_day IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reader_day_rewards(user_id,day,decoration)
  SELECT auth.uid(), day,
    (ARRAY['fern','lamp','books','moon'])[1+mod(abs(day-date '2000-01-01'),4)]
  FROM public.reader_reward_evidence WHERE user_id=auth.uid()
  GROUP BY day ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.reader_claim_rewards() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reader_claim_rewards() TO authenticated;
