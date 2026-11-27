alter table public.parametros
  add column if not exists comida_min integer not null default 30,
  add column if not exists comida_desde_h numeric not null default 6,
  add column if not exists max_horas_turno numeric not null default 9,
  add column if not exists max_horas_semana numeric not null default 48,
  add column if not exists max_extra_sin_motivo numeric not null default 9;
update public.parametros set mult_extra = 2 where id = 1;
alter table public.turno add column if not exists motivo_extra text;

create or replace function public.horas_pagadas(_ini timestamp, _fin timestamp)
returns numeric language sql stable security definer set search_path = public as $$
  select round((case when h > prm.comida_desde_h then h - prm.comida_min / 60.0 else h end)::numeric, 2)
  from (select extract(epoch from (_fin - _ini)) / 3600 as h) x, public.parametros prm where prm.id = 1
$$;

create or replace function public._validar_duracion_franja()
returns trigger language plpgsql security definer set search_path = public as $$
declare mx numeric; h numeric;
begin
  select max_horas_turno into mx from public.parametros where id = 1;
  h := extract(epoch from (new.fin - new.inicio)) / 3600;
  if h <= 0 then h := h + 24; end if;
  if h > mx then raise exception 'El turno no puede durar más de % h (dura % h)', mx::float8, round(h, 2)::float8; end if;
  return new;
end $$;
drop trigger if exists validar_duracion_franja on public.franja;
create trigger validar_duracion_franja before insert or update of inicio, fin on public.franja
  for each row execute function public._validar_duracion_franja();

CREATE OR REPLACE FUNCTION public.validar_asignacion(_persona text, _franja uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  f public.franja; p public.persona; pu public.puesto; prm public.parametros;
  g record; dias date[]; run int; d date; descanso interval; gap numeric; semana_h numeric;
  nd text[] := array['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
begin
  select * into f from public.franja where id = _franja;
  if not found then return 'Franja inexistente'; end if;
  select * into p from public.persona where id = _persona;
  if not found then return 'Persona inexistente'; end if;
  select * into pu from public.puesto where id = f.puesto_id;
  select * into prm from public.parametros where id = 1;
  if not (f.local_id = any(p.locales)) then
    return 'No trabaja en ' || (select nombre from public.local where id = f.local_id);
  end if;
  if exists (select 1 from public.no_disponible where persona_id = _persona and dia = f.dia)
     or exists (select 1 from public.ausencia where persona_id = _persona and semana_id = f.semana_id and dia = f.dia and estado = 'aprobada' and public._ausencia_cubre(ausencia.franja, f.inicio)) then
    return 'No disponible';
  end if;
  if f.habilidad_requerida is not null and not (lower(trim(f.habilidad_requerida)) in (select lower(trim(x)) from unnest(p.habilidades) x)) then
    return coalesce(f.etiqueta, pu.nombre) || ' requiere habilidad ' || f.habilidad_requerida;
  end if;
  if pu.habilidad_requerida is not null and not (lower(trim(pu.habilidad_requerida)) in (select lower(trim(x)) from unnest(p.habilidades) x)) then
    return pu.nombre || ' requiere habilidad ' || pu.habilidad_requerida;
  end if;
  if exists (select 1 from public.turno where persona_id = _persona and franja_id = _franja and estado = 'activo') then
    return 'Ya está asignada a esta franja';
  end if;
  if extract(epoch from (f.ts_fin - f.ts_inicio)) / 3600 > prm.max_horas_turno then
    return 'El turno dura más de ' || prm.max_horas_turno::float8 || ' h';
  end if;
  select g2.fecha, g2.dia, g2.ts_inicio, g2.ts_fin, l.nombre as local into g
    from public.turno t join public.franja g2 on g2.id = t.franja_id join public.local l on l.id = g2.local_id
   where t.persona_id = _persona and t.estado = 'activo' and g2.id <> _franja
     and g2.ts_inicio < f.ts_fin and g2.ts_fin > f.ts_inicio limit 1;
  if found then
    return 'No entra: se solapa con su turno del ' || nd[g.dia + 1] || ' (' || g.local || ', ' || to_char(g.ts_inicio, 'HH24:MI') || '–' || to_char(g.ts_fin, 'HH24:MI') || ')';
  end if;
  descanso := make_interval(secs => (prm.descanso_min_h * 3600)::double precision);
  select g2.fecha, g2.dia, g2.ts_inicio, g2.ts_fin, l.nombre as local into g
    from public.turno t join public.franja g2 on g2.id = t.franja_id join public.local l on l.id = g2.local_id
   where t.persona_id = _persona and t.estado = 'activo' and g2.id <> _franja
     and g2.ts_inicio < f.ts_fin + descanso and g2.ts_fin > f.ts_inicio - descanso
     and not (prm.permitir_doble_turno and g2.fecha = f.fecha)
   order by g2.ts_inicio limit 1;
  if found then
    if g.ts_fin <= f.ts_inicio then
      gap := round((extract(epoch from (f.ts_inicio - g.ts_fin)) / 3600)::numeric, 1);
      return 'No entra: le quedan ' || gap::float8 || ' h de descanso desde el cierre del ' || nd[g.dia + 1] || ' (' || g.local || ', ' || to_char(g.ts_fin, 'HH24:MI') || '); mínimo ' || prm.descanso_min_h::float8 || ' h';
    else
      gap := round((extract(epoch from (g.ts_inicio - f.ts_fin)) / 3600)::numeric, 1);
      return 'No entra: le quedarían ' || gap::float8 || ' h de descanso antes de su turno del ' || nd[g.dia + 1] || ' (' || g.local || ', ' || to_char(g.ts_inicio, 'HH24:MI') || '); mínimo ' || prm.descanso_min_h::float8 || ' h';
    end if;
  end if;
  select array_agg(distinct g2.fecha) into dias
    from public.turno t join public.franja g2 on g2.id = t.franja_id
   where t.persona_id = _persona and t.estado = 'activo';
  dias := coalesce(dias, '{}'::date[]) || f.fecha;
  run := 1; d := f.fecha - 1;
  while d = any(dias) loop run := run + 1; d := d - 1; end loop;
  d := f.fecha + 1;
  while d = any(dias) loop run := run + 1; d := d + 1; end loop;
  if run > prm.max_dias_seguidos then
    return (prm.max_dias_seguidos + 1) || ' días seguidos — falta descanso';
  end if;
  select coalesce(sum(public.horas_pagadas(g2.ts_inicio, g2.ts_fin)), 0) into semana_h
    from public.turno t join public.franja g2 on g2.id = t.franja_id
   where t.persona_id = _persona and t.estado = 'activo' and g2.semana_id = f.semana_id;
  semana_h := semana_h + public.horas_pagadas(f.ts_inicio, f.ts_fin);
  if semana_h > prm.max_horas_semana then
    return 'Supera ' || prm.max_horas_semana::float8 || ' h semanales: llevaría ' || semana_h::float8 || ' h';
  end if;
  return null;
end $function$;

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
      t.tarifa_aplicada as tar, (f.dia = 6) as dom, p.tope_semanal as tope, t.costo_congelado as cc, f.ts_inicio as tsi
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

do $$
declare d text; viejo text := 'insert into public.turno(persona_id, franja_id, tarifa_aplicada) values (_datos->>''persona'', f.id, tar) returning id into nuevo;';
  nuevo_txt text := 'declare_extra := (select coalesce(sum(public.horas_pagadas(g9.ts_inicio, g9.ts_fin)), 0) from public.turno t9 join public.franja g9 on g9.id = t9.franja_id where t9.persona_id = _datos->>''persona'' and t9.estado = ''activo'' and g9.semana_id = s.id) + public.horas_pagadas(f.ts_inicio, f.ts_fin) - (select tope_semanal from public.persona where id = _datos->>''persona'');
    if declare_extra > (select max_extra_sin_motivo from public.parametros where id = 1) and coalesce(trim(_datos->>''motivo_extra''), '''') = '''' then
      raise exception ''REQUIERE_MOTIVO: quedaría con % h extra (máximo % h sin motivo)'', declare_extra::float8, (select max_extra_sin_motivo from public.parametros where id = 1)::float8;
    end if;
    insert into public.turno(persona_id, franja_id, tarifa_aplicada, motivo_extra) values (_datos->>''persona'', f.id, tar, nullif(trim(_datos->>''motivo_extra''), '''')) returning id into nuevo;';
begin
  d := pg_get_functiondef('public.ejecutar_comando(uuid,text,jsonb)'::regprocedure);
  if position(viejo in d) = 0 then raise exception 'reemplazo comando falló'; end if;
  d := replace(d, viejo, nuevo_txt);
  d := regexp_replace(d, '\ybegin\y', 'declare declare_extra numeric; begin', '');
  execute d;
end $$;