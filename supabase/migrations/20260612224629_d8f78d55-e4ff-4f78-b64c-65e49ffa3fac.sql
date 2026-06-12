ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS user_rating smallint CHECK (user_rating IS NULL OR (user_rating BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS user_review text;