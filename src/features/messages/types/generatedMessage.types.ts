export type GeneratedMessageStatus = 'generated' | 'copied' | 'sent' | 'archived'

export type GeneratedMessage = {
  id: string
  workspace_id: string
  lead_id: string
  campaign_id: string
  generated_by: string | null
  content: string
  variation_index: number
  status: GeneratedMessageStatus
  model: string | null
  prompt_snapshot: string | null
  lead_snapshot: Record<string, unknown>
  campaign_snapshot: Record<string, unknown>
  sent_at: string | null
  copied_at: string | null
  created_at: string
  updated_at: string
}

export type GenerateLeadMessagesInput = {
  leadId: string
  campaignId: string
  variationCount?: number
}

export type GeneratedLeadMessageResult = {
  id: string
  content: string
  variation_index: number
  status: GeneratedMessageStatus
}

export type GenerateLeadMessagesResponse = {
  messages: GeneratedLeadMessageResult[]
}
