
create type public.app_role as enum ('admin','encargado','equipo');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "ver mis roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.es_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'encargado')
$$;

create table public.parametros (
  id int primary key default 1 check (id = 1),
  descanso_min_h numeric not null default 11,
  max_dias_seguidos int not null default 6,
  tope_semanal_default numeric not null default 40,
  mult_extra numeric not null default 1.5,
  prima_dominical numeric not null default 0.25
);
create table public.local (id text primary key, nombre text not null);
create table public.puesto (id text primary key, nombre text not null, habilidad_requerida text);
create table public.persona (
  id text primary key, alias text not null, email text not null unique,
  locales text[] not null default '{}', habilidades text[] not null default '{}',
  tope_semanal numeric not null default 40
);
create table public.no_disponible (
  persona_id text not null references public.persona(id) on delete cascade,
  dia int not null check (dia between 0 and 6),
  primary key (persona_id, dia)
);
create table public.semana (
  id date primary key,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada')),
  revision int not null default 0,
  cerrada_en timestamptz
);
create table public.franja (
  id uuid primary key default gen_random_uuid(),
  semana_id date not null references public.semana(id) on delete cascade,
  local_id text not null references public.local(id) on delete cascade,
  puesto_id text not null references public.puesto(id) on delete cascade,
  dia int not null check (dia between 0 and 6),
  inicio time not null, fin time not null,
  cobertura_minima int not null default 1 check (cobertura_minima >= 0),
  cupo_maximo int not null default 2,
  etiqueta text, habilidad_requerida text,
  fecha date generated always as (semana_id + dia) stored,
  ts_inicio timestamp generated always as ((semana_id + dia) + inicio) stored,
  ts_fin timestamp generated always as ((semana_id + dia) + fin + case when fin <= inicio then interval '1 day' else interval '0 day' end) stored,
  check (cupo_maximo >= cobertura_minima and cupo_maximo >= 1)
);
create table public.tarifa (
  id bigserial primary key,
  puesto_id text not null references public.puesto(id) on delete cascade,
  importe numeric not null check (importe > 0),
  vigente_desde date not null,
  creado_en timestamptz not null default now(),
  unique (puesto_id, vigente_desde)
);
create table public.turno (
  id uuid primary key default gen_random_uuid(),
  persona_id text not null references public.persona(id) on delete cascade,
  franja_id uuid not null references public.franja(id) on delete cascade,
  estado text not null default 'activo' check (estado in ('activo','liberado','intercambiado','quitado')),
  tarifa_aplicada numeric not null,
  costo_congelado numeric,
  origen_id uuid references public.turno(id) on delete set null,
  creado_en timestamptz not null default now()
);
create unique index turno_unico_activo on public.turno(persona_id, franja_id) where estado = 'activo';
create table public.ausencia (
  id uuid primary key default gen_random_uuid(),
  persona_id text not null references public.persona(id) on delete cascade,
  semana_id date not null references public.semana(id) on delete cascade,
  dia int not null check (dia between 0 and 6),
  motivo text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  motivo_rechazo text,
  creado_en timestamptz not null default now(), resuelto_en timestamptz
);
create table public.intercambio (
  id uuid primary key default gen_random_uuid(),
  semana_id date not null references public.semana(id) on delete cascade,
  turno_a uuid not null references public.turno(id) on delete cascade,
  persona_a text not null references public.persona(id) on delete cascade,
  persona_b text not null references public.persona(id) on delete cascade,
  turno_b uuid references public.turno(id) on delete cascade,
  nota text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  motivo_rechazo text,
  creado_en timestamptz not null default now(), resuelto_en timestamptz
);
create table public.comando (
  id uuid primary key, tipo text not null, datos jsonb not null,
  usuario uuid, resultado jsonb, creado_en timestamptz not null default now()
);
create table public.ajuste (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turno(id) on delete cascade,
  semana_id date not null references public.semana(id) on delete cascade,
  horas numeric not null, importe numeric not null, motivo text not null,
  creado_en timestamptz not null default now()
);

create or replace function public.persona_actual()
returns text language sql stable security definer set search_path = public as $$
  select id from public.persona where lower(email) = lower(coalesce(auth.jwt()->>'email',''))
$$;

grant select on public.parametros, public.local, public.puesto, public.persona, public.no_disponible,
  public.semana, public.franja, public.tarifa, public.turno, public.ausencia, public.intercambio,
  public.comando, public.ajuste to authenticated;
grant insert, update, delete on public.local, public.puesto, public.persona, public.no_disponible, public.franja to authenticated;
grant update on public.parametros to authenticated;
grant insert on public.tarifa to authenticated;
grant usage on sequence public.tarifa_id_seq to authenticated;
grant all on public.parametros, public.local, public.puesto, public.persona, public.no_disponible,
  public.semana, public.franja, public.tarifa, public.turno, public.ausencia, public.intercambio,
  public.comando, public.ajuste to service_role;

alter table public.parametros enable row level security;
alter table public.local enable row level security;
alter table public.puesto enable row level security;
alter table public.persona enable row level security;
alter table public.no_disponible enable row level security;
alter table public.semana enable row level security;
alter table public.franja enable row level security;
alter table public.tarifa enable row level security;
alter table public.turno enable row level security;
alter table public.ausencia enable row level security;
alter table public.intercambio enable row level security;
alter table public.comando enable row level security;
alter table public.ajuste enable row level security;

create policy "leer" on public.parametros for select to authenticated using (true);
create policy "leer" on public.local for select to authenticated using (true);
create policy "leer" on public.puesto for select to authenticated using (true);
create policy "leer" on public.persona for select to authenticated using (true);
create policy "leer" on public.no_disponible for select to authenticated using (true);
create policy "leer" on public.semana for select to authenticated using (true);
create policy "leer" on public.franja for select to authenticated using (true);
create policy "leer" on public.tarifa for select to authenticated using (true);

create policy "admin escribe" on public.parametros for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin inserta" on public.local for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin edita" on public.local for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin borra" on public.local for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin inserta" on public.puesto for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin edita" on public.puesto for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin borra" on public.puesto for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin inserta" on public.persona for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin edita" on public.persona for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin borra" on public.persona for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin inserta" on public.no_disponible for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin borra" on public.no_disponible for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin inserta" on public.tarifa for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin inserta abierta" on public.franja for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') and exists (select 1 from public.semana s where s.id = semana_id and s.estado = 'abierta'));
create policy "admin edita abierta" on public.franja for update to authenticated
  using (public.has_role(auth.uid(),'admin') and exists (select 1 from public.semana s where s.id = semana_id and s.estado = 'abierta'))
  with check (public.has_role(auth.uid(),'admin') and exists (select 1 from public.semana s where s.id = semana_id and s.estado = 'abierta'));
create policy "admin borra abierta" on public.franja for delete to authenticated
  using (public.has_role(auth.uid(),'admin') and exists (select 1 from public.semana s where s.id = semana_id and s.estado = 'abierta'));

create policy "staff o propios" on public.turno for select to authenticated
  using (public.es_staff() or persona_id = public.persona_actual());
create policy "staff o propias" on public.ausencia for select to authenticated
  using (public.es_staff() or persona_id = public.persona_actual());
create policy "staff o involucrados" on public.intercambio for select to authenticated
  using (public.es_staff() or persona_a = public.persona_actual() or persona_b = public.persona_actual());
create policy "staff" on public.comando for select to authenticated using (public.es_staff());
create policy "staff" on public.ajuste for select to authenticated using (public.es_staff());

create or replace function public.tarifa_vigente(_puesto text, _fecha date)
returns numeric language sql stable set search_path = public as $$
  select importe from public.tarifa where puesto_id = _puesto and vigente_desde <= _fecha
  order by vigente_desde desc limit 1
$$;

create or replace function public.validar_asignacion(_persona text, _franja uuid)
returns text language plpgsql stable security definer set search_path = public as $$
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
     or exists (select 1 from public.ausencia where persona_id = _persona and semana_id = f.semana_id and dia = f.dia and estado = 'aprobada') then
    return 'No disponible';
  end if;
  if f.habilidad_requerida is not null and not (f.habilidad_requerida = any(p.habilidades)) then
    return coalesce(f.etiqueta, pu.nombre) || ' requiere habilidad ' || f.habilidad_requerida;
  end if;
  if pu.habilidad_requerida is not null and not (pu.habilidad_requerida = any(p.habilidades)) then
    return pu.nombre || ' requiere habilidad ' || pu.habilidad_requerida;
  end if;
  if exists (select 1 from public.turno where persona_id = _persona and franja_id = _franja and estado = 'activo') then
    return 'Ya está asignada a esta franja';
  end if;
  descanso := make_interval(secs => (prm.descanso_min_h * 3600)::double precision);
  select g.local_id into otro_local
    from public.turno t join public.franja g on g.id = t.franja_id
   where t.persona_id = _persona and t.estado = 'activo' and g.id <> _franja
     and g.ts_inicio < f.ts_fin + descanso and g.ts_fin > f.ts_inicio - descanso
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
end $$;

create or replace function public._costos_semana(_semana date)
returns table(turno_id uuid, persona_id text, alias text, franja_id uuid, local_id text, puesto_id text,
  fecha date, dia int, inicio time, fin time, horas numeric, tarifa numeric, domingo boolean,
  horas_extra numeric, costo numeric, congelado boolean)
language sql stable security definer set search_path = public as $$
  with prm as (select * from public.parametros where id = 1),
  base as (
    select t.id as tid, t.persona_id as pid, p.alias as al, f.id as fid, f.local_id as lid, f.puesto_id as puid,
      f.fecha as fe, f.dia as di, f.inicio as ini, f.fin as fi,
      round((extract(epoch from (f.ts_fin - f.ts_inicio)) / 3600)::numeric, 2) as h,
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

create or replace function public.costos_semana(_semana date)
returns table(turno_id uuid, persona_id text, alias text, franja_id uuid, local_id text, puesto_id text,
  fecha date, dia int, inicio time, fin time, horas numeric, tarifa numeric, domingo boolean,
  horas_extra numeric, costo numeric, congelado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo administración o encargado'; end if;
  return query select * from public._costos_semana(_semana);
end $$;

create or replace function public.turnos_intercambiables(_persona text)
returns table(turno_id uuid, fecha date, inicio time, fin time, local text, puesto text)
language sql stable security definer set search_path = public as $$
  select t.id, f.fecha, f.inicio, f.fin, l.nombre, pu.nombre
  from public.turno t join public.franja f on f.id = t.franja_id
  join public.local l on l.id = f.local_id join public.puesto pu on pu.id = f.puesto_id
  join public.semana s on s.id = f.semana_id
  where t.persona_id = _persona and t.estado = 'activo' and s.estado = 'abierta' and auth.uid() is not null
  order by f.ts_inicio
$$;

create or replace function public._seed_turno(_persona text, _semana date, _local text, _puesto text, _dia int, _inicio time)
returns void language plpgsql security definer set search_path = public as $$
declare f public.franja;
begin
  select * into f from public.franja where semana_id = _semana and local_id = _local and puesto_id = _puesto and dia = _dia and inicio = _inicio limit 1;
  if not found then raise exception 'seed: franja % % % % no existe', _local, _puesto, _dia, _inicio; end if;
  insert into public.turno(persona_id, franja_id, tarifa_aplicada) values (_persona, f.id, public.tarifa_vigente(f.puesto_id, f.fecha));
end $$;

create or replace function public.reiniciar_demo()
returns void language plpgsql security definer set search_path = public as $$
declare w date; d int; x int;
begin
  delete from public.comando where id is not null;
  delete from public.ajuste where id is not null;
  delete from public.intercambio where id is not null;
  delete from public.ausencia where id is not null;
  delete from public.turno where id is not null;
  delete from public.franja where id is not null;
  delete from public.semana where id is not null;
  delete from public.tarifa where id is not null;
  delete from public.no_disponible where persona_id is not null;
  delete from public.persona where id is not null;
  delete from public.puesto where id is not null;
  delete from public.local where id is not null;
  delete from public.parametros where id is not null;

  insert into public.parametros default values;
  insert into public.local values ('tienda','Tienda Condesa'), ('winebar','Wine Bar Condesa');
  insert into public.puesto values ('sala','Sala',null), ('cocina','Cocina','Cocina'), ('barra','Barra','Barra'), ('sommelier','Sommelier','Servicio de vino');
  insert into public.tarifa(puesto_id, importe, vigente_desde) values
    ('sala',100,'2026-01-01'), ('sala',120,'2026-11-23'),
    ('cocina',130,'2026-01-01'), ('barra',115,'2026-01-01'), ('sommelier',160,'2026-01-01');
  insert into public.persona(id, alias, email, locales, habilidades, tope_semanal) values
    ('mari','Mari','mari.fiambreria@example.com','{tienda}','{Sala}',40),
    ('tono','Toño','tono.fiambreria@example.com','{tienda,winebar}','{Sala,Barra}',40),
    ('lupe','Lupe','lupe.fiambreria@example.com','{tienda}','{Sala}',40),
    ('rocio','Rocío','rocio.fiambreria@example.com','{tienda,winebar}','{Sala,Barra}',40),
    ('beto','Beto','beto.fiambreria@example.com','{tienda}','{Sala}',40),
    ('paco','Paco','paco.fiambreria@example.com','{tienda}','{Sala}',48),
    ('ines','Inés','ines.fiambreria@example.com','{winebar}','{Sala,"Servicio de vino","Catas y servicio de vino"}',40),
    ('sofia','Sofía','sofia.fiambreria@example.com','{winebar,tienda}','{Sala,"Servicio de vino","Catas y servicio de vino"}',40),
    ('julian','Julián','julian.fiambreria@example.com','{winebar}','{Cocina}',40),
    ('meche','Meche','meche.fiambreria@example.com','{winebar}','{Cocina}',40),
    ('dani','Dani','dani.fiambreria@example.com','{winebar}','{Barra,Sala}',40),
    ('caro','Caro','caro.fiambreria@example.com','{winebar}','{Sala,"Servicio de vino"}',40),
    ('nico','Nico','nico.fiambreria@example.com','{winebar,tienda}','{Barra,Sala}',40),
    ('vale','Vale','vale.fiambreria@example.com','{tienda,winebar}','{Sala}',40);
  insert into public.no_disponible values ('beto',2), ('vale',6);

  foreach w in array array['2026-11-16'::date, '2026-11-23'::date] loop
    insert into public.semana(id) values (w);
    for d in 0..6 loop
      insert into public.franja(semana_id, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo) values
        (w,'tienda','sala',d,'10:00','16:00',1,2), (w,'tienda','sala',d,'16:00','21:00',1,2);
      if d >= 1 then
        insert into public.franja(semana_id, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo) values
          (w,'winebar','barra',d,'18:00','01:00',1,2), (w,'winebar','cocina',d,'17:00','00:00',1,1), (w,'winebar','sala',d,'18:00','00:00',2,3);
      end if;
      if d in (4,5) then
        insert into public.franja(semana_id, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo)
          values (w,'winebar','sommelier',d,'19:00','00:00',1,1);
      end if;
      if d = 3 then
        insert into public.franja(semana_id, local_id, puesto_id, dia, inicio, fin, cobertura_minima, cupo_maximo, etiqueta, habilidad_requerida)
          values (w,'winebar','sommelier',d,'17:00','20:00',1,2,'Cata jueves','Catas y servicio de vino');
      end if;
    end loop;
  end loop;

  w := '2026-11-16';
  foreach x in array array[0,1,2] loop perform public._seed_turno('mari', w, 'tienda','sala', x, '10:00'); end loop;
  foreach x in array array[0,1,2,3] loop perform public._seed_turno('lupe', w, 'tienda','sala', x, '16:00'); end loop;
  foreach x in array array[1,2,3,4,5] loop perform public._seed_turno('dani', w, 'winebar','barra', x, '18:00'); end loop;
  foreach x in array array[1,2,3,4,5,6] loop perform public._seed_turno('julian', w, 'winebar','cocina', x, '17:00'); end loop;
  perform public._seed_turno('ines', w, 'winebar','sommelier', 3, '17:00');
  perform public._seed_turno('rocio', w, 'winebar','barra', 6, '18:00');
  update public.turno tu set costo_congelado = c.costo from public._costos_semana(w) c where tu.id = c.turno_id;
  update public.semana set estado = 'cerrada', cerrada_en = now(), revision = 1 where id = w;

  w := '2026-11-23';
  foreach x in array array[1,2] loop perform public._seed_turno('mari', w, 'tienda','sala', x, '10:00'); end loop;
  foreach x in array array[0,1,3] loop perform public._seed_turno('lupe', w, 'tienda','sala', x, '16:00'); end loop;
  foreach x in array array[0,1,2,3,4,5] loop perform public._seed_turno('paco', w, 'tienda','sala', x, '10:00'); end loop;
  foreach x in array array[4,5] loop perform public._seed_turno('tono', w, 'tienda','sala', x, '16:00'); end loop;
  foreach x in array array[1,2,3,4,5] loop perform public._seed_turno('dani', w, 'winebar','barra', x, '18:00'); end loop;
  perform public._seed_turno('dani', w, 'winebar','sala', 6, '18:00');
  foreach x in array array[1,2,3,4] loop perform public._seed_turno('julian', w, 'winebar','cocina', x, '17:00'); end loop;
  foreach x in array array[5,6] loop perform public._seed_turno('meche', w, 'winebar','cocina', x, '17:00'); end loop;
  foreach x in array array[1,2,3,4,5] loop perform public._seed_turno('caro', w, 'winebar','sala', x, '18:00'); end loop;
  foreach x in array array[4,5] loop perform public._seed_turno('nico', w, 'winebar','sala', x, '18:00'); end loop;
  foreach x in array array[4,5] loop perform public._seed_turno('sofia', w, 'winebar','sommelier', x, '19:00'); end loop;
end $$;

create or replace function public.ejecutar_comando(_id uuid, _tipo text, _datos jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  prev public.comando; s public.semana; f public.franja; t public.turno; t2 public.turno;
  a public.ausencia; i public.intercambio; prm public.parametros;
  uid uuid := auth.uid(); yo text := public.persona_actual(); staff boolean := public.es_staff();
  motivo text; n int; nuevo uuid; tar numeric; res jsonb; rev int;
  tipos_staff text[] := array['asignar','quitar','cerrar_semana','resolver_ausencia','resolver_intercambio','ajuste'];
begin
  if uid is null then raise exception 'Sesión requerida'; end if;
  begin
    insert into public.comando(id, tipo, datos, usuario) values (_id, _tipo, _datos, uid);
  exception when unique_violation then
    select * into prev from public.comando where id = _id;
    if prev.tipo = _tipo and prev.datos = _datos then
      return coalesce(prev.resultado, '{}'::jsonb) || jsonb_build_object('repetido', true);
    end if;
    raise exception 'Comando ya usado con datos distintos — no se aplicó ningún cambio';
  end;

  if _tipo = any(tipos_staff) and not staff then
    raise exception 'Permiso denegado: requiere administración o encargado';
  end if;

  if _tipo = 'reiniciar' then
    if not public.has_role(uid, 'admin') then raise exception 'Solo administración puede reiniciar'; end if;
    perform public.reiniciar_demo();
    return jsonb_build_object('ok', true);
  end if;

  if not (_datos ? 'semana') then raise exception 'Falta la semana'; end if;
  select * into s from public.semana where id = (_datos->>'semana')::date for update;
  if not found then raise exception 'Semana inexistente'; end if;
  if _tipo = any(tipos_staff) and not (_datos ? 'revision') then
    raise exception 'Falta la revisión de la semana';
  end if;
  if _datos ? 'revision' and (_datos->>'revision')::int <> s.revision then
    raise exception 'Revisión desactualizada: la semana va por la revisión %, tenías la %. Recarga y reintenta.', s.revision, _datos->>'revision';
  end if;
  if _tipo <> 'ajuste' and s.estado = 'cerrada' then
    raise exception 'Semana cerrada — solo lectura';
  end if;

  if _tipo = 'asignar' then
    select * into f from public.franja where id = (_datos->>'franja')::uuid and semana_id = s.id for update;
    if not found then raise exception 'Franja inexistente en esta semana'; end if;
    perform 1 from public.persona where id = _datos->>'persona' for update;
    select count(*) into n from public.turno where franja_id = f.id and estado = 'activo';
    if n >= f.cupo_maximo then raise exception 'Franja completa (cupo %)', f.cupo_maximo; end if;
    motivo := public.validar_asignacion(_datos->>'persona', f.id);
    if motivo is not null then raise exception '%', motivo; end if;
    tar := public.tarifa_vigente(f.puesto_id, f.fecha);
    if tar is null then raise exception 'Sin tarifa vigente para el puesto'; end if;
    insert into public.turno(persona_id, franja_id, tarifa_aplicada) values (_datos->>'persona', f.id, tar) returning id into nuevo;

  elsif _tipo = 'quitar' then
    update public.turno tu set estado = 'quitado'
      from public.franja g where g.id = tu.franja_id and g.semana_id = s.id
       and tu.id = (_datos->>'turno')::uuid and tu.estado = 'activo';
    if not found then raise exception 'El turno ya no está activo'; end if;

  elsif _tipo = 'cerrar_semana' then
    update public.turno tu set costo_congelado = c.costo from public._costos_semana(s.id) c where tu.id = c.turno_id;
    update public.semana set estado = 'cerrada', cerrada_en = now() where id = s.id;

  elsif _tipo = 'pedir_ausencia' then
    if yo is null then raise exception 'Tu cuenta no está vinculada a una persona del equipo'; end if;
    if coalesce(_datos->>'dia','') !~ '^[0-6]$' then raise exception 'Día inválido'; end if;
    insert into public.ausencia(persona_id, semana_id, dia, motivo)
      values (yo, s.id, (_datos->>'dia')::int, left(coalesce(_datos->>'motivo',''), 300)) returning id into nuevo;

  elsif _tipo = 'proponer_intercambio' then
    if yo is null then raise exception 'Tu cuenta no está vinculada a una persona del equipo'; end if;
    select tu.* into t from public.turno tu join public.franja g on g.id = tu.franja_id
      where tu.id = (_datos->>'turno_a')::uuid and tu.persona_id = yo and tu.estado = 'activo' and g.semana_id = s.id;
    if not found then raise exception 'Ese turno no es tuyo o ya no está activo'; end if;
    if (_datos->>'persona_b') = yo or not exists (select 1 from public.persona where id = _datos->>'persona_b') then
      raise exception 'Persona destino inválida';
    end if;
    if nullif(_datos->>'turno_b','') is not null then
      select * into t2 from public.turno where id = (_datos->>'turno_b')::uuid and persona_id = _datos->>'persona_b' and estado = 'activo';
      if not found then raise exception 'El turno de la otra persona no está activo'; end if;
    end if;
    insert into public.intercambio(semana_id, turno_a, persona_a, persona_b, turno_b, nota)
      values (s.id, t.id, yo, _datos->>'persona_b', nullif(_datos->>'turno_b','')::uuid, left(coalesce(_datos->>'nota',''),300))
      returning id into nuevo;

  elsif _tipo = 'resolver_ausencia' then
    select * into a from public.ausencia where id = (_datos->>'ausencia')::uuid and semana_id = s.id for update;
    if not found then raise exception 'Solicitud inexistente'; end if;
    if a.estado <> 'pendiente' then raise exception 'La solicitud ya fue resuelta'; end if;
    if (_datos->>'aprobar')::boolean then
      update public.turno tu set estado = 'liberado'
        from public.franja g where g.id = tu.franja_id and g.semana_id = s.id and g.dia = a.dia
         and tu.persona_id = a.persona_id and tu.estado = 'activo';
      update public.ausencia set estado = 'aprobada', resuelto_en = now() where id = a.id;
    else
      update public.ausencia set estado = 'rechazada', motivo_rechazo = _datos->>'motivo', resuelto_en = now() where id = a.id;
    end if;

  elsif _tipo = 'resolver_intercambio' then
    select * into i from public.intercambio where id = (_datos->>'intercambio')::uuid and semana_id = s.id for update;
    if not found then raise exception 'Solicitud inexistente'; end if;
    if i.estado <> 'pendiente' then raise exception 'La solicitud ya fue resuelta'; end if;
    if (_datos->>'aprobar')::boolean then
      select * into t from public.turno where id = i.turno_a for update;
      if t.estado <> 'activo' then raise exception 'El turno original ya no está activo'; end if;
      if i.turno_b is not null then
        select * into t2 from public.turno where id = i.turno_b for update;
        if t2.estado <> 'activo' then raise exception 'El turno de la otra persona ya no está activo'; end if;
        update public.turno set estado = 'intercambiado' where id = t2.id;
      end if;
      update public.turno set estado = 'intercambiado' where id = t.id;
      motivo := public.validar_asignacion(i.persona_b, t.franja_id);
      if motivo is not null then
        raise exception 'Intercambio inválido para %: %', (select alias from public.persona where id = i.persona_b), motivo;
      end if;
      insert into public.turno(persona_id, franja_id, tarifa_aplicada, origen_id) values (i.persona_b, t.franja_id, t.tarifa_aplicada, t.id);
      if i.turno_b is not null then
        motivo := public.validar_asignacion(i.persona_a, t2.franja_id);
        if motivo is not null then
          raise exception 'Intercambio inválido para %: %', (select alias from public.persona where id = i.persona_a), motivo;
        end if;
        insert into public.turno(persona_id, franja_id, tarifa_aplicada, origen_id) values (i.persona_a, t2.franja_id, t2.tarifa_aplicada, t2.id);
      end if;
      update public.intercambio set estado = 'aprobado', resuelto_en = now() where id = i.id;
    else
      update public.intercambio set estado = 'rechazado', motivo_rechazo = _datos->>'motivo', resuelto_en = now() where id = i.id;
    end if;

  elsif _tipo = 'ajuste' then
    if coalesce(trim(_datos->>'motivo'),'') = '' then raise exception 'El ajuste necesita un motivo'; end if;
    select tu.* into t from public.turno tu join public.franja g on g.id = tu.franja_id
      where tu.id = (_datos->>'turno')::uuid and g.semana_id = s.id;
    if not found then raise exception 'Turno inexistente en esta semana'; end if;
    select * into prm from public.parametros where id = 1;
    insert into public.ajuste(turno_id, semana_id, horas, importe, motivo)
      select t.id, s.id, (_datos->>'horas')::numeric,
        round((_datos->>'horas')::numeric * t.tarifa_aplicada * case when g.dia = 6 then 1 + prm.prima_dominical else 1 end, 2),
        _datos->>'motivo'
      from public.franja g where g.id = t.franja_id
      returning id into nuevo;
  else
    raise exception 'Comando desconocido: %', _tipo;
  end if;

  update public.semana set revision = revision + 1 where id = s.id returning revision into rev;
  res := jsonb_build_object('ok', true, 'revision', rev, 'id', nuevo);
  update public.comando set resultado = res where id = _id;
  return res;
end $$;

revoke execute on function public.reiniciar_demo() from public, anon, authenticated;
revoke execute on function public._seed_turno(text, date, text, text, int, time) from public, anon, authenticated;
revoke execute on function public.validar_asignacion(text, uuid) from public, anon;
revoke execute on function public.ejecutar_comando(uuid, text, jsonb) from public, anon;
revoke execute on function public.costos_semana(date) from public, anon;
revoke execute on function public.turnos_intercambiables(text) from public, anon;
grant execute on function public.ejecutar_comando(uuid, text, jsonb) to authenticated;
grant execute on function public.costos_semana(date) to authenticated;
grant execute on function public.turnos_intercambiables(text) to authenticated;
grant execute on function public.validar_asignacion(text, uuid) to authenticated;
