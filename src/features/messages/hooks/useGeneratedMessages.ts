import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  archiveMessage as archiveMessageWithSupabase,
  generateLeadMessages,
  getMessagesByLead,
  markMessageAsCopied,
  markMessageAsSent,
} from '../services/generatedMessageService'
import type {
  GeneratedMessage,
  GenerateLeadMessagesInput,
} from '../types/generatedMessage.types'

type SendMessageAndMoveLeadParams = {
  messageId: string
  leadId: string
  tryingContactStageId: string
  updateLead: (leadId: string, input: { pipeline_stage_id: string }) => Promise<unknown>
}

export function useGeneratedMessages(leadId?: string) {
  const [messages, setMessages] = useState<GeneratedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedLeadIdRef = useRef<string | null>(null)
  const loadingLeadIdRef = useRef<string | null>(null)

  const loadMessages = useCallback(async (targetLeadId: string, force = false) => {
    if (
      !force &&
      (loadedLeadIdRef.current === targetLeadId || loadingLeadIdRef.current === targetLeadId)
    ) {
      return
    }

    try {
      loadingLeadIdRef.current = targetLeadId
      setIsLoading(true)
      setError(null)
      const nextMessages = await getMessagesByLead(targetLeadId)
      setMessages(nextMessages)
      loadedLeadIdRef.current = targetLeadId
    } catch (loadError) {
      setMessages([])
      loadedLeadIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar as mensagens geradas.',
      )
    } finally {
      loadingLeadIdRef.current = null
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!leadId) {
      return
    }

    await loadMessages(leadId, true)
  }, [leadId, loadMessages])

  const generateMessages = useCallback(
    async (input: Omit<GenerateLeadMessagesInput, 'leadId'> & { leadId?: string }) => {
      const targetLeadId = input.leadId ?? leadId

      if (!targetLeadId) {
        throw new Error('Lead e obrigatorio para gerar mensagens.')
      }

      try {
        setIsGenerating(true)
        setError(null)
        const response = await generateLeadMessages({
          leadId: targetLeadId,
          campaignId: input.campaignId,
          variationCount: input.variationCount,
        })
        await loadMessages(targetLeadId, true)
        return response
      } catch (generateError) {
        const message =
          generateError instanceof Error
            ? generateError.message
            : 'Nao foi possivel gerar mensagens.'
        setError(message)
        throw new Error(message, { cause: generateError })
      } finally {
        setIsGenerating(false)
      }
    },
    [leadId, loadMessages],
  )

  const markAsCopied = useCallback(
    async (messageId: string) => {
      const updatedMessage = await markMessageAsCopied(messageId)
      await refetch()
      return updatedMessage
    },
    [refetch],
  )

  const markAsSent = useCallback(
    async (messageId: string) => {
      const updatedMessage = await markMessageAsSent(messageId)
      await refetch()
      return updatedMessage
    },
    [refetch],
  )

  const archiveGeneratedMessage = useCallback(
    async (messageId: string) => {
      const updatedMessage = await archiveMessageWithSupabase(messageId)
      await refetch()
      return updatedMessage
    },
    [refetch],
  )

  const sendMessageAndMoveLead = useCallback(
    async ({
      messageId,
      leadId: targetLeadId,
      tryingContactStageId,
      updateLead,
    }: SendMessageAndMoveLeadParams) => {
      const updatedMessage = await markMessageAsSent(messageId)
      await updateLead(targetLeadId, { pipeline_stage_id: tryingContactStageId })
      await refetch()
      return updatedMessage
    },
    [refetch],
  )

  useEffect(() => {
    let isActive = true

    async function syncMessages() {
      if (!leadId) {
        if (!isActive) {
          return
        }

        setMessages([])
        setError(null)
        setIsLoading(false)
        loadedLeadIdRef.current = null
        loadingLeadIdRef.current = null
        return
      }

      if (isActive) {
        await loadMessages(leadId)
      }
    }

    void syncMessages()

    return () => {
      isActive = false
    }
  }, [leadId, loadMessages])

  return useMemo(
    () => ({
      messages,
      isLoading,
      isGenerating,
      error,
      refetch,
      generateMessages,
      markAsCopied,
      markAsSent,
      archiveMessage: archiveGeneratedMessage,
      sendMessageAndMoveLead,
    }),
    [
      archiveGeneratedMessage,
      error,
      generateMessages,
      isGenerating,
      isLoading,
      markAsCopied,
      markAsSent,
      messages,
      refetch,
      sendMessageAndMoveLead,
    ],
  )
}
