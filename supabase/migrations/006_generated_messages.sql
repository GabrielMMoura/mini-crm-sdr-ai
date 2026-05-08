create table if not exists public.generated_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  generated_by uuid references auth.users(id) on delete set null,
  content text not null,
  variation_index integer not null default 1,
  status text not null default 'generated',
  model text,
  prompt_snapshot text,
  lead_snapshot jsonb not null default '{}'::jsonb,
  campaign_snapshot jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  copied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_messages_status_check check (
    status in ('generated', 'copied', 'sent', 'archived')
  ),
  constraint generated_messages_content_not_empty check (length(btrim(content)) > 0),
  constraint generated_messages_variation_index_check check (variation_index >= 1)
);

create index if not exists generated_messages_workspace_id_idx
  on public.generated_messages(workspace_id);

create index if not exists generated_messages_lead_id_idx
  on public.generated_messages(lead_id);

create index if not exists generated_messages_campaign_id_idx
  on public.generated_messages(campaign_id);

create index if not exists generated_messages_generated_by_idx
  on public.generated_messages(generated_by);

create index if not exists generated_messages_status_idx
  on public.generated_messages(status);

create index if not exists generated_messages_created_at_idx
  on public.generated_messages(created_at);

create index if not exists generated_messages_workspace_lead_idx
  on public.generated_messages(workspace_id, lead_id);

create index if not exists generated_messages_workspace_campaign_idx
  on public.generated_messages(workspace_id, campaign_id);

drop trigger if exists generated_messages_set_updated_at on public.generated_messages;
create trigger generated_messages_set_updated_at
before update on public.generated_messages
for each row
execute function public.set_updated_at();

alter table public.generated_messages enable row level security;

drop policy if exists "Members can read generated messages" on public.generated_messages;
create policy "Members can read generated messages"
on public.generated_messages
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can insert generated messages" on public.generated_messages;
create policy "Members can insert generated messages"
on public.generated_messages
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and generated_by = auth.uid()
);

drop policy if exists "Members can update generated messages" on public.generated_messages;
create policy "Members can update generated messages"
on public.generated_messages
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can delete generated messages" on public.generated_messages;
create policy "Members can delete generated messages"
on public.generated_messages
for delete
to authenticated
using (public.is_workspace_member(workspace_id));
