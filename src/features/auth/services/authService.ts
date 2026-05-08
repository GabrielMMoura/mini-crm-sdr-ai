import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../../../lib/supabase/client'

type SignInResult = {
  user: User | null
  session: Session | null
}

type SignUpResult = SignInResult

function getAuthErrorMessage(message: string) {
  return `Authentication error: ${message}`
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(getAuthErrorMessage(error.message))
  }

  return {
    user: data.user,
    session: data.session,
  }
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(getAuthErrorMessage(error.message))
  }

  return {
    user: data.user,
    session: data.session,
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(getAuthErrorMessage(error.message))
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(getAuthErrorMessage(error.message))
  }

  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(getAuthErrorMessage(error.message))
  }

  return data.user
}
