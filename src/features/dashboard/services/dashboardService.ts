import { supabase } from '../../../lib/supabase/client'
import type { Lead } from '../../leads/types/lead.types'
import type { PipelineStage } from '../../pipeline/types/pipeline.types'
import type { DashboardMetrics } from '../types/dashboard.types'

type DashboardCampaignRow = {
  id: string
  is_active: boolean
}

type DashboardGeneratedMessageRow = {
  id: string
  status: string
}

function getDashboardErrorMessage(action: string, message: string) {
  return `Could not ${action} dashboard metrics: ${message}`
}

export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const [leadsResult, stagesResult, campaignsResult, messagesResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, pipeline_stage_id')
      .eq('workspace_id', workspaceId)
      .returns<Pick<Lead, 'id' | 'pipeline_stage_id'>[]>(),
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .returns<Pick<PipelineStage, 'id' | 'name' | 'position'>[]>(),
    supabase
      .from('campaigns')
      .select('id, is_active')
      .eq('workspace_id', workspaceId)
      .returns<DashboardCampaignRow[]>(),
    supabase
      .from('generated_messages')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .returns<DashboardGeneratedMessageRow[]>(),
  ])

  if (leadsResult.error) {
    throw new Error(getDashboardErrorMessage('load leads', leadsResult.error.message))
  }

  if (stagesResult.error) {
    throw new Error(getDashboardErrorMessage('load pipeline stages', stagesResult.error.message))
  }

  if (campaignsResult.error) {
    throw new Error(getDashboardErrorMessage('load campaigns', campaignsResult.error.message))
  }

  if (messagesResult.error) {
    throw new Error(getDashboardErrorMessage('load generated messages', messagesResult.error.message))
  }

  const leads = leadsResult.data ?? []
  const stages = stagesResult.data ?? []
  const campaigns = campaignsResult.data ?? []
  const messages = messagesResult.data ?? []
  const activeStageIds = new Set(stages.map((stage) => stage.id))
  const unassignedLeadsCount = leads.filter(
    (lead) => !lead.pipeline_stage_id || !activeStageIds.has(lead.pipeline_stage_id),
  ).length
  const leadsByStage = stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    count: leads.filter((lead) => lead.pipeline_stage_id === stage.id).length,
  }))

  if (unassignedLeadsCount > 0) {
    leadsByStage.push({
      stageId: 'unassigned',
      stageName: 'Sem etapa',
      count: unassignedLeadsCount,
    })
  }

  return {
    totalLeads: leads.length,
    leadsByStage,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((campaign) => campaign.is_active).length,
    totalGeneratedMessages: messages.length,
    sentMessages: messages.filter((message) => message.status === 'sent').length,
  }
}
