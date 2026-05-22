-- Retention for pending receipt imports.
-- Expired triage rows are operational scratch data and should not live forever.

create extension if not exists pg_cron with schema extensions;

create index if not exists idx_importacoes_pendentes_expired_unprocessed
  on public.importacoes_pendentes(expires_at)
  where processado = false;

create or replace function public.cleanup_expired_pending_imports(
  p_reference_time timestamptz default now(),
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
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 50000 then
    raise exception 'p_batch_size deve ficar entre 1 e 50000.';
  end if;

  with expired_rows as (
    select id
    from public.importacoes_pendentes
    where processado = false
      and expires_at < p_reference_time
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  )
  delete from public.importacoes_pendentes pending
  using expired_rows
  where pending.id = expired_rows.id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

comment on function public.cleanup_expired_pending_imports(timestamptz, integer)
  is 'Remove importacoes_pendentes expiradas em lotes para cumprir retencao operacional da triagem de cupom.';

revoke execute on function public.cleanup_expired_pending_imports(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.cleanup_expired_pending_imports(timestamptz, integer) to service_role;

do $$
declare
  v_existing_job_id bigint;
begin
  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'cleanup-expired-pending-imports'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-pending-imports',
    '17 3 * * *',
    $cron$
      select public.cleanup_expired_pending_imports();
    $cron$
  );
end;
$$;
