import { supabase } from '../../../lib/supabase/client'
import type { PipelineStage, UpdatePipelineStageInput } from '../types/pipeline.types'

export async function getPipelineStagesByWorkspace(workspaceId: string): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('position', { ascending: true })
    .returns<PipelineStage[]>()

  if (error) {
    throw new Error(`Could not load pipeline stages: ${error.message}`)
  }

  return data ?? []
}

export async function updatePipelineStage(
  stageId: string,
  input: UpdatePipelineStageInput,
): Promise<PipelineStage> {
  const updatePayload: UpdatePipelineStageInput = {
    ...input,
  }

  const { data, error } = await supabase
    .from('pipeline_stages')
    .update(updatePayload)
    .eq('id', stageId)
    .select('*')
    .returns<PipelineStage[]>()

  if (error) {
    throw new Error(`Could not update pipeline stage: ${error.message}`)
  }

  const updatedStage = data?.[0]

  if (!updatedStage) {
    throw new Error('Could not update pipeline stage: No stage was returned.')
  }

  return updatedStage
}
