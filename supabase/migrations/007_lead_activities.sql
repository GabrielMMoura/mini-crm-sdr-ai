create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_activities_type_check check (
    type in (
      'lead_created',
      'lead_updated',
      'stage_changed',
      'message_generated',
      'message_copied',
      'message_sent',
      'message_archived',
      'responsible_changed',
      'custom_fields_updated'
    )
  ),
  constraint lead_activities_description_not_empty check (length(trim(description)) > 0)
);

create index if not exists lead_activities_workspace_id_idx
on public.lead_activities(workspace_id);

create index if not exists lead_activities_lead_id_idx
on public.lead_activities(lead_id);

create index if not exists lead_activities_user_id_idx
on public.lead_activities(user_id);

create index if not exists lead_activities_type_idx
on public.lead_activities(type);

create index if not exists lead_activities_created_at_idx
on public.lead_activities(created_at);

create index if not exists lead_activities_workspace_lead_idx
on public.lead_activities(workspace_id, lead_id);

alter table public.lead_activities enable row level security;

drop policy if exists "Workspace members can read lead activities" on public.lead_activities;
create policy "Workspace members can read lead activities"
on public.lead_activities
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can insert lead activities" on public.lead_activities;
create policy "Workspace members can insert lead activities"
on public.lead_activities
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (
    user_id is null
    or user_id = auth.uid()
  )
);
