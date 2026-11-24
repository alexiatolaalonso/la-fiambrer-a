create or replace function public._validar_intercambio()
returns trigger language plpgsql security definer set search_path = public as $$
declare fa public.franja; fb public.franja;
begin
  select g.* into fa from public.turno tu join public.franja g on g.id = tu.franja_id where tu.id = new.turno_a;
  if not exists (select 1 from public.persona where id = new.persona_b and fa.local_id = any(locales)) then
    raise exception 'Solo puedes intercambiar con alguien del mismo local y posición';
  end if;
  if new.turno_b is not null then
    select g.* into fb from public.turno tu join public.franja g on g.id = tu.franja_id where tu.id = new.turno_b;
    if fb.local_id <> fa.local_id or fb.puesto_id <> fa.puesto_id then
      raise exception 'Solo puedes intercambiar con alguien del mismo local y posición';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public._validar_intercambio() from public, anon, authenticated;
create trigger intercambio_mismo_local_puesto before insert on public.intercambio
  for each row execute function public._validar_intercambio();

create or replace function public.companeros_intercambio(_turno uuid)
returns table(id text, alias text)
language sql stable security definer set search_path = public as $$
  select p.id, p.alias from public.persona p
  join public.turno tu on tu.id = _turno
  join public.franja g on g.id = tu.franja_id
  where tu.persona_id = public.persona_actual() and p.id <> tu.persona_id
    and g.local_id = any(p.locales)
  order by p.alias
$$;
revoke execute on function public.companeros_intercambio(uuid) from public, anon;
grant execute on function public.companeros_intercambio(uuid) to authenticated;

create or replace function public.turnos_intercambiables_compatibles(_persona text, _turno_ref uuid)
returns table(turno_id uuid, fecha date, inicio time, fin time, local text, puesto text)
language sql stable security definer set search_path = public as $$
  select t.id, f.fecha, f.inicio, f.fin, l.nombre, pu.nombre
  from public.turno t join public.franja f on f.id = t.franja_id
  join public.local l on l.id = f.local_id join public.puesto pu on pu.id = f.puesto_id
  join public.semana s on s.id = f.semana_id
  join public.turno r on r.id = _turno_ref join public.franja rf on rf.id = r.franja_id
  where t.persona_id = _persona and t.estado = 'activo' and s.estado = 'abierta'
    and f.local_id = rf.local_id and f.puesto_id = rf.puesto_id
    and r.persona_id = public.persona_actual()
  order by f.ts_inicio
$$;
revoke execute on function public.turnos_intercambiables_compatibles(text, uuid) from public, anon;
grant execute on function public.turnos_intercambiables_compatibles(text, uuid) to authenticated;