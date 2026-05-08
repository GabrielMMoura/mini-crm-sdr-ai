import { supabase } from '../../../lib/supabase/client'
import type { WorkspaceMemberRole } from '../types/workspace.types'
import type { WorkspaceMemberProfile, WorkspaceMemberWithProfile } from '../types/workspaceMember.types'

type WorkspaceMemberRow = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceMemberRole
  created_at: string
}

function buildEmptyProfile(userId: string): WorkspaceMemberProfile {
  return {
    id: userId,
    full_name: null,
    email: null,
  }
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .returns<WorkspaceMemberRow[]>()

  if (membersError) {
    throw new Error(`Could not load workspace members: ${membersError.message}`)
  }

  const memberRows = members ?? []
  const userIds = memberRows.map((member) => member.user_id)

  if (userIds.length === 0) {
    return []
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)
    .returns<WorkspaceMemberProfile[]>()

  if (profilesError) {
    throw new Error(`Could not load workspace member profiles: ${profilesError.message}`)
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return memberRows.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? buildEmptyProfile(member.user_id),
  }))
}
