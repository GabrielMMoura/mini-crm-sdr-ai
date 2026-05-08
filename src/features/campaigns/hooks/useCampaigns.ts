import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'
import {
  createCampaign as createCampaignWithSupabase,
  deleteCampaign as deleteCampaignWithSupabase,
  getCampaignsByWorkspace,
  updateCampaign as updateCampaignWithSupabase,
} from '../services/campaignService'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from '../types/campaign.types'

export function useCampaigns(workspaceId?: string) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadCampaigns = useCallback(async (targetWorkspaceId: string, force = false) => {
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
      const nextCampaigns = await getCampaignsByWorkspace(targetWorkspaceId)
      setCampaigns(nextCampaigns)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setCampaigns([])
      loadedWorkspaceIdRef.current = null
      setError(
        loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar as campanhas.',
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

    await loadCampaigns(workspaceId, true)
  }, [loadCampaigns, workspaceId])

  const createCampaign = useCallback(
    async (input: CreateCampaignInput) => {
      if (!isAuthenticated || !user) {
        throw new Error('Usuario autenticado e obrigatorio para criar campanha.')
      }

      const createdCampaign = await createCampaignWithSupabase(input, user.id)
      await refetch()
      return createdCampaign
    },
    [isAuthenticated, refetch, user],
  )

  const updateCampaign = useCallback(
    async (campaignId: string, input: UpdateCampaignInput) => {
      const updatedCampaign = await updateCampaignWithSupabase(campaignId, input)
      await refetch()
      return updatedCampaign
    },
    [refetch],
  )

  const deleteCampaign = useCallback(
    async (campaignId: string) => {
      const wasDeleted = await deleteCampaignWithSupabase(campaignId)
      await refetch()
      return wasDeleted
    },
    [refetch],
  )

  useEffect(() => {
    let isActive = true

    async function syncCampaigns() {
      if (isAuthLoading) {
        return
      }

      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setCampaigns([])
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadCampaigns(workspaceId)
      }
    }

    void syncCampaigns()

    return () => {
      isActive = false
    }
  }, [isAuthLoading, loadCampaigns, workspaceId])

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.is_active),
    [campaigns],
  )

  return useMemo(
    () => ({
      campaigns,
      activeCampaigns,
      isLoading: isAuthLoading || isLoading,
      error,
      refetch,
      createCampaign,
      updateCampaign,
      deleteCampaign,
    }),
    [
      activeCampaigns,
      campaigns,
      createCampaign,
      deleteCampaign,
      error,
      isAuthLoading,
      isLoading,
      refetch,
      updateCampaign,
    ],
  )
}
