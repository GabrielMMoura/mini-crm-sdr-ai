import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  deleteAiSettings,
  getAiSettings,
  saveAiSettings,
  testAiSettings,
} from '../services/aiSettingsService'
import type {
  AiSettingsMetadata,
  SaveAiSettingsInput,
  TestAiSettingsInput,
  TestAiSettingsResponse,
} from '../types/aiSettings.types'

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettingsMetadata | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await getAiSettings()
      setSettings(response.settings)
      setIsConfigured(response.is_configured)
    } catch (loadError) {
      setSettings(null)
      setIsConfigured(false)
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações de IA.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveSettings = useCallback(
    async (input: SaveAiSettingsInput) => {
      try {
        setIsSaving(true)
        setError(null)
        setFeedback(null)
        await saveAiSettings(input)
        setFeedback('Chave OpenAI salva com sucesso.')
        await refetch()
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Não foi possível salvar a chave OpenAI.'
        setError(message)
        throw new Error(message, { cause: saveError })
      } finally {
        setIsSaving(false)
      }
    },
    [refetch],
  )

  const testSettings = useCallback(async (input: TestAiSettingsInput = {}): Promise<TestAiSettingsResponse> => {
    try {
      setIsTesting(true)
      setError(null)
      setFeedback(null)
      const response = await testAiSettings(input)
      setFeedback(response.message)
      return response
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : 'Não foi possível testar a chave OpenAI.'
      setError(message)
      throw new Error(message, { cause: testError })
    } finally {
      setIsTesting(false)
    }
  }, [])

  const deleteSettings = useCallback(async () => {
    try {
      setIsDeleting(true)
      setError(null)
      setFeedback(null)
      await deleteAiSettings()
      setFeedback('Chave OpenAI removida.')
      await refetch()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível remover a chave OpenAI.'
      setError(message)
      throw new Error(message, { cause: deleteError })
    } finally {
      setIsDeleting(false)
    }
  }, [refetch])

  useEffect(() => {
    let isActive = true

    async function loadSettings() {
      if (!isActive) {
        return
      }

      await refetch()
    }

    void loadSettings()

    return () => {
      isActive = false
    }
  }, [refetch])

  return useMemo(
    () => ({
      settings,
      isConfigured,
      isLoading,
      isSaving,
      isTesting,
      isDeleting,
      error,
      feedback,
      refetch,
      saveSettings,
      testSettings,
      deleteSettings,
    }),
    [
      deleteSettings,
      error,
      feedback,
      isConfigured,
      isDeleting,
      isLoading,
      isSaving,
      isTesting,
      refetch,
      saveSettings,
      settings,
      testSettings,
    ],
  )
}
