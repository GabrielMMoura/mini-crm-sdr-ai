export type DashboardLeadStageMetric = {
  stageId: string
  stageName: string
  count: number
}

export type DashboardMetrics = {
  totalLeads: number
  leadsByStage: DashboardLeadStageMetric[]
  totalCampaigns: number
  activeCampaigns: number
  totalGeneratedMessages: number
  sentMessages: number
}
