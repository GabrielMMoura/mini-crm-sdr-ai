import { useMemo, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useCampaigns } from '../features/campaigns/hooks/useCampaigns'
import { LeadActivitiesPanel } from '../features/leads/components/LeadActivitiesPanel'
import { useLeadCustomFields } from '../features/leads/hooks/useLeadCustomFields'
import { createLeadActivity } from '../features/leads/services/leadActivityService'
import type { LeadActivityType } from '../features/leads/types/leadActivity.types'
import type { LeadCustomField } from '../features/leads/types/leadCustomField.types'
import { useLeads } from '../features/leads/hooks/useLeads'
import type { CreateLeadInput, Lead, LeadStatus, UpdateLeadInput } from '../features/leads/types/lead.types'
import { LeadMessagesPanel } from '../features/messages/components/LeadMessagesPanel'
import { generateLeadMessages } from '../features/messages/services/generatedMessageService'
import { usePipelineStages } from '../features/pipeline/hooks/usePipelineStages'
import type { PipelineStage } from '../features/pipeline/types/pipeline.types'
import { validateLeadStageTransition } from '../features/pipeline/utils/requiredFields'
import { useCurrentWorkspace } from '../features/workspaces/hooks/useCurrentWorkspace'
import { useWorkspaceMembers } from '../features/workspaces/hooks/useWorkspaceMembers'
import type { WorkspaceMemberWithProfile } from '../features/workspaces/types/workspaceMember.types'

const leadStatusOptions: Array<{ label: string; value: LeadStatus }> = [
  { label: 'Novo', value: 'new' },
  { label: 'Contatado', value: 'contacted' },
  { label: 'Qualificado', value: 'qualified' },
  { label: 'Proposta', value: 'proposal' },
  { label: 'Ganho', value: 'won' },
  { label: 'Perdido', value: 'lost' },
]

type LeadStatusFilter = LeadStatus | 'all'
type PipelineStageFilter = string | 'all'
type LeadsViewMode = 'list' | 'kanban'

type LeadFormState = {
  name: string
  email: string
  phone: string
  company: string
  job_title: string
  source: string
  status: LeadStatus
  pipeline_stage_id: string
  assigned_to: string
  notes: string
  custom_fields: Record<string, unknown>
}

type TriggerGenerationResult = {
  failedCount: number
  processedCount: number
  successCount: number
}

const emptyLeadForm: LeadFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  job_title: '',
  source: '',
  status: 'new',
  pipeline_stage_id: '',
  assigned_to: '',
  notes: '',
  custom_fields: {},
}

function getLeadFormFromLead(lead: Lead, fallbackStageId = ''): LeadFormState {
  return {
    name: lead.name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    company: lead.company ?? '',
    job_title: lead.job_title ?? '',
    source: lead.source ?? '',
    status: lead.status,
    pipeline_stage_id: lead.pipeline_stage_id ?? fallbackStageId,
    assigned_to: lead.assigned_to ?? '',
    notes: lead.notes ?? '',
    custom_fields: lead.custom_fields,
  }
}

function optionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : undefined
}

function nullableText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue ? trimmedValue : null
}

function getStatusLabel(status: LeadStatus) {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status
}

function getStageName(stages: PipelineStage[], stageId: string | null) {
  if (!stageId) {
    return 'Sem etapa'
  }

  return stages.find((stage) => stage.id === stageId)?.name ?? 'Etapa nao encontrada'
}

function getMemberLabel(member: WorkspaceMemberWithProfile) {
  return member.profile.full_name ?? member.profile.email ?? member.user_id
}

function getAssigneeLabel(members: WorkspaceMemberWithProfile[], assignedTo: string | null) {
  if (!assignedTo) {
    return 'Sem responsavel'
  }

  const member = members.find((workspaceMember) => workspaceMember.user_id === assignedTo)

  return member ? getMemberLabel(member) : 'Responsavel nao encontrado'
}

function leadMatchesSearch(lead: Lead, searchTerm: string) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()

  if (!normalizedSearchTerm) {
    return true
  }

  return [lead.name, lead.email, lead.phone, lead.company, lead.job_title, lead.source]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedSearchTerm))
}

function getLeadsByStage(leads: Lead[], stageId: string) {
  return leads.filter((lead) => lead.pipeline_stage_id === stageId)
}

function getStageTransitionError(lead: Lead, targetStage: PipelineStage) {
  return validateLeadStageTransition(lead, targetStage)
}

function getTriggerGenerationFeedback(result: TriggerGenerationResult) {
  if (result.processedCount === 0) {
    return 'Lead movido. Nenhuma campanha gatilho ativa encontrada.'
  }

  if (result.failedCount > 0) {
    return 'Lead movido. Algumas mensagens automaticas falharam.'
  }

  const campaignLabel = result.successCount === 1 ? 'campanha' : 'campanhas'

  return `Lead movido e mensagens geradas para ${result.successCount} ${campaignLabel}.`
}

function getCustomFieldValue(customFields: Record<string, unknown>, field: LeadCustomField) {
  const value = customFields[field.key]

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return ''
}

function isCustomFieldEmpty(customFields: Record<string, unknown>, field: LeadCustomField) {
  const value = customFields[field.key]

  if (field.type === 'boolean' || typeof value === 'number') {
    return false
  }

  return typeof value !== 'string' || value.trim().length === 0
}

function validateRequiredCustomFields(customFields: Record<string, unknown>, fields: LeadCustomField[]) {
  const missingField = fields.find((field) => field.is_required && isCustomFieldEmpty(customFields, field))

  return missingField ? `Preencha o campo personalizado obrigatorio: ${missingField.name}.` : null
}

type LeadFormFieldsProps = {
  customFields: LeadCustomField[]
  form: LeadFormState
  idPrefix: string
  isDisabled?: boolean
  members: WorkspaceMemberWithProfile[]
  onChange: (form: LeadFormState) => void
  stages: PipelineStage[]
}

function LeadFormFields({
  customFields,
  form,
  idPrefix,
  isDisabled = false,
  members,
  onChange,
  stages,
}: LeadFormFieldsProps) {
  function updateField<FieldName extends keyof LeadFormState>(fieldName: FieldName, value: LeadFormState[FieldName]) {
    onChange({
      ...form,
      [fieldName]: value,
    })
  }

  function updateCustomField(field: LeadCustomField, value: unknown) {
    onChange({
      ...form,
      custom_fields: {
        ...form.custom_fields,
        [field.key]: value,
      },
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-name`}>
        <span>Nome</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-name`}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Nome do lead"
          value={form.name}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-email`}>
        <span>Email</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-email`}
          inputMode="email"
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="lead@empresa.com"
          type="email"
          value={form.email}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-phone`}>
        <span>Telefone</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-phone`}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="(00) 00000-0000"
          value={form.phone}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-company`}>
        <span>Empresa</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-company`}
          onChange={(event) => updateField('company', event.target.value)}
          placeholder="Empresa"
          value={form.company}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-job-title`}>
        <span>Cargo</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-job-title`}
          onChange={(event) => updateField('job_title', event.target.value)}
          placeholder="Cargo"
          value={form.job_title}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-source`}>
        <span>Origem</span>
        <Input
          disabled={isDisabled}
          id={`${idPrefix}-source`}
          onChange={(event) => updateField('source', event.target.value)}
          placeholder="LinkedIn, indicação, site..."
          value={form.source}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-status`}>
        <span>Status</span>
        <Select
          disabled={isDisabled}
          id={`${idPrefix}-status`}
          onChange={(event) => updateField('status', event.target.value as LeadStatus)}
          value={form.status}
        >
          {leadStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-pipeline-stage`}>
        <span>Etapa do funil</span>
        <Select
          disabled={isDisabled || stages.length === 0}
          id={`${idPrefix}-pipeline-stage`}
          onChange={(event) => updateField('pipeline_stage_id', event.target.value)}
          value={form.pipeline_stage_id}
        >
          <option value="">Base padrao</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-assigned-to`}>
        <span>Responsavel</span>
        <Select
          disabled={isDisabled}
          id={`${idPrefix}-assigned-to`}
          onChange={(event) => updateField('assigned_to', event.target.value)}
          value={form.assigned_to}
        >
          <option value="">Sem responsavel</option>
          {members.map((member) => (
            <option key={member.id} value={member.user_id}>
              {getMemberLabel(member)}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2" htmlFor={`${idPrefix}-notes`}>
        <span>Observações</span>
        <Textarea
          disabled={isDisabled}
          id={`${idPrefix}-notes`}
          onChange={(event) => updateField('notes', event.target.value)}
          placeholder="Contexto comercial, dores ou próximos passos"
          value={form.notes}
        />
      </label>

      {customFields.map((field) => {
        const fieldId = `${idPrefix}-custom-${field.key}`
        const label = `${field.name}${field.is_required ? ' *' : ''}`
        const value = getCustomFieldValue(form.custom_fields, field)

        if (field.type === 'textarea') {
          return (
            <label
              key={field.id}
              className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"
              htmlFor={fieldId}
            >
              <span>{label}</span>
              <Textarea
                disabled={isDisabled}
                id={fieldId}
                onChange={(event) => updateCustomField(field, event.target.value)}
                value={value}
              />
            </label>
          )
        }

        if (field.type === 'boolean') {
          return (
            <label
              key={field.id}
              className="flex items-center gap-3 text-sm font-medium text-slate-700"
              htmlFor={fieldId}
            >
              <input
                checked={Boolean(form.custom_fields[field.key])}
                className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                disabled={isDisabled}
                id={fieldId}
                onChange={(event) => updateCustomField(field, event.target.checked)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          )
        }

        if (field.type === 'select') {
          return (
            <label key={field.id} className="space-y-2 text-sm font-medium text-slate-700" htmlFor={fieldId}>
              <span>{label}</span>
              <Select
                disabled={isDisabled}
                id={fieldId}
                onChange={(event) => updateCustomField(field, event.target.value)}
                value={value}
              >
                <option value="">Selecione</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
          )
        }

        return (
          <label key={field.id} className="space-y-2 text-sm font-medium text-slate-700" htmlFor={fieldId}>
            <span>{label}</span>
            <Input
              disabled={isDisabled}
              id={fieldId}
              onChange={(event) => updateCustomField(field, event.target.value)}
              type={field.type === 'number' || field.type === 'date' ? field.type : 'text'}
              value={value}
            />
          </label>
        )
      })}
    </div>
  )
}

export function LeadsPage() {
  const { user } = useAuth()
  const { currentWorkspace, error: workspaceError, isLoading: isWorkspaceLoading } = useCurrentWorkspace()
  const {
    error: stagesError,
    isLoading: isStagesLoading,
    stages,
  } = usePipelineStages(currentWorkspace?.id)
  const {
    createLead,
    deleteLead,
    error: leadsError,
    isLoading: isLeadsLoading,
    leads,
    updateLead,
  } = useLeads(currentWorkspace?.id)
  const {
    error: membersError,
    isLoading: isMembersLoading,
    members,
  } = useWorkspaceMembers(currentWorkspace?.id)
  const {
    error: customFieldsError,
    fields: customFields,
    isLoading: isCustomFieldsLoading,
  } = useLeadCustomFields(currentWorkspace?.id)
  const { activeCampaigns, error: campaignsError, isLoading: isCampaignsLoading } = useCampaigns(
    currentWorkspace?.id,
  )
  const [createForm, setCreateForm] = useState<LeadFormState>(emptyLeadForm)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<LeadFormState>(emptyLeadForm)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all')
  const [stageFilter, setStageFilter] = useState<PipelineStageFilter>('all')
  const [viewMode, setViewMode] = useState<LeadsViewMode>('list')
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)

  const baseStage = useMemo(() => stages.find((stage) => stage.key === 'base') ?? stages[0] ?? null, [stages])

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
        const matchesStage = stageFilter === 'all' || lead.pipeline_stage_id === stageFilter
        const matchesSearch = leadMatchesSearch(lead, searchTerm)

        return matchesStatus && matchesStage && matchesSearch
      }),
    [leads, searchTerm, stageFilter, statusFilter],
  )

  async function recordLeadActivity(input: {
    description: string
    leadId: string
    metadata?: Record<string, unknown>
    type: LeadActivityType
  }) {
    if (!currentWorkspace || !user) {
      return
    }

    await createLeadActivity(
      {
        workspace_id: currentWorkspace.id,
        lead_id: input.leadId,
        type: input.type,
        description: input.description,
        metadata: input.metadata,
      },
      user.id,
    )
    setActivityRefreshKey((currentKey) => currentKey + 1)
  }

  async function generateTriggerMessagesForStage(
    leadId: string,
    targetStage: PipelineStage | null | undefined,
    currentStageId: string | null,
  ) {
    const result: TriggerGenerationResult = {
      failedCount: 0,
      processedCount: 0,
      successCount: 0,
    }

    if (!targetStage || targetStage.id === currentStageId) {
      return result
    }

    const triggerCampaigns = activeCampaigns.filter(
      (campaign) => campaign.is_active && campaign.trigger_stage_id === targetStage.id,
    )

    result.processedCount = triggerCampaigns.length

    for (const campaign of triggerCampaigns) {
      try {
        const response = await generateLeadMessages({
          leadId,
          campaignId: campaign.id,
          variationCount: 3,
        })

        await recordLeadActivity({
          leadId,
          type: 'message_generated',
          description: 'Mensagens geradas automaticamente pela etapa gatilho',
          metadata: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            trigger_stage_id: targetStage.id,
            trigger_stage_name: targetStage.name,
            count: response.messages.length,
          },
        })
        result.successCount += 1
      } catch (error) {
        console.error('Automatic trigger message generation failed.', {
          campaignId: campaign.id,
          leadId,
          error,
        })
        result.failedCount += 1
      }
    }

    return result
  }

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFeedbackMessage(null)

    if (!currentWorkspace) {
      setFormError('Workspace atual nao encontrado.')
      return
    }

    if (stages.length === 0) {
      setFormError('Nao ha etapas de funil configuradas para este workspace.')
      return
    }

    if (!createForm.name.trim()) {
      setFormError('Informe o nome do lead.')
      return
    }

    const customFieldsErrorMessage = validateRequiredCustomFields(createForm.custom_fields, customFields)

    if (customFieldsErrorMessage) {
      setFormError(customFieldsErrorMessage)
      return
    }

    const input: CreateLeadInput = {
      workspace_id: currentWorkspace.id,
      name: createForm.name.trim(),
      email: optionalText(createForm.email),
      phone: optionalText(createForm.phone),
      company: optionalText(createForm.company),
      job_title: optionalText(createForm.job_title),
      source: optionalText(createForm.source),
      status: createForm.status,
      pipeline_stage_id: createForm.pipeline_stage_id || baseStage?.id || null,
      assigned_to: createForm.assigned_to || null,
      notes: optionalText(createForm.notes),
      custom_fields: createForm.custom_fields,
    }

    try {
      setIsSubmitting(true)
      const createdLead = await createLead(input)
      await recordLeadActivity({
        leadId: createdLead.id,
        type: 'lead_created',
        description: 'Lead criado',
      })
      setCreateForm(emptyLeadForm)
      setFeedbackMessage('Lead criado com sucesso.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nao foi possivel criar o lead.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditingLead(lead: Lead) {
    setEditingLeadId(lead.id)
    setEditForm(getLeadFormFromLead(lead, baseStage?.id ?? ''))
    setFormError(null)
    setFeedbackMessage(null)
  }

  function cancelEditingLead() {
    setEditingLeadId(null)
    setEditForm(emptyLeadForm)
  }

  async function handleUpdateLead(leadId: string) {
    setFormError(null)
    setFeedbackMessage(null)

    if (!editForm.name.trim()) {
      setFormError('Informe o nome do lead.')
      return
    }

    const customFieldsErrorMessage = validateRequiredCustomFields(editForm.custom_fields, customFields)

    if (customFieldsErrorMessage) {
      setFormError(customFieldsErrorMessage)
      return
    }

    const existingLead = leads.find((lead) => lead.id === leadId)
    const targetStage = stages.find((stage) => stage.id === editForm.pipeline_stage_id)

    if (existingLead && targetStage) {
      const candidateLead: Lead = {
        ...existingLead,
        name: editForm.name.trim(),
        email: nullableText(editForm.email),
        phone: nullableText(editForm.phone),
        company: nullableText(editForm.company),
        job_title: nullableText(editForm.job_title),
        source: nullableText(editForm.source),
        notes: nullableText(editForm.notes),
        custom_fields: {
          ...(existingLead.custom_fields ?? {}),
          ...editForm.custom_fields,
        },
      }
      const transitionError = getStageTransitionError(candidateLead, targetStage)

      if (transitionError) {
        setFormError(transitionError)
        return
      }
    }

    const input: UpdateLeadInput = {
      name: editForm.name.trim(),
      email: nullableText(editForm.email),
      phone: nullableText(editForm.phone),
      company: nullableText(editForm.company),
      job_title: nullableText(editForm.job_title),
      source: nullableText(editForm.source),
      status: editForm.status,
      pipeline_stage_id: editForm.pipeline_stage_id || null,
      assigned_to: editForm.assigned_to || null,
      notes: nullableText(editForm.notes),
      custom_fields: {
        ...(existingLead?.custom_fields ?? {}),
        ...editForm.custom_fields,
      },
    }

    try {
      setIsSubmitting(true)
      const updatedLead = await updateLead(leadId, input)
      await recordLeadActivity({
        leadId,
        type: 'lead_updated',
        description: 'Lead atualizado',
      })
      if (existingLead && existingLead.assigned_to !== updatedLead.assigned_to) {
        await recordLeadActivity({
          leadId,
          type: 'responsible_changed',
          description: 'Responsavel do lead alterado',
          metadata: {
            from_user_id: existingLead.assigned_to,
            to_user_id: updatedLead.assigned_to,
          },
        })
      }
      if (existingLead && targetStage && existingLead.pipeline_stage_id !== updatedLead.pipeline_stage_id) {
        await recordLeadActivity({
          leadId,
          type: 'stage_changed',
          description: `Lead movido para ${targetStage.name}`,
          metadata: {
            from_stage_id: existingLead.pipeline_stage_id,
            to_stage_id: targetStage.id,
            to_stage_name: targetStage.name,
          },
        })
        const triggerResult = await generateTriggerMessagesForStage(
          leadId,
          targetStage,
          existingLead.pipeline_stage_id,
        )
        setFeedbackMessage(getTriggerGenerationFeedback(triggerResult))
      } else {
        setFeedbackMessage('Lead atualizado com sucesso.')
      }
      setEditingLeadId(null)
      setEditForm(emptyLeadForm)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nao foi possivel atualizar o lead.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteLead(lead: Lead) {
    const shouldDelete = window.confirm(`Excluir o lead "${lead.name}"?`)

    if (!shouldDelete) {
      return
    }

    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await deleteLead(lead.id)
      setFeedbackMessage('Lead excluido com sucesso.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nao foi possivel excluir o lead.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMoveLead(lead: Lead, nextStageId: string) {
    if (!nextStageId || nextStageId === lead.pipeline_stage_id) {
      return
    }

    const targetStage = stages.find((stage) => stage.id === nextStageId)

    if (targetStage) {
      const transitionError = getStageTransitionError(lead, targetStage)

      if (transitionError) {
        setFormError(transitionError)
        setFeedbackMessage(null)
        return
      }
    }

    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await updateLead(lead.id, {
        pipeline_stage_id: nextStageId,
      })
      if (targetStage) {
        await recordLeadActivity({
          leadId: lead.id,
          type: 'stage_changed',
          description: `Lead movido para ${targetStage.name}`,
          metadata: {
            from_stage_id: lead.pipeline_stage_id,
            to_stage_id: targetStage.id,
            to_stage_name: targetStage.name,
          },
        })
      }
      const triggerResult = await generateTriggerMessagesForStage(
        lead.id,
        targetStage,
        lead.pipeline_stage_id,
      )
      setFeedbackMessage(getTriggerGenerationFeedback(triggerResult))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nao foi possivel mover o lead.')
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
        Nenhum workspace encontrado para listar leads.
      </p>
    )
  }

  if (stagesError) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{stagesError}</p>
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Leads</h1>
        <p className="mt-2 text-sm text-slate-600">Workspace atual: {currentWorkspace.name}</p>
      </div>

      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold tracking-normal">Criar lead</h2>
          <p className="mt-1 text-sm text-slate-600">Cadastro basico para iniciar a lista comercial.</p>
        </div>

        <form className="space-y-5" onSubmit={handleCreateLead}>
          <LeadFormFields
            customFields={customFields}
            form={createForm}
            idPrefix="create-lead"
            isDisabled={isSubmitting || isStagesLoading || isMembersLoading || isCustomFieldsLoading}
            members={members}
            onChange={setCreateForm}
            stages={stages}
          />

          {isStagesLoading ? <p className="text-sm text-slate-600">Carregando etapas do funil...</p> : null}
          {isMembersLoading ? <p className="text-sm text-slate-600">Carregando membros do workspace...</p> : null}
          {isCustomFieldsLoading ? <p className="text-sm text-slate-600">Carregando campos personalizados...</p> : null}

          {membersError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {membersError}
            </p>
          ) : null}

          {customFieldsError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {customFieldsError}
            </p>
          ) : null}

          {!isStagesLoading && stages.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Nao ha etapas de funil configuradas para este workspace.
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

          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Salvando...' : 'Criar lead'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Lista de leads</h2>
            <p className="text-sm text-slate-600">
              Mostrando {filteredLeads.length} de {leads.length} leads
            </p>
          </div>
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
            <Button
              className={
                viewMode === 'list'
                  ? 'h-8 bg-slate-950 px-3'
                  : 'h-8 bg-transparent px-3 text-slate-700 hover:bg-white'
              }
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
            <Button
              className={
                viewMode === 'kanban'
                  ? 'h-8 bg-slate-950 px-3'
                  : 'h-8 bg-transparent px-3 text-slate-700 hover:bg-white'
              }
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-search">
            <span>Buscar</span>
            <Input
              id="lead-search"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, email, telefone, empresa, cargo ou origem"
              value={searchTerm}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-status-filter">
            <span>Status</span>
            <Select
              id="lead-status-filter"
              onChange={(event) => setStatusFilter(event.target.value as LeadStatusFilter)}
              value={statusFilter}
            >
              <option value="all">Todos</option>
              {leadStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-stage-filter">
            <span>Etapa do funil</span>
            <Select
              disabled={isStagesLoading}
              id="lead-stage-filter"
              onChange={(event) => setStageFilter(event.target.value as PipelineStageFilter)}
              value={stageFilter}
            >
              <option value="all">Todas</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {leadsError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{leadsError}</p>
        ) : null}

        {isLeadsLoading ? <p className="text-sm text-slate-600">Carregando leads...</p> : null}

        {!isLeadsLoading && leads.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Voce ainda nao cadastrou nenhum lead.
          </p>
        ) : null}

        {!isLeadsLoading && leads.length > 0 && filteredLeads.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Nenhum lead encontrado com os filtros atuais.
          </p>
        ) : null}

        {viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
            const isEditing = editingLeadId === lead.id

            return (
              <div key={lead.id} className="rounded-lg border border-slate-200 bg-white p-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <LeadFormFields
                      customFields={customFields}
                      form={editForm}
                      idPrefix={`edit-lead-${lead.id}`}
                      isDisabled={isSubmitting || isMembersLoading || isCustomFieldsLoading}
                      members={members}
                      onChange={setEditForm}
                      stages={stages}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={isSubmitting} onClick={() => void handleUpdateLead(lead.id)}>
                        Salvar
                      </Button>
                      <Button
                        className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                        disabled={isSubmitting}
                        onClick={cancelEditingLead}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {campaignsError ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {campaignsError}
                      </p>
                    ) : null}
                    {isCampaignsLoading ? (
                      <p className="text-sm text-slate-600">Carregando campanhas...</p>
                    ) : (
                      <>
                        <LeadMessagesPanel
                          activeCampaigns={activeCampaigns}
                          lead={lead}
                          onActivityCreated={() => setActivityRefreshKey((currentKey) => currentKey + 1)}
                          onLeadMovedToStage={async (targetStage) => {
                            if (targetStage.id === lead.pipeline_stage_id) {
                              return null
                            }

                            const triggerResult = await generateTriggerMessagesForStage(
                              lead.id,
                              targetStage,
                              lead.pipeline_stage_id,
                            )

                            return getTriggerGenerationFeedback(triggerResult)
                          }}
                          onValidateStageMove={(targetStage) => getStageTransitionError(lead, targetStage)}
                          stages={stages}
                          updateLead={updateLead}
                        />
                        <LeadActivitiesPanel leadId={lead.id} refreshKey={activityRefreshKey} />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-base font-semibold text-slate-950">{lead.name}</p>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                            {getStatusLabel(lead.status)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                            {getStageName(stages, lead.pipeline_stage_id)}
                          </span>
                        </div>
                        <p className="break-words text-sm text-slate-600">
                          {[lead.job_title, lead.company].filter(Boolean).join(' em ') || 'Sem empresa informada'}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                        <span>Email: {lead.email ?? '-'}</span>
                        <span>Telefone: {lead.phone ?? '-'}</span>
                        <span>Empresa: {lead.company ?? '-'}</span>
                        <span>Cargo: {lead.job_title ?? '-'}</span>
                        <span>Origem: {lead.source ?? '-'}</span>
                        <span>Etapa: {getStageName(stages, lead.pipeline_stage_id)}</span>
                        <span>Responsavel: {getAssigneeLabel(members, lead.assigned_to)}</span>
                      </div>
                      {lead.notes ? <p className="text-sm text-slate-600">Observações: {lead.notes}</p> : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <label className="w-full space-y-2 text-sm font-medium text-slate-700 sm:w-48" htmlFor={`move-lead-${lead.id}`}>
                        <span>Mover para etapa</span>
                        <Select
                          disabled={isSubmitting || stages.length === 0}
                          id={`move-lead-${lead.id}`}
                          onChange={(event) => void handleMoveLead(lead, event.target.value)}
                          value={lead.pipeline_stage_id ?? ''}
                        >
                          <option value="">Sem etapa</option>
                          {stages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <Button
                        className="gap-2 bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                        disabled={isSubmitting}
                        onClick={() => startEditingLead(lead)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        className="gap-2 bg-red-600 hover:bg-red-700"
                        disabled={isSubmitting}
                        onClick={() => void handleDeleteLead(lead)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-full gap-4">
              {stages.map((stage) => {
                const stageLeads = getLeadsByStage(filteredLeads, stage.id)

                return (
                  <div key={stage.id} className="min-w-72 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">{stage.name}</h3>
                        <p className="text-xs text-slate-500">{stageLeads.length} lead(s)</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {stage.position}
                      </span>
                    </div>

                    {stageLeads.length === 0 ? (
                      <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                        Nenhum lead nesta etapa.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stageLeads.map((lead) => (
                          <div key={lead.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-sm font-semibold text-slate-950">{lead.name}</p>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                                  {getStatusLabel(lead.status)}
                                </span>
                              </div>
                              <p className="break-words text-xs text-slate-600">
                                {[lead.job_title, lead.company].filter(Boolean).join(' em ') || 'Sem empresa informada'}
                              </p>
                              <div className="space-y-1 text-xs text-slate-600">
                                <p>Email: {lead.email ?? '-'}</p>
                                <p>Telefone: {lead.phone ?? '-'}</p>
                                <p>Origem: {lead.source ?? '-'}</p>
                                <p>Responsavel: {getAssigneeLabel(members, lead.assigned_to)}</p>
                              </div>
                              <label className="block space-y-1 text-xs font-medium text-slate-700" htmlFor={`kanban-move-${lead.id}`}>
                                <span>Mover para etapa</span>
                                <Select
                                  className="h-9 text-xs"
                                  disabled={isSubmitting || stages.length === 0}
                                  id={`kanban-move-${lead.id}`}
                                  onChange={(event) => void handleMoveLead(lead, event.target.value)}
                                  value={lead.pipeline_stage_id ?? ''}
                                >
                                  <option value="">Sem etapa</option>
                                  {stages.map((nextStage) => (
                                    <option key={nextStage.id} value={nextStage.id}>
                                      {nextStage.name}
                                    </option>
                                  ))}
                                </Select>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}
