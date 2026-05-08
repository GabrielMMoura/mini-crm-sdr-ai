import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase/client'
import { AuthContext } from './authContext'
import {
  signInWithEmail,
  signOut as signOutWithSupabase,
  signUpWithEmail,
} from './services/authService'
import type { AuthContextValue } from './types/auth.types'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadInitialSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setSession(null)
        setUser(null)
        setIsLoading(false)
        console.error(`Authentication error: ${error.message}`)
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }

    void loadInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const nextAuthState = await signInWithEmail(email, password)

    setSession(nextAuthState.session)
    setUser(nextAuthState.user)
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const nextAuthState = await signUpWithEmail(email, password, fullName)

    setSession(nextAuthState.session)
    setUser(nextAuthState.user)
  }, [])

  const signOut = useCallback(async () => {
    await signOutWithSupabase()
    setSession(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, session, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
