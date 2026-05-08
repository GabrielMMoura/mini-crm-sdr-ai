import type { WorkspaceMemberRole } from './workspace.types'

export type WorkspaceMemberProfile = {
  id: string
  full_name: string | null
  email: string | null
}

export type WorkspaceMemberWithProfile = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceMemberRole
  created_at: string
  profile: WorkspaceMemberProfile
}
