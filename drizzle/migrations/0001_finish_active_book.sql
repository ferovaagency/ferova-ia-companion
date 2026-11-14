-- A completion without a measurable page delta still records a day of reading.
alter table public.completed_readings add column streak_day date;

create function public.finish_active_book(p_book uuid, p_cycle integer, p_zone text)
returns void language plpgsql security definer set search_path='' as $$
declare
  b public.books;
  reading_day date := (now() at time zone p_zone)::date;
begin
  select * into strict b from public.books
    where id=p_book and user_id=auth.uid() for update;
  if reading_day is null or b.reading_cycle is distinct from p_cycle then
    raise exception 'Actualiza la biblioteca y vuelve a intentarlo.';
  end if;
  if b.status='READ' then return; end if;
  if b.status<>'READING' then raise exception 'El libro ya no está en lectura.'; end if;
  if b.pages>b.current_page then
    perform public.record_reading(b.id,b.reading_cycle,b.current_page,b.pages,reading_day,p_zone,null,'');
  else
    update public.books set status='READ',finished_reading_at=now() where id=b.id;
    update public.completed_readings set streak_day=reading_day
      where book_id=b.id and cycle=b.reading_cycle;
  end if;
end $$;
revoke all on function public.finish_active_book(uuid,integer,text) from public,anon;
grant execute on function public.finish_active_book(uuid,integer,text) to authenticated;
