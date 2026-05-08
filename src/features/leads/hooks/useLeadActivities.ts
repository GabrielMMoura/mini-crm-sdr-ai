import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'
import {
  createLeadActivity as createLeadActivityWithSupabase,
  getLeadActivities,
} from '../services/leadActivityService'
import type { CreateLeadActivityInput, LeadActivity } from '../types/leadActivity.types'

export function useLeadActivities(leadId?: string) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedLeadIdRef = useRef<string | null>(null)
  const loadingLeadIdRef = useRef<string | null>(null)

  const loadActivities = useCallback(async (targetLeadId: string, force = false) => {
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
      const nextActivities = await getLeadActivities(targetLeadId)
      setActivities(nextActivities)
      loadedLeadIdRef.current = targetLeadId
    } catch (loadError) {
      setActivities([])
      loadedLeadIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar o historico do lead.',
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

    await loadActivities(leadId, true)
  }, [leadId, loadActivities])

  const createActivity = useCallback(
    async (input: CreateLeadActivityInput) => {
      if (!isAuthenticated || !user) {
        throw new Error('Usuario autenticado e obrigatorio para registrar atividade.')
      }

      const createdActivity = await createLeadActivityWithSupabase(input, user.id)
      await refetch()
      return createdActivity
    },
    [isAuthenticated, refetch, user],
  )

  useEffect(() => {
    let isActive = true

    async function syncActivities() {
      if (isAuthLoading) {
        return
      }

      if (!leadId) {
        if (!isActive) {
          return
        }

        setActivities([])
        setError(null)
        setIsLoading(false)
        loadedLeadIdRef.current = null
        loadingLeadIdRef.current = null
        return
      }

      if (isActive) {
        await loadActivities(leadId)
      }
    }

    void syncActivities()

    return () => {
      isActive = false
    }
  }, [isAuthLoading, leadId, loadActivities])

  return useMemo(
    () => ({
      activities,
      isLoading: isAuthLoading || isLoading,
      error,
      refetch,
      createActivity,
    }),
    [activities, createActivity, error, isAuthLoading, isLoading, refetch],
  )
}
