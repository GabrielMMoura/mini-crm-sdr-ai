import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'
import {
  createLead as createLeadWithSupabase,
  deleteLead as deleteLeadWithSupabase,
  getLeadsByWorkspace,
  updateLead as updateLeadWithSupabase,
} from '../services/leadService'
import type { CreateLeadInput, Lead, UpdateLeadInput } from '../types/lead.types'

export function useLeads(workspaceId?: string) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadLeads = useCallback(async (targetWorkspaceId: string, force = false) => {
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
      const nextLeads = await getLeadsByWorkspace(targetWorkspaceId)
      setLeads(nextLeads)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setLeads([])
      loadedWorkspaceIdRef.current = null
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar os leads.')
    } finally {
      loadingWorkspaceIdRef.current = null
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!workspaceId) {
      return
    }

    await loadLeads(workspaceId, true)
  }, [loadLeads, workspaceId])

  const createLead = useCallback(
    async (input: CreateLeadInput) => {
      if (!isAuthenticated || !user) {
        throw new Error('Usuario autenticado e obrigatorio para criar lead.')
      }

      const createdLead = await createLeadWithSupabase(input, user.id)
      await refetch()
      return createdLead
    },
    [isAuthenticated, refetch, user],
  )

  const updateLead = useCallback(
    async (leadId: string, input: UpdateLeadInput) => {
      const updatedLead = await updateLeadWithSupabase(leadId, input)
      await refetch()
      return updatedLead
    },
    [refetch],
  )

  const deleteLead = useCallback(
    async (leadId: string) => {
      const wasDeleted = await deleteLeadWithSupabase(leadId)
      await refetch()
      return wasDeleted
    },
    [refetch],
  )

  useEffect(() => {
    let isActive = true

    async function syncLeads() {
      if (isAuthLoading) {
        return
      }

      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setLeads([])
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadLeads(workspaceId)
      }
    }

    void syncLeads()

    return () => {
      isActive = false
    }
  }, [isAuthLoading, loadLeads, workspaceId])

  return useMemo(
    () => ({
      leads,
      isLoading: isAuthLoading || isLoading,
      error,
      refetch,
      createLead,
      updateLead,
      deleteLead,
    }),
    [createLead, deleteLead, error, isAuthLoading, isLoading, leads, refetch, updateLead],
  )
}
