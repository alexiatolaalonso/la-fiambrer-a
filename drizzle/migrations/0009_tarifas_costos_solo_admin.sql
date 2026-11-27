drop policy if exists "leer" on public.tarifa;
create policy "admin lee" on public.tarifa for select to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.costos_semana(_semana date)
returns table(turno_id uuid, persona_id text, alias text, franja_id uuid, local_id text, puesto_id text,
  fecha date, dia int, inicio time, fin time, horas numeric, tarifa numeric, domingo boolean,
  horas_extra numeric, costo numeric, congelado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Solo administración'; end if;
  return query select * from public._costos_semana(_semana);
end $$;