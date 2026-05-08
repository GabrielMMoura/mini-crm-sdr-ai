alter table public.leads
add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists leads_assigned_to_idx
  on public.leads(assigned_to);

create table if not exists public.lead_custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key text not null,
  type text not null default 'text',
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_custom_fields_workspace_id_key_key unique (workspace_id, key),
  constraint lead_custom_fields_name_not_empty check (length(btrim(name)) > 0),
  constraint lead_custom_fields_key_not_empty check (length(btrim(key)) > 0),
  constraint lead_custom_fields_type_check check (
    type in ('text', 'number', 'date', 'boolean', 'select', 'textarea')
  )
);

create index if not exists lead_custom_fields_workspace_id_idx
  on public.lead_custom_fields(workspace_id);

create index if not exists lead_custom_fields_workspace_id_position_idx
  on public.lead_custom_fields(workspace_id, position);

create index if not exists lead_custom_fields_workspace_id_is_active_idx
  on public.lead_custom_fields(workspace_id, is_active);

drop trigger if exists lead_custom_fields_set_updated_at on public.lead_custom_fields;
create trigger lead_custom_fields_set_updated_at
before update on public.lead_custom_fields
for each row
execute function public.set_updated_at();

alter table public.lead_custom_fields enable row level security;

drop policy if exists "Members can read lead custom fields" on public.lead_custom_fields;
create policy "Members can read lead custom fields"
on public.lead_custom_fields
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can insert lead custom fields" on public.lead_custom_fields;
create policy "Members can insert lead custom fields"
on public.lead_custom_fields
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can update lead custom fields" on public.lead_custom_fields;
create policy "Members can update lead custom fields"
on public.lead_custom_fields
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can delete lead custom fields" on public.lead_custom_fields;
create policy "Members can delete lead custom fields"
on public.lead_custom_fields
for delete
to authenticated
using (public.is_workspace_member(workspace_id));
