with default_stages(name, key, position, color) as (
  values
    ('Base', 'base', 10, 'slate'),
    ('Lead Mapeado', 'mapped', 20, 'blue'),
    ('Tentando Contato', 'trying_contact', 30, 'amber'),
    ('Conexão Iniciada', 'connection_started', 40, 'violet'),
    ('Desqualificado', 'disqualified', 50, 'red'),
    ('Qualificado', 'qualified', 60, 'green'),
    ('Reunião Agendada', 'meeting_scheduled', 70, 'emerald')
)
update public.pipeline_stages ps
set position = -100000 - default_stages.position
from default_stages
where ps.key = default_stages.key
  and ps.position <> default_stages.position;

with default_stages(name, key, position, color) as (
  values
    ('Base', 'base', 10, 'slate'),
    ('Lead Mapeado', 'mapped', 20, 'blue'),
    ('Tentando Contato', 'trying_contact', 30, 'amber'),
    ('Conexão Iniciada', 'connection_started', 40, 'violet'),
    ('Desqualificado', 'disqualified', 50, 'red'),
    ('Qualificado', 'qualified', 60, 'green'),
    ('Reunião Agendada', 'meeting_scheduled', 70, 'emerald')
)
update public.pipeline_stages ps
set
  name = default_stages.name,
  position = default_stages.position,
  color = default_stages.color,
  is_default = true,
  is_active = true,
  required_fields = '[]'::jsonb
from default_stages
where ps.key = default_stages.key;

select public.create_default_pipeline_stages(w.id)
from public.workspaces w;

update public.leads l
set pipeline_stage_id = ps.id
from public.pipeline_stages ps
where ps.workspace_id = l.workspace_id
  and ps.key = 'base'
  and l.pipeline_stage_id is null;
