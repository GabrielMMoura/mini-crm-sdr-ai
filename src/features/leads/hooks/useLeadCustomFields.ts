import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createLeadCustomField as createLeadCustomFieldWithSupabase,
  deleteLeadCustomField as deleteLeadCustomFieldWithSupabase,
  getLeadCustomFieldsByWorkspace,
  updateLeadCustomField as updateLeadCustomFieldWithSupabase,
} from '../services/leadCustomFieldService'
import type {
  CreateLeadCustomFieldInput,
  LeadCustomField,
  UpdateLeadCustomFieldInput,
} from '../types/leadCustomField.types'

type UseLeadCustomFieldsOptions = {
  includeInactive?: boolean
}

export function useLeadCustomFields(workspaceId?: string, options: UseLeadCustomFieldsOptions = {}) {
  const includeInactive = options.includeInactive ?? false
  const [fields, setFields] = useState<LeadCustomField[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWorkspaceIdRef = useRef<string | null>(null)
  const loadingWorkspaceIdRef = useRef<string | null>(null)

  const loadFields = useCallback(async (targetWorkspaceId: string, force = false) => {
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
      const nextFields = await getLeadCustomFieldsByWorkspace(targetWorkspaceId, { includeInactive })
      setFields(nextFields)
      loadedWorkspaceIdRef.current = targetWorkspaceId
    } catch (loadError) {
      setFields([])
      loadedWorkspaceIdRef.current = null
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar os campos personalizados.',
      )
    } finally {
      loadingWorkspaceIdRef.current = null
      setIsLoading(false)
    }
  }, [includeInactive])

  const refetch = useCallback(async () => {
    if (!workspaceId) {
      return
    }

    await loadFields(workspaceId, true)
  }, [loadFields, workspaceId])

  const createField = useCallback(
    async (input: CreateLeadCustomFieldInput) => {
      const createdField = await createLeadCustomFieldWithSupabase(input)
      await refetch()
      return createdField
    },
    [refetch],
  )

  const updateField = useCallback(
    async (fieldId: string, input: UpdateLeadCustomFieldInput) => {
      const updatedField = await updateLeadCustomFieldWithSupabase(fieldId, input)
      await refetch()
      return updatedField
    },
    [refetch],
  )

  const deleteField = useCallback(
    async (fieldId: string) => {
      const wasDeleted = await deleteLeadCustomFieldWithSupabase(fieldId)
      await refetch()
      return wasDeleted
    },
    [refetch],
  )

  useEffect(() => {
    let isActive = true

    async function syncFields() {
      if (!workspaceId) {
        if (!isActive) {
          return
        }

        setFields([])
        setError(null)
        setIsLoading(false)
        loadedWorkspaceIdRef.current = null
        loadingWorkspaceIdRef.current = null
        return
      }

      if (isActive) {
        await loadFields(workspaceId)
      }
    }

    void syncFields()

    return () => {
      isActive = false
    }
  }, [loadFields, workspaceId])

  return useMemo(
    () => ({
      fields,
      isLoading,
      error,
      refetch,
      createField,
      updateField,
      deleteField,
    }),
    [createField, deleteField, error, fields, isLoading, refetch, updateField],
  )
}
