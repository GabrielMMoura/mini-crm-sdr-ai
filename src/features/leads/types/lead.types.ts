export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export type Lead = {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  source: string | null
  status: LeadStatus
  pipeline_stage_id: string | null
  assigned_to: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CreateLeadInput = {
  workspace_id: string
  name: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  source?: string
  status?: LeadStatus
  pipeline_stage_id?: string | null
  assigned_to?: string | null
  notes?: string
  custom_fields?: Record<string, unknown>
}

export type UpdateLeadInput = {
  name?: string
  email?: string | null
  phone?: string | null
  company?: string | null
  job_title?: string | null
  source?: string | null
  status?: LeadStatus
  pipeline_stage_id?: string | null
  assigned_to?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown>
}
