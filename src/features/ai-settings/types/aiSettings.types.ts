export type AiProvider = 'openai'

export type AiSettingsMetadata = {
  provider: AiProvider
  api_key_last4: string
  model: string
  is_configured: boolean
  updated_at?: string | null
}

export type AiSettingsGetResponse = {
  is_configured: boolean
  settings: AiSettingsMetadata | null
}

export type SaveAiSettingsInput = {
  apiKey: string
  model: string
}

export type SaveAiSettingsResponse = {
  success: boolean
  settings: AiSettingsMetadata
}

export type TestAiSettingsInput = {
  apiKey?: string
  model?: string
}

export type TestAiSettingsResponse = {
  success: boolean
  message: string
  model: string
}

export type DeleteAiSettingsResponse = {
  success: boolean
}
