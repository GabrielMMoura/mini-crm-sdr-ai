create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  context text not null,
  generation_prompt text not null,
  trigger_stage_id uuid references public.pipeline_stages(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_name_not_empty check (length(btrim(name)) > 0),
  constraint campaigns_context_not_empty check (length(btrim(context)) > 0),
  constraint campaigns_generation_prompt_not_empty check (length(btrim(generation_prompt)) > 0)
);

create index if not exists campaigns_workspace_id_idx
  on public.campaigns(workspace_id);

create index if not exists campaigns_trigger_stage_id_idx
  on public.campaigns(trigger_stage_id);

create index if not exists campaigns_created_by_idx
  on public.campaigns(created_by);

create index if not exists campaigns_workspace_id_is_active_idx
  on public.campaigns(workspace_id, is_active);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists "Members can read campaigns" on public.campaigns;
create policy "Members can read campaigns"
on public.campaigns
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can insert campaigns" on public.campaigns;
create policy "Members can insert campaigns"
on public.campaigns
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "Members can update campaigns" on public.campaigns;
create policy "Members can update campaigns"
on public.campaigns
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can delete campaigns" on public.campaigns;
create policy "Members can delete campaigns"
on public.campaigns
for delete
to authenticated
using (public.is_workspace_member(workspace_id));
