comment on column public.parametros.suplemento_encargado is 'Fracción extra sobre la tarifa para encargados (0.10 = 10%)';
update public.parametros set suplemento_encargado = 0 where suplemento_encargado > 5;

create or replace function public._costos_semana(_semana date)
returns table(turno_id uuid, persona_id text, alias text, franja_id uuid, local_id text, puesto_id text,
  fecha date, dia int, inicio time, fin time, horas numeric, tarifa numeric, domingo boolean,
  horas_extra numeric, costo numeric, congelado boolean)
language sql stable security definer set search_path = public as $$
  with prm as (select * from public.parametros where id = 1),
  base as (
    select t.id as tid, t.persona_id as pid, p.alias as al, f.id as fid, f.local_id as lid, f.puesto_id as puid,
      f.fecha as fe, f.dia as di, f.inicio as ini, f.fin as fi,
      public.horas_pagadas(f.ts_inicio, f.ts_fin) as h,
      round(t.tarifa_aplicada * (1 + case when exists (select 1 from unnest(p.habilidades) hb where lower(trim(hb)) like 'encargad%')
        then (select suplemento_encargado from prm) else 0 end), 2) as tar,
      (f.dia = 6) as dom, p.tope_semanal as tope, t.costo_congelado as cc, f.ts_inicio as tsi
    from public.turno t join public.franja f on f.id = t.franja_id join public.persona p on p.id = t.persona_id
    where f.semana_id = _semana and t.estado = 'activo'),
  acum as (select b.*, sum(b.h) over (partition by b.pid order by b.tsi, b.tid rows unbounded preceding) as cum from base b),
  ext as (select a.*, greatest(0, least(a.h, a.cum - a.tope)) as hx from acum a)
  select e.tid, e.pid, e.al, e.fid, e.lid, e.puid, e.fe, e.di, e.ini, e.fi, e.h, e.tar, e.dom, e.hx,
    coalesce(e.cc, round(((e.h - e.hx) + e.hx * prm.mult_extra) * e.tar * (case when e.dom then 1 + prm.prima_dominical else 1 end), 2)),
    e.cc is not null
  from ext e cross join prm
$$;
revoke execute on function public._costos_semana(date) from public, anon, authenticated;