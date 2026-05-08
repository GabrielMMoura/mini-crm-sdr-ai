import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashboardMetrics'
import { useCurrentWorkspace } from '../features/workspaces/hooks/useCurrentWorkspace'

type MetricCardProps = {
  label: string
  value: number
  helper: string
}

const quickLinks = [
  { label: 'Ver leads', to: '/leads' },
  { label: 'Ver campanhas', to: '/campaigns' },
  { label: 'Configurar campos', to: '/settings/lead-fields' },
  { label: 'Regras do funil', to: '/settings/pipeline-rules' },
]

function MetricCard({ helper, label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </div>
  )
}

function getPercentage(count: number, total: number) {
  if (total === 0) {
    return 0
  }

  return Math.round((count / total) * 100)
}

export function DashboardPage() {
  const { signOut, user } = useAuth()
  const { currentWorkspace, error, isLoading } = useCurrentWorkspace()
  const {
    error: metricsError,
    isLoading: isMetricsLoading,
    metrics,
  } = useDashboardMetrics(currentWorkspace?.id)
  const userLabel = user?.user_metadata.full_name || user?.email || 'Usuario autenticado'
  const shouldShowMetrics = Boolean(currentWorkspace) && !metricsError

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Acompanhe a operacao comercial do workspace atual.
          </p>
        </div>

        <Button className="gap-2 bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100" onClick={signOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Usuario</p>
          <p className="mt-2 break-words text-base font-semibold text-slate-950">{userLabel}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Workspace atual</p>
          {isLoading ? (
            <p className="mt-2 text-sm text-slate-600">Carregando workspace...</p>
          ) : error ? (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          ) : (
            <p className="mt-2 break-words text-base font-semibold text-slate-950">
              {currentWorkspace?.name ?? 'Nenhum workspace encontrado.'}
            </p>
          )}
        </div>
      </div>

      {metricsError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {metricsError}
        </p>
      ) : null}

      {isMetricsLoading ? <p className="text-sm text-slate-600">Carregando metricas...</p> : null}

      {shouldShowMetrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper="Leads cadastrados no workspace"
              label="Total de leads"
              value={metrics?.totalLeads ?? 0}
            />
            <MetricCard
              helper={`${metrics?.totalCampaigns ?? 0} campanha(s) no total`}
              label="Campanhas ativas"
              value={metrics?.activeCampaigns ?? 0}
            />
            <MetricCard
              helper="Sugestoes criadas pela IA"
              label="Mensagens geradas"
              value={metrics?.totalGeneratedMessages ?? 0}
            />
            <MetricCard
              helper="Mensagens com envio simulado"
              label="Mensagens enviadas"
              value={metrics?.sentMessages ?? 0}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-normal">Leads por etapa</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Distribuicao dos leads no funil do workspace.
                </p>
              </div>
              <p className="text-sm font-medium text-slate-500">{metrics?.totalLeads ?? 0} lead(s)</p>
            </div>

            {!isMetricsLoading && (metrics?.totalLeads ?? 0) === 0 ? (
              <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
                Nenhum lead cadastrado neste workspace.
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              {(metrics?.leadsByStage ?? []).map((stage) => {
                const percentage = getPercentage(stage.count, metrics?.totalLeads ?? 0)

                return (
                  <div key={stage.stageId} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{stage.stageName}</span>
                      <span className="text-slate-500">
                        {stage.count} lead(s) - {percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-950 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">Acessos rapidos</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-slate-950 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
