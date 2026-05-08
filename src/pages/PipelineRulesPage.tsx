import { useMemo, useState } from 'react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useLeadCustomFields } from '../features/leads/hooks/useLeadCustomFields'
import { usePipelineStages } from '../features/pipeline/hooks/usePipelineStages'
import type { PipelineStage, RequiredFieldRule } from '../features/pipeline/types/pipeline.types'
import { standardLeadRequiredFieldOptions } from '../features/pipeline/utils/requiredFields'
import { useCurrentWorkspace } from '../features/workspaces/hooks/useCurrentWorkspace'

function getRuleKey(rule: RequiredFieldRule) {
  return `${rule.type}:${rule.key}`
}

function toggleRule(currentRules: RequiredFieldRule[], nextRule: RequiredFieldRule) {
  const nextRuleKey = getRuleKey(nextRule)
  const hasRule = currentRules.some((rule) => getRuleKey(rule) === nextRuleKey)

  if (hasRule) {
    return currentRules.filter((rule) => getRuleKey(rule) !== nextRuleKey)
  }

  return [...currentRules, nextRule]
}

type StageRulesCardProps = {
  availableRules: RequiredFieldRule[]
  isSubmitting: boolean
  onSave: (stage: PipelineStage, requiredFields: RequiredFieldRule[]) => Promise<void>
  stage: PipelineStage
}

function StageRulesCard({ availableRules, isSubmitting, onSave, stage }: StageRulesCardProps) {
  const [selectedRules, setSelectedRules] = useState<RequiredFieldRule[]>(stage.required_fields)

  const selectedRuleKeys = useMemo(() => new Set(selectedRules.map(getRuleKey)), [selectedRules])

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{stage.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {selectedRules.length > 0
              ? `Obrigatorios: ${selectedRules.map((rule) => rule.label).join(', ')}`
              : 'Nenhum campo obrigatorio configurado.'}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
          {stage.key}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {availableRules.map((rule) => {
          const ruleKey = getRuleKey(rule)

          return (
            <label
              key={ruleKey}
              className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              htmlFor={`${stage.id}-${ruleKey}`}
            >
              <input
                checked={selectedRuleKeys.has(ruleKey)}
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                disabled={isSubmitting}
                id={`${stage.id}-${ruleKey}`}
                onChange={() => setSelectedRules((currentRules) => toggleRule(currentRules, rule))}
                type="checkbox"
              />
              <span>{rule.label}</span>
            </label>
          )
        })}
      </div>

      <Button disabled={isSubmitting} onClick={() => void onSave(stage, selectedRules)}>
        {isSubmitting ? 'Salvando...' : 'Salvar regras'}
      </Button>
    </div>
  )
}

export function PipelineRulesPage() {
  const { currentWorkspace, error: workspaceError, isLoading: isWorkspaceLoading } = useCurrentWorkspace()
  const {
    error: stagesError,
    isLoading: isStagesLoading,
    stages,
    updateStage,
  } = usePipelineStages(currentWorkspace?.id)
  const {
    error: customFieldsError,
    fields: customFields,
    isLoading: isCustomFieldsLoading,
  } = useLeadCustomFields(currentWorkspace?.id)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submittingStageId, setSubmittingStageId] = useState<string | null>(null)

  const availableRules = useMemo<RequiredFieldRule[]>(
    () => [
      ...standardLeadRequiredFieldOptions,
      ...customFields
        .filter((field) => field.is_active)
        .map((field) => ({
          type: 'custom' as const,
          key: field.key,
          label: field.name,
        })),
    ],
    [customFields],
  )

  async function handleSaveRules(stage: PipelineStage, requiredFields: RequiredFieldRule[]) {
    setFormError(null)
    setFeedbackMessage(null)

    try {
      setSubmittingStageId(stage.id)
      await updateStage(stage.id, { required_fields: requiredFields })
      setFeedbackMessage(`Regras da etapa ${stage.name} salvas com sucesso.`)
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar as regras.')
    } finally {
      setSubmittingStageId(null)
    }
  }

  if (isWorkspaceLoading) {
    return <p className="text-sm text-slate-600">Carregando workspace...</p>
  }

  if (workspaceError) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{workspaceError}</p>
  }

  if (!currentWorkspace) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Nenhum workspace encontrado para configurar regras.
      </p>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Regras do Funil</h1>
        <p className="mt-2 text-sm text-slate-600">Workspace atual: {currentWorkspace.name}</p>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal">Campos obrigatorios por etapa</h2>
          <p className="mt-1 text-sm text-slate-600">
            Selecione os dados que precisam estar preenchidos antes de mover um lead para cada etapa.
          </p>
        </div>

        {stagesError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{stagesError}</p>
        ) : null}

        {customFieldsError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {customFieldsError}
          </p>
        ) : null}

        {formError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        {feedbackMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {feedbackMessage}
          </p>
        ) : null}

        {isStagesLoading || isCustomFieldsLoading ? (
          <p className="text-sm text-slate-600">Carregando regras do funil...</p>
        ) : null}

        {!isStagesLoading && stages.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Nenhuma etapa de funil encontrada.
          </p>
        ) : null}

        <div className="space-y-4">
          {stages.map((stage) => (
            <StageRulesCard
              key={stage.id}
              availableRules={availableRules}
              isSubmitting={submittingStageId === stage.id}
              onSave={handleSaveRules}
              stage={stage}
            />
          ))}
        </div>
      </Card>
    </section>
  )
}
