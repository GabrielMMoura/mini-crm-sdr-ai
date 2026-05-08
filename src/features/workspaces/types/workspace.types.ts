export type Workspace = {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member'

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceMemberRole
  created_at: string
}

export type CurrentWorkspaceState = {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
}
