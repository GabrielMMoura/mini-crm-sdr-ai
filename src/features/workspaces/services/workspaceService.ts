import { supabase } from '../../../lib/supabase/client'
import type { Workspace } from '../types/workspace.types'

type WorkspaceMemberWithWorkspace = {
  workspace: Workspace | Workspace[] | null
}

function normalizeWorkspace(workspace: Workspace | Workspace[] | null) {
  if (Array.isArray(workspace)) {
    return workspace[0] ?? null
  }

  return workspace
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      `
        workspace:workspaces (
          id,
          name,
          owner_id,
          created_at,
          updated_at
        )
      `,
    )
    .eq('user_id', userId)
    .returns<WorkspaceMemberWithWorkspace[]>()

  if (error) {
    throw new Error(`Could not load user workspaces: ${error.message}`)
  }

  return (data ?? [])
    .map((membership) => normalizeWorkspace(membership.workspace))
    .filter((workspace): workspace is Workspace => workspace !== null)
}
