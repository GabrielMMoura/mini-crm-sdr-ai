import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useCampaigns } from '../features/campaigns/hooks/useCampaigns'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from '../features/campaigns/types/campaign.types'
import { usePipelineStages } from '../features/pipeline/hooks/usePipelineStages'
import type { PipelineStage } from '../features/pipeline/types/pipeline.types'
import { useCurrentWorkspace } from '../features/workspaces/hooks/useCurrentWorkspace'

type CampaignFormState = {
  name: string
  context: string
  generation_prompt: string
  trigger_stage_id: string
  is_active: boolean
}

const emptyCampaignForm: CampaignFormState = {
  name: '',
  context: '',
  generation_prompt: '',
  trigger_stage_id: '',
  is_active: true,
}

function getCampaignFormFromCampaign(campaign: Campaign): CampaignFormState {
  return {
    name: campaign.name,
    context: campaign.context,
    generation_prompt: campaign.generation_prompt,
    trigger_stage_id: campaign.trigger_stage_id ?? '',
    is_active: campaign.is_active,
  }
}

function getStageName(stages: PipelineStage[], stageId: string | null) {
  if (!stageId) {
    return 'Sem etapa gatilho'
  }

  return stages.find((stage) => stage.id === stageId)?.name ?? 'Etapa nao encontrada'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function validateCampaignForm(form: CampaignFormState) {
  if (!form.name.trim()) {
    return 'Informe o nome da campanha.'
  }

  if (!form.context.trim()) {
    return 'Informe o contexto da campanha.'
  }

  if (!form.generation_prompt.trim()) {
    return 'Informe o prompt de geracao.'
  }

  return null
}

type CampaignFormFieldsProps = {
  form: CampaignFormState
  isDisabled?: boolean
  onChange: (form: CampaignFormState) => void
  stages: PipelineStage[]
}

function CampaignFormFields({ form, isDisabled = false, onChange, stages }: CampaignFormFieldsProps) {
  function updateField<FieldName extends keyof CampaignFormState>(
    fieldName: FieldName,
    value: CampaignFormState[FieldName],
  ) {
    onChange({
      ...form,
      [fieldName]: value,
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="campaign-name">
        <span>Nome da campanha</span>
        <Input
          disabled={isDisabled}
          id="campaign-name"
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Campanha SaaS B2B"
          value={form.name}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="campaign-trigger-stage">
        <span>Etapa gatilho</span>
        <Select
          disabled={isDisabled}
          id="campaign-trigger-stage"
          onChange={(event) => updateField('trigger_stage_id', event.target.value)}
          value={form.trigger_stage_id}
        >
          <option value="">Sem etapa gatilho</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2" htmlFor="campaign-context">
        <span>Contexto da campanha/oferta</span>
        <Textarea
          disabled={isDisabled}
          id="campaign-context"
          onChange={(event) => updateField('context', event.target.value)}
          placeholder="Oferta para empresas SaaS que precisam melhorar prospeccao comercial."
          value={form.context}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2" htmlFor="campaign-prompt">
        <span>Prompt de geracao</span>
        <Textarea
          disabled={isDisabled}
          id="campaign-prompt"
          onChange={(event) => updateField('generation_prompt', event.target.value)}
          placeholder="Gere uma mensagem curta, consultiva e personalizada para iniciar uma conversa comercial."
          value={form.generation_prompt}
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700" htmlFor="campaign-active">
        <input
          checked={form.is_active}
          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
          disabled={isDisabled}
          id="campaign-active"
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        <span>Ativa</span>
      </label>
    </div>
  )
}

export function CampaignsPage() {
  const { currentWorkspace, error: workspaceError, isLoading: isWorkspaceLoading } = useCurrentWorkspace()
  const { error: stagesError, isLoading: isStagesLoading, stages } = usePipelineStages(currentWorkspace?.id)
  const {
    campaigns,
    createCampaign,
    deleteCampaign,
    error: campaignsError,
    isLoading: isCampaignsLoading,
    updateCampaign,
  } = useCampaigns(currentWorkspace?.id)
  const [form, setForm] = useState<CampaignFormState>(emptyCampaignForm)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setForm(emptyCampaignForm)
    setEditingCampaignId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFeedbackMessage(null)

    if (!currentWorkspace) {
      setFormError('Workspace atual nao encontrado.')
      return
    }

    const validationError = validateCampaignForm(form)

    if (validationError) {
      setFormError(validationError)
      return
    }

    try {
      setIsSubmitting(true)

      if (editingCampaignId) {
        const input: UpdateCampaignInput = {
          name: form.name.trim(),
          context: form.context.trim(),
          generation_prompt: form.generation_prompt.trim(),
          trigger_stage_id: form.trigger_stage_id || null,
          is_active: form.is_active,
        }

        await updateCampaign(editingCampaignId, input)
        setFeedbackMessage('Campanha atualizada com sucesso.')
      } else {
        const input: CreateCampaignInput = {
          workspace_id: currentWorkspace.id,
          name: form.name.trim(),
          context: form.context.trim(),
          generation_prompt: form.generation_prompt.trim(),
          trigger_stage_id: form.trigger_stage_id || null,
          is_active: form.is_active,
        }

        await createCampaign(input)
        setFeedbackMessage('Campanha criada com sucesso.')
      }

      resetForm()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Nao foi possivel salvar a campanha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditing(campaign: Campaign) {
    setEditingCampaignId(campaign.id)
    setForm(getCampaignFormFromCampaign(campaign))
    setFormError(null)
    setFeedbackMessage(null)
  }

  async function handleToggleActive(campaign: Campaign) {
    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await updateCampaign(campaign.id, { is_active: !campaign.is_active })
      setFeedbackMessage(campaign.is_active ? 'Campanha desativada com sucesso.' : 'Campanha ativada com sucesso.')
    } catch (toggleError) {
      setFormError(toggleError instanceof Error ? toggleError.message : 'Nao foi possivel alterar a campanha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(campaign: Campaign) {
    const shouldDelete = window.confirm(`Excluir a campanha "${campaign.name}"?`)

    if (!shouldDelete) {
      return
    }

    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await deleteCampaign(campaign.id)
      if (editingCampaignId === campaign.id) {
        resetForm()
      }
      setFeedbackMessage('Campanha excluida com sucesso.')
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir a campanha.')
    } finally {
      setIsSubmitting(false)
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
        Nenhum workspace encontrado para gerenciar campanhas.
      </p>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Campanhas</h1>
        <p className="mt-2 text-sm text-slate-600">Workspace atual: {currentWorkspace.name}</p>
      </div>

      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold tracking-normal">
            {editingCampaignId ? 'Editar campanha' : 'Criar campanha'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure o contexto e o prompt que serao usados depois na geracao de mensagens.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <CampaignFormFields
            form={form}
            isDisabled={isSubmitting || isStagesLoading}
            onChange={setForm}
            stages={stages}
          />

          {isStagesLoading ? <p className="text-sm text-slate-600">Carregando etapas do funil...</p> : null}

          {stagesError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {stagesError}
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

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Salvando...'
                : editingCampaignId
                  ? 'Salvar alteracoes'
                  : 'Criar campanha'}
            </Button>
            {editingCampaignId ? (
              <Button
                className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                disabled={isSubmitting}
                onClick={resetForm}
                type="button"
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal">Campanhas cadastradas</h2>
          <p className="mt-1 text-sm text-slate-600">{campaigns.length} campanha(s) no workspace</p>
        </div>

        {campaignsError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {campaignsError}
          </p>
        ) : null}

        {isCampaignsLoading ? <p className="text-sm text-slate-600">Carregando campanhas...</p> : null}

        {!isCampaignsLoading && campaigns.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Nenhuma campanha cadastrada ainda.
          </p>
        ) : null}

        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-base font-semibold text-slate-950">{campaign.name}</p>
                    <span
                      className={
                        campaign.is_active
                          ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700'
                          : 'rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600'
                      }
                    >
                      {campaign.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-700">Contexto: </span>
                      {campaign.context}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">Prompt: </span>
                      {campaign.generation_prompt}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span>Etapa gatilho: {getStageName(stages, campaign.trigger_stage_id)}</span>
                    <span>Criada em: {formatDate(campaign.created_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    className="gap-2 bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                    disabled={isSubmitting}
                    onClick={() => startEditing(campaign)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Button>
                  <Button
                    className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                    disabled={isSubmitting}
                    onClick={() => void handleToggleActive(campaign)}
                  >
                    {campaign.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    className="gap-2 bg-red-600 hover:bg-red-700"
                    disabled={isSubmitting}
                    onClick={() => void handleDelete(campaign)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
