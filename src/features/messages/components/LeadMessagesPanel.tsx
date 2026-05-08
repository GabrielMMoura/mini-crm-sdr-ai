import { useMemo, useState } from 'react'
import { Archive, Clipboard, Send } from 'lucide-react'

import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import type { Campaign } from '../../campaigns/types/campaign.types'
import { useLeadActivities } from '../../leads/hooks/useLeadActivities'
import type { Lead, UpdateLeadInput } from '../../leads/types/lead.types'
import type { PipelineStage } from '../../pipeline/types/pipeline.types'
import { useGeneratedMessages } from '../hooks/useGeneratedMessages'
import type { GeneratedMessageStatus } from '../types/generatedMessage.types'

const messageStatusLabels: Record<GeneratedMessageStatus, string> = {
  generated: 'Gerada',
  copied: 'Copiada',
  sent: 'Enviada',
  archived: 'Arquivada',
}

type LeadMessagesPanelProps = {
  activeCampaigns: Campaign[]
  lead: Lead
  onActivityCreated?: () => void
  onLeadMovedToStage?: (targetStage: PipelineStage) => Promise<string | null>
  onValidateStageMove?: (targetStage: PipelineStage) => string | null
  stages: PipelineStage[]
  updateLead: (leadId: string, input: UpdateLeadInput) => Promise<Lead>
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function LeadMessagesPanel({
  activeCampaigns,
  lead,
  onActivityCreated,
  onLeadMovedToStage,
  onValidateStageMove,
  stages,
  updateLead,
}: LeadMessagesPanelProps) {
  const {
    archiveMessage,
    error,
    generateMessages,
    isGenerating,
    isLoading,
    markAsCopied,
    messages,
    refetch,
    sendMessageAndMoveLead,
  } = useGeneratedMessages(lead.id)
  const { createActivity } = useLeadActivities(lead.id)
  const [selectedCampaignId, setSelectedCampaignId] = useState(activeCampaigns[0]?.id ?? '')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null)

  const tryingContactStage = useMemo(
    () => stages.find((stage) => stage.key === 'trying_contact') ?? null,
    [stages],
  )

  async function handleGenerateMessages() {
    setPanelError(null)
    setFeedbackMessage(null)

    if (!selectedCampaignId) {
      setPanelError('Selecione uma campanha ativa para gerar mensagens.')
      return
    }

    try {
      const response = await generateMessages({
        campaignId: selectedCampaignId,
        variationCount: 3,
      })
      const campaign = activeCampaigns.find((item) => item.id === selectedCampaignId)
      await createActivity({
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        type: 'message_generated',
        description: 'Mensagens geradas com IA',
        metadata: {
          campaign_id: selectedCampaignId,
          campaign_name: campaign?.name ?? null,
          count: response.messages.length,
        },
      })
      onActivityCreated?.()
      setFeedbackMessage('Mensagens geradas com sucesso.')
    } catch (generateError) {
      setPanelError(
        generateError instanceof Error ? generateError.message : 'Nao foi possivel gerar mensagens.',
      )
    }
  }

  async function handleCopyMessage(messageId: string, content: string) {
    setPanelError(null)
    setFeedbackMessage(null)

    try {
      setBusyMessageId(messageId)
      await navigator.clipboard.writeText(content)
      await markAsCopied(messageId)
      await createActivity({
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        type: 'message_copied',
        description: 'Mensagem copiada',
        metadata: {
          message_id: messageId,
        },
      })
      onActivityCreated?.()
      setFeedbackMessage('Mensagem copiada.')
    } catch (copyError) {
      setPanelError(copyError instanceof Error ? copyError.message : 'Nao foi possivel copiar a mensagem.')
    } finally {
      setBusyMessageId(null)
    }
  }

  async function handleSendMessage(messageId: string) {
    setPanelError(null)
    setFeedbackMessage(null)

    if (!tryingContactStage) {
      setPanelError('Etapa Tentando Contato nao encontrada neste workspace.')
      return
    }

    const validationError = onValidateStageMove?.(tryingContactStage)

    if (validationError) {
      setPanelError(validationError)
      return
    }

    try {
      setBusyMessageId(messageId)
      await sendMessageAndMoveLead({
        messageId,
        leadId: lead.id,
        tryingContactStageId: tryingContactStage.id,
        updateLead,
      })
      await createActivity({
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        type: 'message_sent',
        description: 'Mensagem enviada de forma simulada',
        metadata: {
          message_id: messageId,
          to_stage_id: tryingContactStage.id,
          to_stage_name: tryingContactStage.name,
        },
      })
      onActivityCreated?.()
      const triggerFeedback = await onLeadMovedToStage?.(tryingContactStage)

      if (triggerFeedback) {
        await refetch()
      }

      setFeedbackMessage(triggerFeedback ?? 'Mensagem enviada e lead movido para Tentando Contato.')
    } catch (sendError) {
      setPanelError(
        sendError instanceof Error ? sendError.message : 'Nao foi possivel enviar a mensagem.',
      )
    } finally {
      setBusyMessageId(null)
    }
  }

  async function handleArchiveMessage(messageId: string) {
    setPanelError(null)
    setFeedbackMessage(null)

    try {
      setBusyMessageId(messageId)
      await archiveMessage(messageId)
      await createActivity({
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        type: 'message_archived',
        description: 'Mensagem arquivada',
        metadata: {
          message_id: messageId,
        },
      })
      onActivityCreated?.()
      setFeedbackMessage('Mensagem arquivada.')
    } catch (archiveError) {
      setPanelError(
        archiveError instanceof Error ? archiveError.message : 'Nao foi possivel arquivar a mensagem.',
      )
    } finally {
      setBusyMessageId(null)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-950">Mensagens com IA</h3>
        <p className="mt-1 text-sm text-slate-600">Gere abordagens personalizadas para este lead.</p>
      </div>

      {activeCampaigns.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Crie uma campanha ativa antes de gerar mensagens.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor={`campaign-${lead.id}`}>
            <span>Campanha</span>
            <Select
              disabled={isGenerating}
              id={`campaign-${lead.id}`}
              onChange={(event) => setSelectedCampaignId(event.target.value)}
              value={selectedCampaignId}
            >
              {activeCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
          </label>

          <Button disabled={isGenerating || !selectedCampaignId} onClick={() => void handleGenerateMessages()}>
            {isGenerating ? 'Gerando...' : 'Gerar mensagens com IA'}
          </Button>

          <Button
            className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
            disabled={isGenerating || !selectedCampaignId}
            onClick={() => void handleGenerateMessages()}
          >
            Regenerar
          </Button>
        </div>
      )}

      {isLoading ? <p className="text-sm text-slate-600">Carregando mensagens...</p> : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {panelError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {panelError}
        </p>
      ) : null}

      {feedbackMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {feedbackMessage}
        </p>
      ) : null}

      {!isLoading && messages.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
          Nenhuma mensagem gerada para este lead.
        </p>
      ) : null}

      <div className="space-y-3">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Variacao {message.variation_index}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {messageStatusLabels[message.status]} - {formatMessageDate(message.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-9 gap-2 bg-white px-3 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                  disabled={busyMessageId === message.id}
                  onClick={() => void handleCopyMessage(message.id, message.content)}
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  Copiar
                </Button>
                <Button
                  className="h-9 gap-2 px-3"
                  disabled={busyMessageId === message.id || message.status === 'sent'}
                  onClick={() => void handleSendMessage(message.id)}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Enviar simulado
                </Button>
                <Button
                  className="h-9 gap-2 bg-white px-3 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                  disabled={busyMessageId === message.id || message.status === 'archived'}
                  onClick={() => void handleArchiveMessage(message.id)}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Arquivar
                </Button>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
