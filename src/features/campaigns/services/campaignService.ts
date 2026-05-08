import { supabase } from '../../../lib/supabase/client'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from '../types/campaign.types'

function getCampaignErrorMessage(action: string, message: string) {
  return `Could not ${action} campaign: ${message}`
}

export async function getCampaignsByWorkspace(workspaceId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .returns<Campaign[]>()

  if (error) {
    throw new Error(getCampaignErrorMessage('load workspace', error.message))
  }

  return data ?? []
}

export async function getActiveCampaignsByWorkspace(workspaceId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<Campaign[]>()

  if (error) {
    throw new Error(getCampaignErrorMessage('load active workspace', error.message))
  }

  return data ?? []
}

export async function createCampaign(input: CreateCampaignInput, userId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      context: input.context,
      generation_prompt: input.generation_prompt,
      trigger_stage_id: input.trigger_stage_id ?? null,
      is_active: input.is_active ?? true,
      created_by: userId,
    })
    .select('*')
    .returns<Campaign[]>()

  if (error) {
    throw new Error(getCampaignErrorMessage('create', error.message))
  }

  const createdCampaign = data?.[0]

  if (!createdCampaign) {
    throw new Error(getCampaignErrorMessage('create', 'No campaign was returned.'))
  }

  return createdCampaign
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<Campaign> {
  const updatePayload: UpdateCampaignInput = {
    ...input,
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(updatePayload)
    .eq('id', campaignId)
    .select('*')
    .returns<Campaign[]>()

  if (error) {
    throw new Error(getCampaignErrorMessage('update', error.message))
  }

  const updatedCampaign = data?.[0]

  if (!updatedCampaign) {
    throw new Error(getCampaignErrorMessage('update', 'No campaign was returned.'))
  }

  return updatedCampaign
}

export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)

  if (error) {
    throw new Error(getCampaignErrorMessage('delete', error.message))
  }

  return true
}
