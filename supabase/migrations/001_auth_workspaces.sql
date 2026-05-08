create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('owner', 'admin', 'member')),
  constraint workspace_members_workspace_id_user_id_key unique (workspace_id, user_id)
);

create index if not exists workspaces_owner_id_idx
  on public.workspaces(owner_id);

create index if not exists workspace_members_workspace_id_idx
  on public.workspace_members(workspace_id);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_full_name text;
  workspace_name text;
  new_workspace_id uuid;
begin
  user_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  workspace_name := coalesce(user_full_name || '''s Workspace', 'Meu Workspace');

  insert into public.profiles (id, full_name, email)
  values (new.id, user_full_name, new.email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  select w.id
  into new_workspace_id
  from public.workspaces w
  where w.owner_id = new.id
  order by w.created_at asc
  limit 1;

  if new_workspace_id is null then
    insert into public.workspaces (name, owner_id)
    values (workspace_name, new.id)
    returning id into new_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Members can read their workspaces" on public.workspaces;
create policy "Members can read their workspaces"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "Owners can update own workspaces" on public.workspaces;
create policy "Owners can update own workspaces"
on public.workspaces
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Members can read workspace memberships" on public.workspace_members;
create policy "Members can read workspace memberships"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners can insert workspace memberships" on public.workspace_members;
create policy "Owners can insert workspace memberships"
on public.workspace_members
for insert
to authenticated
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Owners can update workspace memberships" on public.workspace_members;
create policy "Owners can update workspace memberships"
on public.workspace_members
for update
to authenticated
using (
  public.is_workspace_owner(workspace_id)
)
with check (
  public.is_workspace_owner(workspace_id)
  and (
    user_id <> auth.uid()
    or role = 'owner'
  )
);

drop policy if exists "Owners can delete workspace memberships" on public.workspace_members;
create policy "Owners can delete workspace memberships"
on public.workspace_members
for delete
to authenticated
using (
  public.is_workspace_owner(workspace_id)
  and user_id <> auth.uid()
);

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
