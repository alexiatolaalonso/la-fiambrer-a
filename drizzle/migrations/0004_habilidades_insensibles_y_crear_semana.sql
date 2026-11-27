create or replace function public._normalizar_habilidades() returns trigger language plpgsql set search_path = public as $$
begin
  new.habilidades := coalesce((select array_agg(h order by o) from (
    select distinct on (lower(trim(x))) trim(x) as h, o from unnest(new.habilidades) with ordinality as u(x, o)
    where trim(x) <> '' order by lower(trim(x)), o) q), '{}');
  return new;
end $$;
drop trigger if exists persona_normalizar_habilidades on public.persona;
create trigger persona_normalizar_habilidades before insert or update on public.persona
  for each row execute function public._normalizar_habilidades();
update public.persona set habilidades = habilidades where id is not null;

do $m$ declare d text; begin
  d := pg_get_functiondef('public.validar_asignacion(text,uuid)'::regprocedure);
  d := replace(d, '(f.habilidad_requerida = any(p.habilidades))', '(lower(trim(f.habilidad_requerida)) in (select lower(trim(x)) from unnest(p.habilidades) x))');
  d := replace(d, '(pu.habilidad_requerida = any(p.habilidades))', '(lower(trim(pu.habilidad_requerida)) in (select lower(trim(x)) from unnest(p.habilidades) x))');
  if d !~ 'unnest\(p.habilidades\) x\)\)[^$]*unnest' then raise exception 'reemplazo habilidad falló'; end if;
  execute d;

  d := pg_get_functiondef('public.ejecutar_comando(uuid,text,jsonb)'::regprocedure);
  d := replace(d, 'array[''asignar'',', 'array[''crear_semana'',''asignar'',');
  d := replace(d, '  if not (_datos ? ''semana'') then raise exception ''Falta la semana''; end if;',
$b$  if _tipo = 'crear_semana' then
    select * into s from public.semana order by id desc limit 1 for update;
    if not found then raise exception 'No hay semana base para copiar'; end if;
    insert into public.semana(id) values (s.id + 7);
    insert into public.franja(semana_id, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo, etiqueta, habilidad_requerida, fecha, ts_inicio, ts_fin)
      select s.id + 7, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo, etiqueta, habilidad_requerida,
        fecha + 7, ts_inicio + interval '7 days', ts_fin + interval '7 days'
      from public.franja where semana_id = s.id;
    res := jsonb_build_object('ok', true, 'semana', (s.id + 7)::text);
    update public.comando set resultado = res where id = _id;
    return res;
  end if;
  if not (_datos ? 'semana') then raise exception 'Falta la semana'; end if;$b$);
  if d !~ 'crear_semana'' then' then raise exception 'reemplazo comando falló'; end if;
  execute d;
end $m$;