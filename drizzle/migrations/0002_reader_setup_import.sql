alter type public.book_status add value if not exists 'PAUSED';
alter type public.book_status add value if not exists 'ABANDONED';
alter table public.profiles add column onboarding_finished_at timestamptz;
alter table public.books add column goodreads_id text;
create unique index books_goodreads_id on public.books(user_id,goodreads_id) where goodreads_id is not null;
-- Accounts with an established shelf can open the guide themselves.
update public.profiles set onboarding_finished_at=now()
where exists(select 1 from public.books where books.user_id=profiles.id);

create function public.import_goodreads(p_rows jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=auth.uid();
  r jsonb; new_id uuid; n integer:=0; reads integer; last_day date; book_state public.book_status;
begin
  if owner_id is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then
    raise exception 'Lote de importación inválido.';
  end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    if coalesce(r->>'sourceId','') !~ '^[0-9]{1,20}$' or length(trim(coalesce(r->>'title','')))=0 then
      raise exception 'La fila no tiene identificador o título válido.';
    end if;
    book_state:=(r->>'status')::public.book_status;
    reads:=greatest(case when book_state='READ' then 1 else 0 end, coalesce((r->>'reads')::integer,0));
    if reads>1000 then raise exception 'Revisa el número de relecturas.'; end if;
    last_day:=(r->>'lastDay')::date;
    insert into public.books(user_id,goodreads_id,isbn,title,author,pages,current_page,status,reading_cycle,user_rating,user_review,finished_reading_at)
    values(owner_id,r->>'sourceId',r->>'isbn',r->>'title',r->>'author',(r->>'pages')::integer,
      case when book_state='READ' then (r->>'pages')::integer else 0 end,book_state,
      case when book_state='READ' then reads else reads+1 end,(r->>'rating')::integer,r->>'review',
      case when book_state='READ' then (last_day+time '12:00') at time zone 'UTC' end)
    on conflict do nothing returning id into new_id;
    if new_id is not null then
      insert into public.completed_readings(book_id,cycle,finished_at)
      select new_id,i,case when i=reads then (last_day+time '12:00') at time zone 'UTC' end
      from generate_series(1,reads) i;
      n:=n+1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.import_goodreads(jsonb) from public,anon;
grant execute on function public.import_goodreads(jsonb) to authenticated;
