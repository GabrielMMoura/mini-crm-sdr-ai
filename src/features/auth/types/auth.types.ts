import type { Session, User } from '@supabase/supabase-js'

export type AuthUser = User
export type AuthSession = Session

export type AuthResponse<T> = {
  data: T
  error: null
}

export type AuthCredentials = {
  email: string
  password: string
}

export type SignUpCredentials = AuthCredentials & {
  fullName?: string
}

export type AuthContextValue = {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}
