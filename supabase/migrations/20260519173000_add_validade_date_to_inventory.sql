-- P2: adiciona data normalizada para validade sem remover o campo textual usado pela UI.
-- O formato textual atual esperado e DD/MM/YYYY.

alter table public.itens_inventario
  add column if not exists validade_date date;

create or replace function public.parse_br_validade_date(p_validade text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_parts text[];
  v_day int;
  v_month int;
  v_year int;
begin
  if p_validade is null or btrim(p_validade) = '' then
    return null;
  end if;

  if btrim(p_validade) !~ '^\d{2}/\d{2}/\d{4}$' then
    return null;
  end if;

  v_parts := string_to_array(btrim(p_validade), '/');
  v_day := v_parts[1]::int;
  v_month := v_parts[2]::int;
  v_year := v_parts[3]::int;

  return make_date(v_year, v_month, v_day);
exception
  when others then
    return null;
end;
$$;

create or replace function public.sync_itens_validade_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.validade_date := public.parse_br_validade_date(new.validade);
  return new;
end;
$$;

update public.itens_inventario
set validade_date = public.parse_br_validade_date(validade)
where validade_date is null;

drop trigger if exists trg_sync_itens_validade_date on public.itens_inventario;

create trigger trg_sync_itens_validade_date
  before insert or update of validade on public.itens_inventario
  for each row
  execute function public.sync_itens_validade_date();

create index if not exists idx_itens_unidade_validade_date
  on public.itens_inventario(unidade_id, validade_date)
  where deletado_em is null and validade_date is not null;
