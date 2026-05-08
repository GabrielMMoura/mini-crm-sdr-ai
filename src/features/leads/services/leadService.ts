import { supabase } from '../../../lib/supabase/client'
import type { CreateLeadInput, Lead, UpdateLeadInput } from '../types/lead.types'

function getLeadErrorMessage(action: string, message: string) {
  return `Could not ${action} lead: ${message}`
}

export async function getLeadsByWorkspace(workspaceId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .returns<Lead[]>()

  if (error) {
    throw new Error(getLeadErrorMessage('load workspace', error.message))
  }

  return data ?? []
}

export async function createLead(input: CreateLeadInput, userId: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      job_title: input.job_title,
      source: input.source,
      status: input.status ?? 'new',
      pipeline_stage_id: input.pipeline_stage_id,
      assigned_to: input.assigned_to,
      notes: input.notes,
      custom_fields: input.custom_fields ?? {},
      created_by: userId,
    })
    .select('*')
    .returns<Lead[]>()

  if (error) {
    throw new Error(getLeadErrorMessage('create', error.message))
  }

  const createdLead = data?.[0]

  if (!createdLead) {
    throw new Error(getLeadErrorMessage('create', 'No lead was returned.'))
  }

  return createdLead
}

export async function updateLead(leadId: string, input: UpdateLeadInput): Promise<Lead> {
  const updatePayload: UpdateLeadInput = {
    ...input,
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', leadId)
    .select('*')
    .returns<Lead[]>()

  if (error) {
    throw new Error(getLeadErrorMessage('update', error.message))
  }

  const updatedLead = data?.[0]

  if (!updatedLead) {
    throw new Error(getLeadErrorMessage('update', 'No lead was returned.'))
  }

  return updatedLead
}

export async function deleteLead(leadId: string): Promise<boolean> {
  const { error } = await supabase.from('leads').delete().eq('id', leadId)

  if (error) {
    throw new Error(getLeadErrorMessage('delete', error.message))
  }

  return true
}
