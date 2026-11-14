alter table public.books add column isbn text check (isbn ~ '^97[89][0-9]{10}$'),
  add column reading_cycle integer not null default 1;
create unique index books_owner_isbn on public.books(user_id,isbn) where isbn is not null;

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books on delete cascade,
  cycle integer not null,
  day date not null,
  from_page integer not null check (from_page >= 0),
  to_page integer not null check (to_page > from_page),
  minutes integer check (minutes between 1 and 1440),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now()
);
create table public.completed_readings (
  book_id uuid not null references public.books on delete cascade,
  cycle integer not null, started_at timestamptz, finished_at timestamptz,
  primary key(book_id,cycle)
);
create index reading_sessions_book_cycle on public.reading_sessions(book_id,cycle,from_page);
alter table public.reading_sessions enable row level security;
alter table public.completed_readings enable row level security;
grant select on public.reading_sessions, public.completed_readings to authenticated;
revoke insert, update, delete on public.reading_sessions, public.completed_readings from authenticated, anon;
create policy own_sessions on public.reading_sessions for select to authenticated
using (exists (select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid())));
create policy own_completions on public.completed_readings for select to authenticated
using (exists (select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid())));

insert into public.completed_readings select id,reading_cycle,started_reading_at,finished_reading_at
from public.books where status='READ';

create function public.track_reading_cycle() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status is distinct from new.status then
    if old.status='READ' and new.status='READING' and current_setting('librero.correcting_session',true)='yes' then
      return new;
    end if;
    if new.status='TBR' or old.status='READ' then
      new.reading_cycle := old.reading_cycle+1;
      new.current_page := 0;
      new.started_reading_at := case when new.status='READING' then now() end;
      new.finished_reading_at := null;
      new.reading_speed_days := null;
    end if;
    if new.status='READ' then
      insert into public.completed_readings values(new.id,new.reading_cycle,new.started_reading_at,new.finished_reading_at)
      on conflict (book_id,cycle) do update set finished_at=excluded.finished_at;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.track_reading_cycle() from public,anon,authenticated;
create trigger reading_cycle before update of status on public.books for each row execute function public.track_reading_cycle();

create function public.record_reading(p_book uuid,p_cycle integer,p_from integer,p_to integer,p_day date,p_zone text,p_minutes integer,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare b public.books;
begin
  select * into strict b from public.books where id=p_book and user_id=auth.uid() for update;
  if b.status<>'READING' or b.reading_cycle<>p_cycle or b.current_page<>p_from then
    raise exception 'El progreso cambió. Revisa la página actual antes de guardar.';
  end if;
  if p_to<=p_from or (b.pages>0 and p_to>b.pages) or p_day>(now() at time zone p_zone)::date then
    raise exception 'Revisa la página final y la fecha de lectura.';
  end if;
  insert into public.reading_sessions(book_id,cycle,day,from_page,to_page,minutes,note)
    values(b.id,b.reading_cycle,p_day,p_from,p_to,p_minutes,coalesce(p_note,''));
  update public.books set current_page=p_to,started_reading_at=coalesce(started_reading_at,now()),
    finished_reading_at=case when p_to=pages then now() end,
    status=case when p_to=pages then 'READ'::public.book_status else status end
  where id=b.id;
end $$;

create function public.revise_session(p_id uuid,p_day date,p_zone text,p_minutes integer,p_note text,p_remove boolean)
returns void language plpgsql security definer set search_path='' as $$
declare s public.reading_sessions; b public.books;
begin
  select books.* into strict b from public.books books join public.reading_sessions r on r.book_id=books.id
    where r.id=p_id and books.user_id=auth.uid() for update of books;
  select * into strict s from public.reading_sessions where id=p_id;
  if p_remove then
    if b.reading_cycle=s.cycle and b.status='READ' then
      perform set_config('librero.correcting_session','yes',true);
      update public.books set status='READING',finished_reading_at=null where id=b.id;
      perform set_config('librero.correcting_session','no',true);
      delete from public.completed_readings where book_id=b.id and cycle=s.cycle;
    end if;
    update public.reading_sessions set from_page=from_page-(s.to_page-s.from_page),to_page=to_page-(s.to_page-s.from_page)
      where book_id=b.id and cycle=s.cycle and from_page>=s.to_page;
    if b.reading_cycle=s.cycle then
      update public.books set current_page=greatest(0,current_page-(s.to_page-s.from_page)) where id=b.id;
    end if;
    delete from public.reading_sessions where id=s.id;
  else
    if p_day>(now() at time zone p_zone)::date then raise exception 'La fecha debe ser hoy o anterior.'; end if;
    update public.reading_sessions set day=p_day,minutes=p_minutes,note=coalesce(p_note,'') where id=s.id;
  end if;
end $$;
revoke all on function public.record_reading(uuid,integer,integer,integer,date,text,integer,text),public.revise_session(uuid,date,text,integer,text,boolean) from public,anon;
grant execute on function public.record_reading(uuid,integer,integer,integer,date,text,integer,text),public.revise_session(uuid,date,text,integer,text,boolean) to authenticated;
