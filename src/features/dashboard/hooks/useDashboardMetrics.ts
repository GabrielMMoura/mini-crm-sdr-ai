import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getDashboardMetrics } from '../services/dashboardService'
import type { DashboardMetrics } from '../types/dashboard.types'

export function useDashboardMetrics(workspaceId?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadMetrics = useCallback(async (targetWorkspaceId: string, force = false) => {
    if (
      !force &&
      (loadedWorkspaceIdRef.current === targetWorkspaceId ||
        loadingWorkspaceIdRef.current === targetWorkspaceId)
    ) {
      return
    }

    try {
      loadingWorkspaceIdRef.current = targetWorkspaceId
      setIsLoading(true)
      setError(null)
      const nextMetrics = await getDashboardMetrics(targetWorkspaceId)
      setMetrics(nextMetrics)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setMetrics(null)
      loadedWorkspaceIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar as metricas do dashboard.',
      )
    } finally {
      loadingWorkspaceIdRef.current = null
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!workspaceId) {
      return
    }

    await loadMetrics(workspaceId, true)
  }, [loadMetrics, workspaceId])

  useEffect(() => {
    let isActive = true

    async function syncMetrics() {
      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setMetrics(null)
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadMetrics(workspaceId)
      }
    }

    void syncMetrics()

    return () => {
      isActive = false
    }
  }, [loadMetrics, workspaceId])

  return useMemo(
    () => ({
      metrics,
      isLoading,
      error,
      refetch,
    }),
    [error, isLoading, metrics, refetch],
  )
}
