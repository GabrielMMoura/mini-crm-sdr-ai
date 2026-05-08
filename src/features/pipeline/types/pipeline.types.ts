export type RequiredFieldRule = {
  type: 'standard' | 'custom'
  key: string
  label: string
}

export type PipelineStage = {
  id: string
  workspace_id: string
  name: string
  key: string
  position: number
  color: string | null
  is_default: boolean
  is_active: boolean
  required_fields: RequiredFieldRule[]
  created_at: string
  updated_at: string
}

export type UpdatePipelineStageInput = {
  name?: string
  color?: string | null
  is_active?: boolean
  required_fields?: RequiredFieldRule[]
}
