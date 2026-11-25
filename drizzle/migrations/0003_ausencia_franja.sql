alter table public.ausencia add column franja text not null default 'completo' check (franja in ('manana','tarde','completo'));

create or replace function public._ausencia_cubre(_franja text, _inicio time) returns boolean language sql immutable set search_path = public as $$
  select case _franja when 'manana' then _inicio < '16:00' when 'tarde' then _inicio >= '16:00' else true end
$$;

do $mig$
declare src text;
begin
  src := pg_get_functiondef('public.ejecutar_comando(uuid,text,jsonb)'::regprocedure);
  src := replace(src,
    $o$    insert into public.ausencia(persona_id, semana_id, dia, motivo)
      values (yo, s.id, (_datos->>'dia')::int, left(coalesce(_datos->>'motivo',''), 300)) returning id into nuevo;$o$,
    $n$    if coalesce(_datos->>'franja','completo') not in ('manana','tarde','completo') then raise exception 'Franja inválida'; end if;
    insert into public.ausencia(persona_id, semana_id, dia, motivo, franja)
      values (yo, s.id, (_datos->>'dia')::int, left(coalesce(_datos->>'motivo',''), 300), coalesce(_datos->>'franja','completo')) returning id into nuevo;$n$);
  src := replace(src,
    $o$and tu.persona_id = a.persona_id and tu.estado = 'activo';$o$,
    $n$and tu.persona_id = a.persona_id and tu.estado = 'activo' and public._ausencia_cubre(a.franja, g.inicio);$n$);
  if position('_ausencia_cubre' in src) = 0 or position('Franja inválida' in src) = 0 then raise exception 'ejecutar_comando no coincide'; end if;
  execute src;

  src := pg_get_functiondef('public.validar_asignacion(text,uuid)'::regprocedure);
  src := replace(src, $o$dia = f.dia and estado = 'aprobada')$o$, $n$dia = f.dia and estado = 'aprobada' and public._ausencia_cubre(ausencia.franja, f.inicio))$n$);
  if position('_ausencia_cubre' in src) = 0 then raise exception 'validar_asignacion no coincide'; end if;
  execute src;
end $mig$;