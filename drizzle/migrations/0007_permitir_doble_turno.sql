alter table public.parametros add column if not exists permitir_doble_turno boolean not null default false;
CREATE OR REPLACE FUNCTION public.validar_asignacion(_persona text, _franja uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  f public.franja; p public.persona; pu public.puesto; prm public.parametros;
  otro_local text; dias date[]; run int; d date; descanso interval;
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
  if prm.permitir_doble_turno and exists (select 1 from public.turno t join public.franja g on g.id = t.franja_id
      where t.persona_id = _persona and t.estado = 'activo' and g.id <> _franja
        and g.fecha = f.fecha and g.ts_inicio < f.ts_fin and g.ts_fin > f.ts_inicio) then
    return 'Se solapa con otro turno';
  end if;
  descanso := make_interval(secs => (prm.descanso_min_h * 3600)::double precision);
  select g.local_id into otro_local
    from public.turno t join public.franja g on g.id = t.franja_id
   where t.persona_id = _persona and t.estado = 'activo' and g.id <> _franja
     and g.ts_inicio < f.ts_fin + descanso and g.ts_fin > f.ts_inicio - descanso
     and not (prm.permitir_doble_turno and g.fecha = f.fecha)
   order by (g.local_id <> f.local_id) desc limit 1;
  if found then
    return 'Descanso <' || prm.descanso_min_h::float8 || 'h' ||
      case when otro_local <> f.local_id then ' (incluye el otro local)' else '' end;
  end if;
  select array_agg(distinct g.fecha) into dias
    from public.turno t join public.franja g on g.id = t.franja_id
   where t.persona_id = _persona and t.estado = 'activo';
  dias := coalesce(dias, '{}'::date[]) || f.fecha;
  run := 1; d := f.fecha - 1;
  while d = any(dias) loop run := run + 1; d := d - 1; end loop;
  d := f.fecha + 1;
  while d = any(dias) loop run := run + 1; d := d + 1; end loop;
  if run > prm.max_dias_seguidos then
    return (prm.max_dias_seguidos + 1) || ' días seguidos — falta descanso';
  end if;
  return null;
end $function$;