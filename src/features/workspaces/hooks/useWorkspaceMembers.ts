import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getWorkspaceMembers } from '../services/workspaceMemberService'
import type { WorkspaceMemberWithProfile } from '../types/workspaceMember.types'

export function useWorkspaceMembers(workspaceId?: string) {
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadMembers = useCallback(async (targetWorkspaceId: string, force = false) => {
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
      const nextMembers = await getWorkspaceMembers(targetWorkspaceId)
      setMembers(nextMembers)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setMembers([])
      loadedWorkspaceIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar os membros do workspace.',
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

    await loadMembers(workspaceId, true)
  }, [loadMembers, workspaceId])

  useEffect(() => {
    let isActive = true

    async function syncMembers() {
      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setMembers([])
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadMembers(workspaceId)
      }
    }

    void syncMembers()

    return () => {
      isActive = false
    }
  }, [loadMembers, workspaceId])

  return useMemo(
    () => ({
      members,
      isLoading,
      error,
      refetch,
    }),
    [error, isLoading, members, refetch],
  )
}
