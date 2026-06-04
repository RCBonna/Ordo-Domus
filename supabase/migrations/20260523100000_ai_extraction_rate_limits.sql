-- Ordo Domus - IA extraction rate limit audit.
-- Stores extraction attempts before Gemini is called so abuse can be blocked
-- and limit failures remain visible operationally.

create table if not exists public.ai_extraction_events (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  mode text not null check (mode in ('text', 'audio', 'receipt')),
  payload_bytes integer not null check (payload_bytes >= 0),
  allowed boolean not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_ai_extraction_events_rate_window
  on public.ai_extraction_events(unidade_id, user_id, mode, created_at desc);

create index if not exists idx_ai_extraction_events_retention
  on public.ai_extraction_events(created_at);

alter table public.ai_extraction_events enable row level security;

drop policy if exists "Admins registram tentativas de IA" on public.ai_extraction_events;
create policy "Admins registram tentativas de IA"
  on public.ai_extraction_events for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = ai_extraction_events.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

drop policy if exists "Admins leem suas tentativas de IA" on public.ai_extraction_events;
create policy "Admins leem suas tentativas de IA"
  on public.ai_extraction_events for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = ai_extraction_events.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

create or replace function public.cleanup_ai_extraction_events(
  p_reference_time timestamptz default now(),
  p_retention_days integer default 30,
  p_batch_size integer default 5000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 365 then
    raise exception 'p_retention_days deve ficar entre 1 e 365.';
  end if;

  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 50000 then
    raise exception 'p_batch_size deve ficar entre 1 e 50000.';
  end if;

  with old_rows as (
    select id
    from public.ai_extraction_events
    where created_at < p_reference_time - make_interval(days => p_retention_days)
    order by created_at asc
    limit p_batch_size
    for update skip locked
  )
  delete from public.ai_extraction_events events
  using old_rows
  where events.id = old_rows.id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

comment on table public.ai_extraction_events
  is 'Audit log de tentativas de extracao por IA usado pela Edge Function extract-inventory para rate limit por usuario/unidade/modo.';

comment on function public.cleanup_ai_extraction_events(timestamptz, integer, integer)
  is 'Remove eventos antigos de rate limit da extracao por IA em lotes.';

revoke execute on function public.cleanup_ai_extraction_events(timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.cleanup_ai_extraction_events(timestamptz, integer, integer) to service_role;

do $$
declare
  v_existing_job_id bigint;
begin
  if exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    select jobid
      into v_existing_job_id
    from cron.job
    where jobname = 'cleanup-ai-extraction-events'
    limit 1;

    if v_existing_job_id is not null then
      perform cron.unschedule(v_existing_job_id);
    end if;

    perform cron.schedule(
      'cleanup-ai-extraction-events',
      '43 3 * * *',
      $cron$
        select public.cleanup_ai_extraction_events();
      $cron$
    );
  end if;
end;
$$;
