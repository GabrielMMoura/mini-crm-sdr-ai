export type LeadActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'stage_changed'
  | 'message_generated'
  | 'message_copied'
  | 'message_sent'
  | 'message_archived'
  | 'responsible_changed'
  | 'custom_fields_updated'

export type LeadActivity = {
  id: string
  workspace_id: string
  lead_id: string
  user_id: string | null
  type: LeadActivityType
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export type CreateLeadActivityInput = {
  workspace_id: string
  lead_id: string
  type: LeadActivityType
  description: string
  metadata?: Record<string, unknown>
}
