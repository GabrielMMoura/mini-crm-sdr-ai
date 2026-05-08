import { supabase } from '../../../lib/supabase/client'
import type { CreateLeadActivityInput, LeadActivity } from '../types/leadActivity.types'

function getLeadActivityErrorMessage(action: string, message: string) {
  return `Could not ${action} lead activity: ${message}`
}

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .returns<LeadActivity[]>()

  if (error) {
    throw new Error(getLeadActivityErrorMessage('load', error.message))
  }

  return data ?? []
}

export async function createLeadActivity(
  input: CreateLeadActivityInput,
  userId: string,
): Promise<LeadActivity> {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({
      workspace_id: input.workspace_id,
      lead_id: input.lead_id,
      user_id: userId,
      type: input.type,
      description: input.description,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .returns<LeadActivity[]>()

  if (error) {
    throw new Error(getLeadActivityErrorMessage('create', error.message))
  }

  const createdActivity = data?.[0]

  if (!createdActivity) {
    throw new Error(getLeadActivityErrorMessage('create', 'No activity was returned.'))
  }

  return createdActivity
}
