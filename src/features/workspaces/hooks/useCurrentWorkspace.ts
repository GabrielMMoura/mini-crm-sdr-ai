import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'
import { getUserWorkspaces } from '../services/workspaceService'
import type { CurrentWorkspaceState, Workspace } from '../types/workspace.types'

export function useCurrentWorkspace() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedUserIdRef = useRef<string | null>(null)
  const loadingUserIdRef = useRef<string | null>(null)

  const loadAuthenticatedWorkspaces = useCallback(async (userId: string, force = false) => {
    if (!force && (loadedUserIdRef.current === userId || loadingUserIdRef.current === userId)) {
      return
    }

    try {
      loadingUserIdRef.current = userId
      setIsLoading(true)
      setError(null)
      const nextWorkspaces = await getUserWorkspaces(userId)
      setWorkspaces(nextWorkspaces)
      loadedUserIdRef.current = userId
    } catch (loadError) {
      setWorkspaces([])
      loadedUserIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar o workspace atual.',
      )
    } finally {
      loadingUserIdRef.current = null
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (isAuthLoading) {
      return
    }

    if (!isAuthenticated || !user) {
      setWorkspaces([])
      setError(null)
      setIsLoading(false)
      loadedUserIdRef.current = null
      loadingUserIdRef.current = null
      return
    }

    await loadAuthenticatedWorkspaces(user.id, true)
  }, [isAuthenticated, isAuthLoading, loadAuthenticatedWorkspaces, user])

  useEffect(() => {
    let isActive = true

    async function syncWorkspaces() {
      if (isAuthLoading) {
        return
      }

      if (!isAuthenticated || !user) {
        if (!isActive) {
          return
        }

        setWorkspaces([])
        setError(null)
        setIsLoading(false)
        loadedUserIdRef.current = null
        loadingUserIdRef.current = null
        return
      }

      if (isActive) {
        await loadAuthenticatedWorkspaces(user.id)
      }
    }

    void syncWorkspaces()

    return () => {
      isActive = false
    }
  }, [isAuthenticated, isAuthLoading, loadAuthenticatedWorkspaces, user])

  const state = useMemo<CurrentWorkspaceState>(
    () => ({
      currentWorkspace: workspaces[0] ?? null,
      workspaces,
      isLoading: isAuthLoading || isLoading,
      error,
    }),
    [error, isAuthLoading, isLoading, workspaces],
  )

  return {
    ...state,
    refetch,
  }
}
