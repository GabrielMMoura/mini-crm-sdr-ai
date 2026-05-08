export type Campaign = {
  id: string
  workspace_id: string
  name: string
  context: string
  generation_prompt: string
  trigger_stage_id: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CreateCampaignInput = {
  workspace_id: string
  name: string
  context: string
  generation_prompt: string
  trigger_stage_id?: string | null
  is_active?: boolean
}

export type UpdateCampaignInput = {
  name?: string
  context?: string
  generation_prompt?: string
  trigger_stage_id?: string | null
  is_active?: boolean
}
