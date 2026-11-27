do $m$ declare d text; begin
  d := pg_get_functiondef('public.ejecutar_comando(uuid,text,jsonb)'::regprocedure);
  d := replace(d, ', habilidad_requerida, fecha, ts_inicio, ts_fin)', ', habilidad_requerida)');
  d := replace(d, $x$habilidad_requerida,
        fecha + 7, ts_inicio + interval '7 days', ts_fin + interval '7 days'
      from$x$, 'habilidad_requerida
      from');
  if d ~ 'ts_inicio \+ interval' then raise exception 'reemplazo falló'; end if;
  execute d;
end $m$;