import { supabase } from '../../../lib/supabase/client'
import type {
  AiSettingsGetResponse,
  DeleteAiSettingsResponse,
  SaveAiSettingsInput,
  SaveAiSettingsResponse,
  TestAiSettingsInput,
  TestAiSettingsResponse,
} from '../types/aiSettings.types'

type EdgeFunctionErrorBody = {
  error?: string
  message?: string
}

function validateApiKey(apiKey: string) {
  const trimmedApiKey = apiKey.trim()

  if (!trimmedApiKey) {
    throw new Error('Informe a OpenAI API key.')
  }

  if (!trimmedApiKey.startsWith('sk-')) {
    throw new Error('A OpenAI API key deve começar com sk-.')
  }

  return trimmedApiKey
}

function validateModel(model: string) {
  const trimmedModel = model.trim()

  if (!trimmedModel) {
    throw new Error('Informe o modelo.')
  }

  return trimmedModel
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getFunctionErrorMessage(error: unknown) {
  if (isRecord(error) && error.context instanceof Response) {
    try {
      const body = (await error.context.clone().json()) as EdgeFunctionErrorBody
      return body.error ?? body.message ?? error.context.statusText
    } catch {
      return error.context.statusText
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Erro desconhecido na Edge Function.'
}

async function invokeManageUserLlmKey<TResponse>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<TResponse>('manage-user-llm-key', {
    body,
  })

  if (error) {
    throw new Error(await getFunctionErrorMessage(error))
  }

  if (!data) {
    throw new Error('A Edge Function não retornou dados.')
  }

  return data
}

export async function getAiSettings(): Promise<AiSettingsGetResponse> {
  return invokeManageUserLlmKey<AiSettingsGetResponse>({
    action: 'get',
  })
}

export async function saveAiSettings(input: SaveAiSettingsInput): Promise<SaveAiSettingsResponse> {
  return invokeManageUserLlmKey<SaveAiSettingsResponse>({
    action: 'save',
    apiKey: validateApiKey(input.apiKey),
    model: validateModel(input.model),
  })
}

export async function testAiSettings(input: TestAiSettingsInput = {}): Promise<TestAiSettingsResponse> {
  const body: Record<string, unknown> = {
    action: 'test',
  }

  if (input.apiKey !== undefined) {
    body.apiKey = validateApiKey(input.apiKey)
  }

  if (input.model !== undefined) {
    body.model = validateModel(input.model)
  }

  return invokeManageUserLlmKey<TestAiSettingsResponse>(body)
}

export async function deleteAiSettings(): Promise<DeleteAiSettingsResponse> {
  return invokeManageUserLlmKey<DeleteAiSettingsResponse>({
    action: 'delete',
  })
}
