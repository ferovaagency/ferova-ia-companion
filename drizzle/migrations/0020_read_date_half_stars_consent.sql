-- 1) Medias estrellas: 0,5 a 5 en pasos de 0,5.
do $$ begin
  if (select format_type(atttypid, atttypmod) from pg_attribute
      where attrelid = 'public.books'::regclass and attname = 'user_rating') = 'smallint' then
    alter table public.books drop constraint if exists books_user_rating_check;
    alter table public.books alter column user_rating type numeric(2,1) using user_rating::numeric(2,1);
  end if;
end $$;
alter table public.books drop constraint if exists books_user_rating_check;
alter table public.books add constraint books_user_rating_check
  check (user_rating is null or (user_rating between 0.5 and 5 and user_rating * 2 = trunc(user_rating * 2)));

-- 2) Fecha en que se terminó un libro (hoy o antes). Una fecha pasada no es un día
--    de lectura de hoy, así que esa finalización deja de contar para la racha.
create or replace function public.set_finished_date(p_book uuid, p_cycle integer, p_day date, p_zone text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.books;
  today date := (now() at time zone p_zone)::date;
  finished timestamptz;
begin
  if today is null or p_day is null or p_day > today or p_day < date '1900-01-01' then
    raise exception 'La fecha debe ser hoy o anterior.';
  end if;
  select * into strict b from public.books where id = p_book and user_id = auth.uid() for update;
  if b.status <> 'READ' or b.reading_cycle <> p_cycle then
    raise exception 'Actualiza la biblioteca y vuelve a intentarlo.';
  end if;
  finished := case when p_day = today then coalesce(b.finished_reading_at, now())
                   else (p_day::timestamp + time '12:00') at time zone p_zone end;
  update public.books set finished_reading_at = finished,
    started_reading_at = case when started_reading_at > finished then null else started_reading_at end
  where id = b.id;
  insert into public.completed_readings(book_id, cycle, started_at, finished_at)
    values (b.id, b.reading_cycle, case when b.started_reading_at > finished then null else b.started_reading_at end, finished)
  on conflict (book_id, cycle) do update set finished_at = excluded.finished_at,
    started_at = case when public.completed_readings.started_at > excluded.finished_at then null else public.completed_readings.started_at end,
    streak_day = case when p_day = today then public.completed_readings.streak_day end;
end $$;
revoke all on function public.set_finished_date(uuid, integer, date, text) from public, anon;
grant execute on function public.set_finished_date(uuid, integer, date, text) to authenticated, service_role;

-- 3) Aceptación de la política de datos y permiso para contactar.
alter table public.profiles add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists contact_consent boolean not null default false,
  add column if not exists contact_consent_at timestamptz;

-- La hora la pone siempre el servidor, nunca el navegador.
create or replace function public.stamp_profile_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.privacy_accepted_at := case when new.privacy_version is not null then now() end;
    new.contact_consent_at := case when new.contact_consent then now() end;
    return new;
  end if;
  if new.privacy_version is distinct from old.privacy_version then
    new.privacy_accepted_at := case when new.privacy_version is not null then now() end;
  else
    new.privacy_accepted_at := old.privacy_accepted_at;
  end if;
  if new.contact_consent is distinct from old.contact_consent then
    new.contact_consent_at := now();
  else
    new.contact_consent_at := old.contact_consent_at;
  end if;
  return new;
end $$;
revoke all on function public.stamp_profile_consent() from public, anon, authenticated;
drop trigger if exists profiles_stamp_consent on public.profiles;
create trigger profiles_stamp_consent before insert or update on public.profiles
  for each row execute function public.stamp_profile_consent();

-- El registro por correo trae la aceptación en los metadatos del alta.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare
  consent boolean := false;
begin
  begin
    consent := coalesce((new.raw_user_meta_data->>'contact_consent')::boolean, false);
  exception when others then consent := false;
  end;
  insert into public.profiles (id, display_name, privacy_version, contact_consent)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(left(new.raw_user_meta_data->>'privacy_version', 20), ''),
    consent
  )
  on conflict (id) do nothing;
  return new;
end $$;
