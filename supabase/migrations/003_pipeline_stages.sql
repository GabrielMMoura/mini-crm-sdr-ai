create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key text not null,
  position integer not null default 0,
  color text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  required_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_stages_workspace_id_key_key unique (workspace_id, key),
  constraint pipeline_stages_workspace_id_position_key unique (workspace_id, position),
  constraint pipeline_stages_name_not_empty check (length(btrim(name)) > 0),
  constraint pipeline_stages_key_not_empty check (length(btrim(key)) > 0)
);

insert into public.pipeline_stages (
  workspace_id,
  name,
  key,
  position,
  color,
  is_default,
  is_active,
  required_fields
)
select
  w.id,
  stage.name,
  stage.key,
  stage.position,
  stage.color,
  true,
  true,
  '[]'::jsonb
from public.workspaces w
cross join (
  values
    ('Base', 'base', 10, 'slate'),
    ('Lead Mapeado', 'mapped', 20, 'blue'),
    ('Tentando Contato', 'trying_contact', 30, 'amber'),
    ('Conexão Iniciada', 'connection_started', 40, 'violet'),
    ('Desqualificado', 'disqualified', 50, 'red'),
    ('Qualificado', 'qualified', 60, 'green'),
    ('Reunião Agendada', 'meeting_scheduled', 70, 'emerald')
) as stage(name, key, position, color)
on conflict (workspace_id, key) do nothing;

alter table public.leads
add column if not exists pipeline_stage_id uuid references public.pipeline_stages(id) on delete set null;

create index if not exists leads_pipeline_stage_id_idx
  on public.leads(pipeline_stage_id);

update public.leads l
set pipeline_stage_id = ps.id
from public.pipeline_stages ps
where ps.workspace_id = l.workspace_id
  and ps.key = 'base'
  and l.pipeline_stage_id is null;

drop trigger if exists pipeline_stages_set_updated_at on public.pipeline_stages;
create trigger pipeline_stages_set_updated_at
before update on public.pipeline_stages
for each row
execute function public.set_updated_at();

alter table public.pipeline_stages enable row level security;

drop policy if exists "Members can read pipeline stages" on public.pipeline_stages;
create policy "Members can read pipeline stages"
on public.pipeline_stages
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can insert pipeline stages" on public.pipeline_stages;
create policy "Members can insert pipeline stages"
on public.pipeline_stages
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can update pipeline stages" on public.pipeline_stages;
create policy "Members can update pipeline stages"
on public.pipeline_stages
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can delete pipeline stages" on public.pipeline_stages;
create policy "Members can delete pipeline stages"
on public.pipeline_stages
for delete
to authenticated
using (public.is_workspace_member(workspace_id));
