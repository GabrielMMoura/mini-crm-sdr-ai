import { supabase } from '../../../lib/supabase/client'
import type {
  GeneratedMessage,
  GenerateLeadMessagesInput,
  GenerateLeadMessagesResponse,
} from '../types/generatedMessage.types'

function getGeneratedMessageErrorMessage(action: string, message: string) {
  return `Could not ${action} generated message: ${message}`
}

function getFunctionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown Edge Function error.'
}

export async function getMessagesByLead(leadId: string): Promise<GeneratedMessage[]> {
  const { data, error } = await supabase
    .from('generated_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .order('variation_index', { ascending: true })
    .returns<GeneratedMessage[]>()

  if (error) {
    throw new Error(getGeneratedMessageErrorMessage('load lead messages', error.message))
  }

  return data ?? []
}

export async function generateLeadMessages(
  input: GenerateLeadMessagesInput,
): Promise<GenerateLeadMessagesResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateLeadMessagesResponse>(
    'generate-lead-messages',
    {
      body: {
        leadId: input.leadId,
        campaignId: input.campaignId,
        variationCount: input.variationCount,
      },
    },
  )

  if (error) {
    throw new Error(getGeneratedMessageErrorMessage('generate', getFunctionErrorMessage(error)))
  }

  if (!data?.messages) {
    throw new Error(getGeneratedMessageErrorMessage('generate', 'No messages were returned.'))
  }

  return data
}

export async function markMessageAsCopied(messageId: string): Promise<GeneratedMessage> {
  const { data, error } = await supabase
    .from('generated_messages')
    .update({
      status: 'copied',
      copied_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select('*')
    .returns<GeneratedMessage[]>()

  if (error) {
    throw new Error(getGeneratedMessageErrorMessage('mark as copied', error.message))
  }

  const updatedMessage = data?.[0]

  if (!updatedMessage) {
    throw new Error(getGeneratedMessageErrorMessage('mark as copied', 'No message was returned.'))
  }

  return updatedMessage
}

export async function markMessageAsSent(messageId: string): Promise<GeneratedMessage> {
  const { data, error } = await supabase
    .from('generated_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select('*')
    .returns<GeneratedMessage[]>()

  if (error) {
    throw new Error(getGeneratedMessageErrorMessage('mark as sent', error.message))
  }

  const updatedMessage = data?.[0]

  if (!updatedMessage) {
    throw new Error(getGeneratedMessageErrorMessage('mark as sent', 'No message was returned.'))
  }

  return updatedMessage
}

export async function archiveMessage(messageId: string): Promise<GeneratedMessage> {
  const { data, error } = await supabase
    .from('generated_messages')
    .update({
      status: 'archived',
    })
    .eq('id', messageId)
    .select('*')
    .returns<GeneratedMessage[]>()

  if (error) {
    throw new Error(getGeneratedMessageErrorMessage('archive', error.message))
  }

  const updatedMessage = data?.[0]

  if (!updatedMessage) {
    throw new Error(getGeneratedMessageErrorMessage('archive', 'No message was returned.'))
  }

  return updatedMessage
}
