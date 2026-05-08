create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  job_title text,
  source text,
  status text not null default 'new',
  notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'))
);

create index if not exists leads_workspace_id_idx
  on public.leads(workspace_id);

create index if not exists leads_status_idx
  on public.leads(status);

create index if not exists leads_created_by_idx
  on public.leads(created_by);

create index if not exists leads_created_at_idx
  on public.leads(created_at);

create index if not exists leads_workspace_id_status_idx
  on public.leads(workspace_id, status);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Members can read workspace leads" on public.leads;
create policy "Members can read workspace leads"
on public.leads
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Members can insert workspace leads" on public.leads;
create policy "Members can insert workspace leads"
on public.leads
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "Members can update workspace leads" on public.leads;
create policy "Members can update workspace leads"
on public.leads
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Members can delete workspace leads" on public.leads;
create policy "Members can delete workspace leads"
on public.leads
for delete
to authenticated
using (public.is_workspace_member(workspace_id));
