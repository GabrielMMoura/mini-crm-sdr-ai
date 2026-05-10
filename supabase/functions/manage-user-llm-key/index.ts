/* global Deno */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Action = 'get' | 'save' | 'delete' | 'test'

type ManageUserLlmKeyPayload = {
  action?: unknown
  apiKey?: unknown
  model?: unknown
}

type UserLlmSettingsRow = {
  provider: string
  encrypted_api_key: string
  api_key_last4: string
  model: string
  is_configured: boolean
  updated_at: string
}

type UserLlmSettingsMetadata = Omit<UserLlmSettingsRow, 'encrypted_api_key'>

type OpenAIErrorResponse = {
  error?: {
    message?: string
  }
}

const defaultProvider = 'openai'
const defaultModel = 'gpt-4o-mini'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get('Authorization') ?? ''
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)

  return match?.[1] ?? null
}

function parseAction(value: unknown): Action {
  if (value === 'get' || value === 'save' || value === 'delete' || value === 'test') {
    return value
  }

  throw new Error('action must be one of: get, save, delete, test.')
}

function parseModel(value: unknown) {
  if (value === undefined || value === null) {
    return defaultModel
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('model must be a non-empty string.')
  }

  return value.trim()
}

function parseApiKey(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('apiKey is required.')
  }

  const apiKey = value.trim()

  if (!apiKey.startsWith('sk-')) {
    throw new Error('apiKey must start with sk-.')
  }

  return apiKey
}

function sanitizeExternalMessage(message: string) {
  return message.replace(/sk-[^\s.,)]+/g, '[redacted-api-key]')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function deriveEncryptionKey(secret: string) {
  const secretBytes = new TextEncoder().encode(secret)
  const digest = await crypto.subtle.digest('SHA-256', secretBytes)

  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptApiKey(apiKey: string, secret: string) {
  const key = await deriveEncryptionKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(apiKey)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`
}

async function decryptApiKey(encrypted: string, secret: string) {
  const [encodedIv, encodedCiphertext] = encrypted.split(':')

  if (!encodedIv || !encodedCiphertext) {
    throw new Error('Stored API key has an invalid encrypted format.')
  }

  const key = await deriveEncryptionKey(secret)
  const iv = base64ToBytes(encodedIv)
  const ciphertext = base64ToBytes(encodedCiphertext)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)

  return new TextDecoder().decode(plaintext)
}

async function testOpenAIKey(apiKey: string, model: string) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: 'Responda apenas: ok',
    }),
  })

  if (response.ok) {
    return {
      success: true,
      message: 'OpenAI API key validated successfully.',
      model,
    }
  }

  let message = `OpenAI validation failed with HTTP ${response.status}.`

  try {
    const body = (await response.json()) as OpenAIErrorResponse
    if (body.error?.message) {
      message = sanitizeExternalMessage(body.error.message)
    }
  } catch {
    // Keep the generic HTTP status message when OpenAI returns a non-JSON body.
  }

  return {
    success: false,
    message,
    model,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const token = getBearerToken(request)

    if (!token) {
      return jsonResponse({ error: 'Missing Bearer token.' }, 401)
    }

    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY')
    const encryptionSecret = getRequiredEnv('LLM_KEY_ENCRYPTION_SECRET')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid or expired token.' }, 401)
    }

    const payload = (await request.json()) as ManageUserLlmKeyPayload
    const action = parseAction(payload.action)

    if (action === 'get') {
      const { data, error } = await supabase
        .from('user_llm_settings')
        .select('provider, api_key_last4, model, is_configured, updated_at')
        .eq('provider', defaultProvider)
        .maybeSingle<UserLlmSettingsMetadata>()

      if (error) {
        throw new Error(`Could not load LLM key metadata: ${error.message}`)
      }

      return jsonResponse({
        is_configured: data?.is_configured ?? false,
        settings: data ?? null,
      })
    }

    if (action === 'save') {
      const apiKey = parseApiKey(payload.apiKey)
      const model = parseModel(payload.model)
      const encryptedApiKey = await encryptApiKey(apiKey, encryptionSecret)
      const apiKeyLast4 = apiKey.slice(-4)

      const { data, error } = await supabase
        .from('user_llm_settings')
        .upsert(
          {
            user_id: user.id,
            provider: defaultProvider,
            encrypted_api_key: encryptedApiKey,
            api_key_last4: apiKeyLast4,
            model,
            is_configured: true,
          },
          { onConflict: 'user_id,provider' },
        )
        .select('provider, api_key_last4, model, is_configured, updated_at')
        .single<UserLlmSettingsMetadata>()

      if (error) {
        throw new Error(`Could not save LLM key: ${error.message}`)
      }

      return jsonResponse({
        success: true,
        settings: data,
      })
    }

    if (action === 'delete') {
      const { error } = await supabase.from('user_llm_settings').delete().eq('provider', defaultProvider)

      if (error) {
        throw new Error(`Could not delete LLM key: ${error.message}`)
      }

      return jsonResponse({ success: true })
    }

    const model = parseModel(payload.model)
    let apiKey: string
    let modelToTest = model

    if (payload.apiKey !== undefined && payload.apiKey !== null) {
      apiKey = parseApiKey(payload.apiKey)
    } else {
      const { data, error } = await supabase
        .from('user_llm_settings')
        .select('provider, encrypted_api_key, api_key_last4, model, is_configured, updated_at')
        .eq('provider', defaultProvider)
        .maybeSingle<UserLlmSettingsRow>()

      if (error) {
        throw new Error(`Could not load saved LLM key: ${error.message}`)
      }

      if (!data?.is_configured) {
        return jsonResponse({ success: false, message: 'No OpenAI API key is configured.', model: modelToTest }, 404)
      }

      apiKey = await decryptApiKey(data.encrypted_api_key, encryptionSecret)
      modelToTest = data.model
    }

    return jsonResponse(await testOpenAIKey(apiKey, modelToTest))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'

    return jsonResponse({ error: message }, 500)
  }
})
