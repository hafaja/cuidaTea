-- =====================================================================
-- CuidaTEA — esquema de base de datos para Supabase
-- Pégalo entero en Supabase → SQL Editor → New query → Run (una sola vez).
--
-- Parte del esquema que generó Lovable, con estas correcciones de seguridad:
--  1. Un profesional ya no puede unirse a cualquier centro cambiando su
--     perfil: hace falta el código del centro (join_center).
--  2. El código del centro solo lo ven los profesionales de ese centro.
--  3. Un niño solo puede vincularse al centro propio del profesional
--     (antes se podía "colgar" de otro centro y ver sus fotos).
--  4. Cada usuario solo ve el nombre de su centro y de los centros de
--     sus niños, no la lista de todos los centros.
--  5. Se crea el bucket privado de fotos.
-- =====================================================================

create extension if not exists pgcrypto;

create type public.app_role as enum ('familia','profesional','admin');

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  center_id uuid references public.centers(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
create table public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  birth_date date,
  notes text check (char_length(notes) <= 2000),
  center_id uuid references public.centers(id) on delete set null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.child_members (
  child_id uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relation text not null default 'familia',
  primary key(child_id, user_id)
);
create table public.child_pictos (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  arasaac_id int,
  photo_path text,
  category text not null default 'general',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.center_photos (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  path text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Permisos de tabla (las filas las filtran las políticas RLS) ----------
grant select, insert, update, delete on public.children, public.child_members, public.child_pictos, public.center_photos to authenticated;
grant select (id, name, created_by, created_at) on public.centers to authenticated;  -- sin join_code
grant select on public.profiles, public.user_roles to authenticated;
grant update (full_name) on public.profiles to authenticated;                          -- center_id solo vía funciones
grant all on all tables in schema public to service_role;

alter table public.centers enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.children enable row level security;
alter table public.child_members enable row level security;
alter table public.child_pictos enable row level security;
alter table public.center_photos enable row level security;

-- ---------- Funciones auxiliares ----------
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.is_child_member(_child uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.child_members where child_id=_child and user_id=auth.uid()) $$;

create or replace function public.my_center() returns uuid
language sql stable security definer set search_path = public as $$
  select center_id from public.profiles where id=auth.uid() $$;

create or replace function public.can_view_center(_center uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select _center = public.my_center()
      or exists(select 1 from public.children c join public.child_members m on m.child_id=c.id
                where c.center_id=_center and m.user_id=auth.uid()) $$;

-- ---------- Políticas ----------
create policy "roles own" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "profiles own select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "centers read" on public.centers for select to authenticated using (public.can_view_center(id));

create policy "children read" on public.children for select to authenticated
  using (public.is_child_member(id) or created_by = auth.uid());
create policy "children create" on public.children for insert to authenticated
  with check (public.has_role(auth.uid(),'profesional') and created_by = auth.uid()
              and (center_id is null or center_id = public.my_center()));
create policy "children update" on public.children for update to authenticated
  using (public.is_child_member(id) and public.has_role(auth.uid(),'profesional'))
  with check (center_id is null or center_id = public.my_center()
              or center_id = (select c.center_id from public.children c where c.id = children.id));
create policy "children delete" on public.children for delete to authenticated using (created_by = auth.uid());

create policy "members read" on public.child_members for select to authenticated using (public.is_child_member(child_id));
create policy "members remove" on public.child_members for delete to authenticated
  using (public.is_child_member(child_id) and public.has_role(auth.uid(),'profesional') and user_id <> auth.uid());

create policy "pictos read" on public.child_pictos for select to authenticated using (public.is_child_member(child_id));
create policy "pictos insert" on public.child_pictos for insert to authenticated with check (public.is_child_member(child_id));
create policy "pictos update" on public.child_pictos for update to authenticated using (public.is_child_member(child_id));
create policy "pictos delete" on public.child_pictos for delete to authenticated using (public.is_child_member(child_id));

create policy "photos read" on public.center_photos for select to authenticated using (public.can_view_center(center_id));
create policy "photos insert" on public.center_photos for insert to authenticated
  with check (center_id = public.my_center() and public.has_role(auth.uid(),'profesional'));
create policy "photos delete" on public.center_photos for delete to authenticated
  using (center_id = public.my_center() and public.has_role(auth.uid(),'profesional'));

-- ---------- Altas automáticas ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name)
    values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)), 100));
  insert into public.user_roles(user_id, role)
    values (new.id, case when new.raw_user_meta_data->>'role' = 'profesional' then 'profesional'::app_role else 'familia'::app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.add_creator_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.child_members(child_id,user_id,relation) values (new.id,new.created_by,'profesional'); return new; end $$;
create trigger on_child_created after insert on public.children for each row execute function public.add_creator_member();

-- ---------- Funciones que llama la app ----------
create or replace function public.create_center(_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not public.has_role(auth.uid(),'profesional') then raise exception 'Solo profesionales'; end if;
  insert into public.centers(name, created_by) values (left(trim(_name),100), auth.uid()) returning id into cid;
  update public.profiles set center_id = cid where id = auth.uid();
  return cid;
end $$;

create or replace function public.join_center(_code text) returns text
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not public.has_role(auth.uid(),'profesional') then raise exception 'Solo profesionales'; end if;
  select id into cid from public.centers where join_code = upper(trim(_code));
  if cid is null then return 'not_found'; end if;
  update public.profiles set center_id = cid where id = auth.uid();
  return 'ok';
end $$;

create or replace function public.leave_center() returns void
language sql security definer set search_path = public as $$
  update public.profiles set center_id = null where id = auth.uid() $$;

create or replace function public.my_center_code() returns text
language sql stable security definer set search_path = public as $$
  select c.join_code from public.centers c
  where c.id = public.my_center() and public.has_role(auth.uid(),'profesional') $$;

create or replace function public.add_member_by_email(_child uuid, _email text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; r text;
begin
  if not (public.is_child_member(_child) and public.has_role(auth.uid(),'profesional')) then raise exception 'No autorizado'; end if;
  select id into uid from auth.users where lower(email)=lower(trim(_email));
  if uid is null then return 'not_found'; end if;
  r := case when public.has_role(uid,'profesional') then 'profesional' else 'familia' end;
  insert into public.child_members(child_id,user_id,relation) values (_child,uid,r) on conflict do nothing;
  return 'ok';
end $$;

create or replace function public.list_child_members(_child uuid) returns table(user_id uuid, full_name text, relation text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, m.relation from public.child_members m
  left join public.profiles p on p.id=m.user_id
  where m.child_id=_child and public.is_child_member(_child) $$;

revoke execute on all functions in schema public from anon, public;
grant execute on function public.create_center(text), public.join_center(text), public.leave_center(),
  public.my_center_code(), public.add_member_by_email(uuid,text), public.list_child_members(uuid),
  public.has_role(uuid,app_role), public.is_child_member(uuid), public.my_center(), public.can_view_center(uuid)
  to authenticated;

-- ---------- Almacenamiento de fotos (bucket privado) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('center-photos', 'center-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "center photos read" on storage.objects for select to authenticated
  using (bucket_id='center-photos' and public.can_view_center(((storage.foldername(name))[1])::uuid));
create policy "center photos upload" on storage.objects for insert to authenticated
  with check (bucket_id='center-photos' and ((storage.foldername(name))[1])::uuid = public.my_center()
              and public.has_role(auth.uid(),'profesional'));
create policy "center photos delete" on storage.objects for delete to authenticated
  using (bucket_id='center-photos' and ((storage.foldername(name))[1])::uuid = public.my_center()
         and public.has_role(auth.uid(),'profesional'));
