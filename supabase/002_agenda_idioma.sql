-- =====================================================================
-- CuidaTEA v2 — agenda visual (rutinas) e idioma de cada niño
-- Se ejecuta DESPUÉS de schema.sql.
-- =====================================================================

-- Idioma de los pictogramas y la voz de cada niño: 'es' (castellano) o 'ca' (català)
alter table public.children add column if not exists lang text not null default 'es' check (lang in ('es','ca'));

-- Categorías del tablero (valores cerrados)
alter table public.child_pictos drop constraint if exists child_pictos_category_check;
update public.child_pictos set category = 'general'
  where category not in ('general','necesidades','comida','lugares','personas','emociones','acciones','juego');
alter table public.child_pictos add constraint child_pictos_category_check
  check (category in ('general','necesidades','comida','lugares','personas','emociones','acciones','juego'));

-- Rutinas (agenda visual): una rutina tiene pasos ordenados
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  position int not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  arasaac_id int,
  photo_path text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.routines(child_id);
create index on public.routine_steps(routine_id);

revoke all on public.routines, public.routine_steps from anon, authenticated;
grant select, insert, update, delete on public.routines, public.routine_steps to authenticated;
grant all on public.routines, public.routine_steps to service_role;
alter table public.routines enable row level security;
alter table public.routine_steps enable row level security;

create or replace function public.routine_child(_routine uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select child_id from public.routines where id = _routine $$;
revoke execute on function public.routine_child(uuid) from anon, public;
grant execute on function public.routine_child(uuid) to authenticated;

create policy "routines read"   on public.routines for select to authenticated using (public.is_child_member(child_id));
create policy "routines insert" on public.routines for insert to authenticated with check (public.is_child_member(child_id) and created_by = auth.uid());
create policy "routines update" on public.routines for update to authenticated using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy "routines delete" on public.routines for delete to authenticated using (public.is_child_member(child_id));

create policy "steps read"   on public.routine_steps for select to authenticated using (public.is_child_member(public.routine_child(routine_id)));
create policy "steps insert" on public.routine_steps for insert to authenticated with check (public.is_child_member(public.routine_child(routine_id)));
create policy "steps update" on public.routine_steps for update to authenticated using (public.is_child_member(public.routine_child(routine_id))) with check (public.is_child_member(public.routine_child(routine_id)));
create policy "steps delete" on public.routine_steps for delete to authenticated using (public.is_child_member(public.routine_child(routine_id)));
