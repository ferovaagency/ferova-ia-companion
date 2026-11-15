-- Lee con Koa: additive, private reader data. Existing reading history remains authoritative.
create table public.reader_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 pace text not null default 'flexible' check (pace in ('gentle','weekend','flexible')),
 moods text[] not null default '{}',
 onboarding_version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.reader_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 kind text not null default 'quote' check (kind in ('quote','note')),
 content text not null check(length(trim(content)) between 1 and 10000),
 reflection text not null default '' check(length(reflection)<=5000),
 page integer check(page>=0), chapter text not null default '',
 tags text[] not null default '{}', favorite boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.reader_wishes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 500),
 author text not null default '', cover_url text, description text not null default '',
 created_at timestamptz not null default now()
);
create unique index reader_wishes_identity on public.reader_wishes(user_id,lower(trim(title)),lower(trim(author)));
create table public.reader_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 question text not null check(length(question) between 1 and 3000),
 answer text not null check(length(answer)<=16000),
 created_at timestamptz not null default now()
);
create table public.reader_timer_receipts (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 cycle integer not null,
 minutes integer not null check(minutes between 1 and 1440),
 saved_at timestamptz not null default now()
);
create index reader_notes_owner_book on public.reader_notes(user_id,book_id,created_at desc);
create index reader_conversations_owner_book on public.reader_conversations(user_id,book_id,created_at desc);
create index reader_timer_owner on public.reader_timer_receipts(user_id);
alter table public.reader_preferences enable row level security;
alter table public.reader_notes enable row level security;
alter table public.reader_wishes enable row level security;
alter table public.reader_conversations enable row level security;
alter table public.reader_timer_receipts enable row level security;
create policy own_preferences on public.reader_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_wishes on public.reader_wishes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_notes on public.reader_notes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid())));
create policy own_conversations on public.reader_conversations for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid())));
create policy own_timer_receipts on public.reader_timer_receipts for select to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.reader_preferences,public.reader_notes,public.reader_wishes,public.reader_conversations to authenticated;
grant select on public.reader_timer_receipts to authenticated;
revoke all on public.reader_preferences,public.reader_notes,public.reader_wishes,public.reader_conversations,public.reader_timer_receipts from anon;

-- A retry of the same close operation must never add another reading event.
create function public.close_reader_session(p_id uuid,p_book uuid,p_cycle integer,p_from integer,p_to integer,p_minutes integer,p_day date,p_zone text,p_note text,p_finish boolean)
returns void language plpgsql security definer set search_path='' as $$
declare b public.books; receipt public.reader_timer_receipts;
begin
 if auth.uid() is null then raise exception 'Inicia sesión para guardar.'; end if;
 if p_id is null or p_minutes is null or p_minutes<1 or p_minutes>1440 or p_finish is null then raise exception 'Sesión inválida.'; end if;
 -- Serialize both retries and two different operations on the same book.
 select * into strict b from public.books where id=p_book and user_id=auth.uid() for update;
 select * into receipt from public.reader_timer_receipts where id=p_id;
 if found then
  if receipt.user_id<>auth.uid() or receipt.book_id<>p_book or receipt.cycle<>p_cycle then raise exception 'Identificador de sesión inválido.'; end if;
  return;
 end if;
 if b.reading_cycle is distinct from p_cycle or b.status<>'READING' or b.current_page is distinct from p_from then raise exception 'El libro cambió. Actualiza su progreso antes de guardar.'; end if;
 if p_to is null or p_to<p_from or (b.pages>0 and p_to>b.pages) then raise exception 'Revisa la página alcanzada.'; end if;
 if p_finish and b.pages>0 then p_to:=b.pages; end if;
 if p_to>p_from then
  perform public.record_reading(p_book,p_cycle,p_from,p_to,p_day,p_zone,p_minutes,p_note);
 elsif not p_finish then
  raise exception 'Registra un avance o marca el libro como terminado para guardar la lectura.';
 end if;
 if p_finish then perform public.finish_active_book(p_book,p_cycle,p_zone); end if;
 insert into public.reader_timer_receipts(id,user_id,book_id,cycle,minutes) values(p_id,auth.uid(),p_book,p_cycle,p_minutes);
end $$;
revoke all on function public.close_reader_session(uuid,uuid,integer,integer,integer,integer,date,text,text,boolean) from public,anon;
grant execute on function public.close_reader_session(uuid,uuid,integer,integer,integer,integer,date,text,text,boolean) to authenticated;

create table public.reader_ai_usage(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null default now(),requests integer not null default 0);
alter table public.reader_ai_usage enable row level security;
revoke all on public.reader_ai_usage from anon,authenticated;
create function public.claim_koa_request() returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'No autorizado'; end if;
 insert into public.reader_ai_usage(user_id,requests) values(auth.uid(),1)
 on conflict(user_id) do update set requests=case when reader_ai_usage.window_start<now()-interval '1 hour' then 1 else reader_ai_usage.requests+1 end,window_start=case when reader_ai_usage.window_start<now()-interval '1 hour' then now() else reader_ai_usage.window_start end
 returning requests into n;
 if n>30 then raise exception 'Límite por hora alcanzado'; end if;
end $$;
revoke all on function public.claim_koa_request() from public,anon;
grant execute on function public.claim_koa_request() to authenticated;
