export type LeadCustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea'

export type LeadCustomField = {
  id: string
  workspace_id: string
  name: string
  key: string
  type: LeadCustomFieldType
  options: string[]
  is_required: boolean
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
}

export type CreateLeadCustomFieldInput = {
  workspace_id: string
  name: string
  key: string
  type?: LeadCustomFieldType
  options?: string[]
  is_required?: boolean
  is_active?: boolean
  position?: number
}

export type UpdateLeadCustomFieldInput = {
  name?: string
  key?: string
  type?: LeadCustomFieldType
  options?: string[]
  is_required?: boolean
  is_active?: boolean
  position?: number
}
