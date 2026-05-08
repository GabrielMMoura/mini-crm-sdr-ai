import { useEffect } from 'react'

import { useLeadActivities } from '../hooks/useLeadActivities'
import type { LeadActivityType } from '../types/leadActivity.types'

const activityTypeLabels: Record<LeadActivityType, string> = {
  lead_created: 'Lead criado',
  lead_updated: 'Lead atualizado',
  stage_changed: 'Mudanca de etapa',
  message_generated: 'Mensagem gerada',
  message_copied: 'Mensagem copiada',
  message_sent: 'Mensagem enviada',
  message_archived: 'Mensagem arquivada',
  responsible_changed: 'Responsavel alterado',
  custom_fields_updated: 'Campos personalizados',
}

type LeadActivitiesPanelProps = {
  leadId: string
  refreshKey?: number
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getMetadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata)

  if (entries.length === 0) {
    return null
  }

  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)}`)
    .join(' | ')
}

export function LeadActivitiesPanel({ leadId, refreshKey = 0 }: LeadActivitiesPanelProps) {
  const { activities, error, isLoading, refetch } = useLeadActivities(leadId)

  useEffect(() => {
    if (refreshKey > 0) {
      void refetch()
    }
  }, [refetch, refreshKey])

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-950">Historico de atividades</h3>
        <p className="mt-1 text-sm text-slate-600">Eventos importantes registrados para este lead.</p>
      </div>

      {isLoading ? <p className="text-sm text-slate-600">Carregando historico...</p> : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {!isLoading && activities.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          Nenhuma atividade registrada ainda.
        </p>
      ) : null}

      <div className="space-y-3">
        {activities.map((activity) => {
          const metadataSummary = getMetadataSummary(activity.metadata)

          return (
            <div key={activity.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{activity.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{activityTypeLabels[activity.type]}</p>
                </div>
                <p className="text-xs text-slate-500">{formatActivityDate(activity.created_at)}</p>
              </div>
              {metadataSummary ? (
                <p className="mt-2 break-words text-xs text-slate-600">{metadataSummary}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
