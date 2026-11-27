alter table public.semana add column publicada_en timestamptz;
update public.semana set publicada_en = now() where publicada_en is null;

drop policy if exists "staff o propios" on public.turno;
create policy "staff o propios" on public.turno for select to authenticated
  using (public.es_staff() or (persona_id = public.persona_actual() and exists (
    select 1 from public.franja f join public.semana s on s.id = f.semana_id
    where f.id = turno.franja_id and s.publicada_en is not null)));

do $m$ declare d text; begin
  d := pg_get_functiondef('public.ejecutar_comando(uuid,text,jsonb)'::regprocedure);
  d := replace(d, '''quitar'',''cerrar_semana''', '''quitar'',''publicar_semana'',''cerrar_semana''');
  d := replace(d, 'elsif _tipo = ''cerrar_semana'' then', 'elsif _tipo = ''publicar_semana'' then
    update public.semana set publicada_en = coalesce(publicada_en, now()) where id = s.id;
  elsif _tipo = ''cerrar_semana'' then
    update public.semana set publicada_en = coalesce(publicada_en, now()) where id = s.id;');
  if d !~ '''publicar_semana'',''cerrar_semana''' or d !~ 'elsif _tipo = ''publicar_semana''' then raise exception 'reemplazo comando falló'; end if;
  execute d;

  d := pg_get_functiondef('public.turnos_intercambiables(text)'::regprocedure);
  d := replace(d, 's.estado = ''abierta''', 's.estado = ''abierta'' and s.publicada_en is not null');
  if d !~ 'publicada_en' then raise exception 'reemplazo intercambiables falló'; end if;
  execute d;
  d := pg_get_functiondef('public.turnos_intercambiables_compatibles(text,uuid)'::regprocedure);
  d := replace(d, 's.estado = ''abierta''', 's.estado = ''abierta'' and s.publicada_en is not null');
  if d !~ 'publicada_en' then raise exception 'reemplazo compatibles falló'; end if;
  execute d;
end $m$;