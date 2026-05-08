import { supabase } from '../../../lib/supabase/client'
import type {
  CreateLeadCustomFieldInput,
  LeadCustomField,
  UpdateLeadCustomFieldInput,
} from '../types/leadCustomField.types'

function getLeadCustomFieldErrorMessage(action: string, message: string) {
  return `Could not ${action} lead custom field: ${message}`
}

export async function getLeadCustomFieldsByWorkspace(
  workspaceId: string,
  options: { includeInactive?: boolean } = {},
): Promise<LeadCustomField[]> {
  let query = supabase
    .from('lead_custom_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })

  if (!options.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.returns<LeadCustomField[]>()

  if (error) {
    throw new Error(getLeadCustomFieldErrorMessage('load workspace', error.message))
  }

  return data ?? []
}

export async function createLeadCustomField(
  input: CreateLeadCustomFieldInput,
): Promise<LeadCustomField> {
  const { data, error } = await supabase
    .from('lead_custom_fields')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      key: input.key,
      type: input.type ?? 'text',
      options: input.options ?? [],
      is_required: input.is_required ?? false,
      is_active: input.is_active ?? true,
      position: input.position ?? 0,
    })
    .select('*')
    .returns<LeadCustomField[]>()

  if (error) {
    throw new Error(getLeadCustomFieldErrorMessage('create', error.message))
  }

  const createdField = data?.[0]

  if (!createdField) {
    throw new Error(getLeadCustomFieldErrorMessage('create', 'No lead custom field was returned.'))
  }

  return createdField
}

export async function updateLeadCustomField(
  fieldId: string,
  input: UpdateLeadCustomFieldInput,
): Promise<LeadCustomField> {
  const updatePayload: UpdateLeadCustomFieldInput = {
    ...input,
  }

  const { data, error } = await supabase
    .from('lead_custom_fields')
    .update(updatePayload)
    .eq('id', fieldId)
    .select('*')
    .returns<LeadCustomField[]>()

  if (error) {
    throw new Error(getLeadCustomFieldErrorMessage('update', error.message))
  }

  const updatedField = data?.[0]

  if (!updatedField) {
    throw new Error(getLeadCustomFieldErrorMessage('update', 'No lead custom field was returned.'))
  }

  return updatedField
}

export async function deleteLeadCustomField(fieldId: string): Promise<boolean> {
  const { error } = await supabase.from('lead_custom_fields').delete().eq('id', fieldId)

  if (error) {
    throw new Error(getLeadCustomFieldErrorMessage('delete', error.message))
  }

  return true
}
