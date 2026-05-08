import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getPipelineStagesByWorkspace,
  updatePipelineStage as updatePipelineStageWithSupabase,
} from '../services/pipelineService'
import type { PipelineStage, UpdatePipelineStageInput } from '../types/pipeline.types'

export function usePipelineStages(workspaceId?: string) {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadStages = useCallback(async (targetWorkspaceId: string, force = false) => {
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
      const nextStages = await getPipelineStagesByWorkspace(targetWorkspaceId)
      setStages(nextStages)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setStages([])
      loadedWorkspaceIdRef.current = null
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o funil.')
    } finally {
      loadingWorkspaceIdRef.current = null
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!workspaceId) {
      return
    }

    await loadStages(workspaceId, true)
  }, [loadStages, workspaceId])

  const updateStage = useCallback(
    async (stageId: string, input: UpdatePipelineStageInput) => {
      const updatedStage = await updatePipelineStageWithSupabase(stageId, input)
      await refetch()
      return updatedStage
    },
    [refetch],
  )

  useEffect(() => {
    let isActive = true

    async function syncStages() {
      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setStages([])
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadStages(workspaceId)
      }
    }

    void syncStages()

    return () => {
      isActive = false
    }
  }, [loadStages, workspaceId])

  return useMemo(
    () => ({
      stages,
      isLoading,
      error,
      refetch,
      updateStage,
    }),
    [error, isLoading, refetch, stages, updateStage],
  )
}
