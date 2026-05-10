create or replace function public.create_default_pipeline_stages(target_workspace_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
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
  values
    (target_workspace_id, 'Base', 'base', 10, 'slate', true, true, '[]'::jsonb),
    (target_workspace_id, 'Lead Mapeado', 'mapped', 20, 'blue', true, true, '[]'::jsonb),
    (target_workspace_id, 'Tentando Contato', 'trying_contact', 30, 'amber', true, true, '[]'::jsonb),
    (target_workspace_id, 'Conexão Iniciada', 'connection_started', 40, 'violet', true, true, '[]'::jsonb),
    (target_workspace_id, 'Desqualificado', 'disqualified', 50, 'red', true, true, '[]'::jsonb),
    (target_workspace_id, 'Qualificado', 'qualified', 60, 'green', true, true, '[]'::jsonb),
    (target_workspace_id, 'Reunião Agendada', 'meeting_scheduled', 70, 'emerald', true, true, '[]'::jsonb)
  on conflict (workspace_id, key) do nothing;
$$;

revoke all on function public.create_default_pipeline_stages(uuid) from public;
revoke all on function public.create_default_pipeline_stages(uuid) from anon;
revoke all on function public.create_default_pipeline_stages(uuid) from authenticated;

create or replace function public.handle_new_workspace_pipeline_stages()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.create_default_pipeline_stages(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_workspace_pipeline_stages() from public;
revoke all on function public.handle_new_workspace_pipeline_stages() from anon;
revoke all on function public.handle_new_workspace_pipeline_stages() from authenticated;

drop trigger if exists on_workspace_created_create_pipeline_stages on public.workspaces;
create trigger on_workspace_created_create_pipeline_stages
after insert on public.workspaces
for each row
execute function public.handle_new_workspace_pipeline_stages();

select public.create_default_pipeline_stages(w.id)
from public.workspaces w
where not exists (
  select 1
  from public.pipeline_stages ps
  where ps.workspace_id = w.id
);

update public.leads l
set pipeline_stage_id = ps.id
from public.pipeline_stages ps
where ps.workspace_id = l.workspace_id
  and ps.key = 'base'
  and l.pipeline_stage_id is null;
