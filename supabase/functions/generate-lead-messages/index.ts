/* global Deno */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Lead = {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  source: string | null
  pipeline_stage_id: string | null
  assigned_to: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
}

type Campaign = {
  id: string
  workspace_id: string
  name: string
  context: string
  generation_prompt: string
  trigger_stage_id: string | null
  is_active: boolean
}

type GeneratedMessage = {
  id: string
  workspace_id: string
  lead_id: string
  campaign_id: string
  generated_by: string | null
  content: string
  variation_index: number
  status: string
  model: string | null
  prompt_snapshot: string | null
  lead_snapshot: Record<string, unknown>
  campaign_snapshot: Record<string, unknown>
  sent_at: string | null
  copied_at: string | null
  created_at: string
  updated_at: string
}

type GenerateMessagesPayload = {
  leadId?: unknown
  campaignId?: unknown
  variationCount?: unknown
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
    }>
  }>
}

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

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function getVariationCount(value: unknown) {
  if (value === undefined || value === null) {
    return 3
  }

  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1 || value > 3) {
    throw new Error('variationCount must be between 1 and 3.')
  }

  return value
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

function buildLeadSnapshot(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    job_title: lead.job_title,
    source: lead.source,
    pipeline_stage_id: lead.pipeline_stage_id,
    assigned_to: lead.assigned_to,
    notes: lead.notes,
    custom_fields: lead.custom_fields,
  }
}

function buildCampaignSnapshot(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    context: campaign.context,
    generation_prompt: campaign.generation_prompt,
    trigger_stage_id: campaign.trigger_stage_id,
    is_active: campaign.is_active,
  }
}

function buildPrompt(lead: Lead, campaign: Campaign, variationCount: number) {
  const leadSummary = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    job_title: lead.job_title,
    source: lead.source,
    notes: lead.notes,
    custom_fields: lead.custom_fields,
  }

  return [
    'Sistema: Voce e um SDR experiente criando mensagens personalizadas de prospeccao.',
    'Gere mensagens naturais, curtas, consultivas e sem parecer spam.',
    '',
    `Gere exatamente ${variationCount} mensagem(ns) em portugues do Brasil.`,
    'Nao invente dados ausentes.',
    'Se algum dado estiver ausente, escreva de forma natural sem mencionar que o dado esta faltando.',
    'Nao inclua markdown.',
    'Nao inclua explicacoes fora do JSON.',
    'Retorne JSON valido no formato: {"messages":["mensagem 1"]}.',
    '',
    'Dados da campanha:',
    JSON.stringify(
      {
        name: campaign.name,
        context: campaign.context,
        generation_prompt: campaign.generation_prompt,
      },
      null,
      2,
    ),
    '',
    'Dados do lead:',
    JSON.stringify(leadSummary, null, 2),
  ].join('\n')
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join('\n') ?? ''
  )
}

function parseMessagesJson(outputText: string): { messages?: unknown } {
  try {
    return JSON.parse(outputText) as { messages?: unknown }
  } catch {
    const jsonMatch = outputText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return {}
    }

    try {
      return JSON.parse(jsonMatch[0]) as { messages?: unknown }
    } catch {
      return {}
    }
  }
}

function extractMessagesFromText(outputText: string) {
  return outputText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.\s"']+/, '').replace(/["']$/, '').trim())
    .filter((line) => line.length > 0)
}

function parseGeneratedMessages(response: OpenAIResponse) {
  const outputText = extractOutputText(response)
  const parsed = parseMessagesJson(outputText)

  if (!Array.isArray(parsed.messages)) {
    const extractedMessages = extractMessagesFromText(outputText)

    if (extractedMessages.length > 0) {
      return extractedMessages
    }

    throw new Error('OpenAI response did not include a messages array.')
  }

  const messages = parsed.messages
    .filter((message): message is string => typeof message === 'string')
    .map((message) => message.trim())
    .filter(Boolean)

  if (messages.length === 0) {
    throw new Error('OpenAI response did not include valid message content.')
  }

  return messages
}

async function generateWithOpenAI(prompt: string, variationCount: number) {
  const openAiApiKey = getRequiredEnv('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 30000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model,
        instructions:
          'Voce e um SDR experiente criando mensagens personalizadas de prospeccao. Retorne somente JSON valido.',
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'generated_lead_messages',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                messages: {
                  type: 'array',
                  minItems: variationCount,
                  maxItems: variationCount,
                  items: {
                    type: 'string',
                  },
                },
              },
              required: ['messages'],
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI request failed: ${response.status} ${errorBody}`)
    }

    const responseBody = (await response.json()) as OpenAIResponse

    return {
      model,
      messages: parseGeneratedMessages(responseBody).slice(0, variationCount),
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('OpenAI request timed out.', { cause: error })
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
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

    const payload = (await request.json()) as GenerateMessagesPayload

    if (!isUuid(payload.leadId)) {
      return jsonResponse({ error: 'leadId must be a valid UUID.' }, 400)
    }

    if (!isUuid(payload.campaignId)) {
      return jsonResponse({ error: 'campaignId must be a valid UUID.' }, 400)
    }

    const variationCount = getVariationCount(payload.variationCount)
    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY')
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

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, workspace_id, name, email, phone, company, job_title, source, notes, custom_fields, pipeline_stage_id, assigned_to')
      .eq('id', payload.leadId)
      .single<Lead>()

    if (leadError || !lead) {
      return jsonResponse({ error: 'Lead not found or not accessible.' }, 404)
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, workspace_id, name, context, generation_prompt, trigger_stage_id, is_active')
      .eq('id', payload.campaignId)
      .single<Campaign>()

    if (campaignError || !campaign) {
      return jsonResponse({ error: 'Campaign not found or not accessible.' }, 404)
    }

    if (!campaign.is_active) {
      return jsonResponse({ error: 'Campaign must be active to generate messages.' }, 400)
    }

    if (lead.workspace_id !== campaign.workspace_id) {
      return jsonResponse({ error: 'Lead and campaign must belong to the same workspace.' }, 400)
    }

    const { data: isMember, error: membershipError } = await supabase.rpc('is_workspace_member', {
      target_workspace_id: lead.workspace_id,
    })

    if (membershipError || isMember !== true) {
      return jsonResponse({ error: 'User is not a member of this workspace.' }, 403)
    }

    const prompt = buildPrompt(lead, campaign, variationCount)
    const leadSnapshot = buildLeadSnapshot(lead)
    const campaignSnapshot = buildCampaignSnapshot(campaign)
    const { model, messages } = await generateWithOpenAI(prompt, variationCount)

    if (messages.length !== variationCount) {
      throw new Error('OpenAI response did not return the requested number of messages.')
    }

    const rowsToInsert = messages.map((content, index) => ({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      campaign_id: campaign.id,
      generated_by: user.id,
      content,
      variation_index: index + 1,
      status: 'generated',
      model,
      prompt_snapshot: prompt,
      lead_snapshot: leadSnapshot,
      campaign_snapshot: campaignSnapshot,
    }))

    const { data: generatedMessages, error: insertError } = await supabase
      .from('generated_messages')
      .insert(rowsToInsert)
      .select('id, content, variation_index, status')
      .returns<Pick<GeneratedMessage, 'id' | 'content' | 'variation_index' | 'status'>[]>()

    if (insertError) {
      throw new Error(`Could not save generated messages. RLS or insert error: ${insertError.message}`)
    }

    return jsonResponse({
      messages: generatedMessages ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'

    return jsonResponse({ error: message }, 500)
  }
})
