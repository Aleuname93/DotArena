// @refresh reset
// v3 — Supabase magic link auth with persistent session
import { useCallback, useEffect, useReducer } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthStep = 'loading' | 'unauthenticated' | 'link_sent' | 'needs_name' | 'authenticated'

interface State {
  step: AuthStep
  user: User | null
  error: string | null
  sending: boolean
}

type Action =
  | { type: 'LOADED'; user: User | null }
  | { type: 'SENDING' }
  | { type: 'LINK_SENT' }
  | { type: 'AUTHED'; user: User }
  | { type: 'NEEDS_NAME'; user: User }
  | { type: 'NAME_SET' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'SIGNED_OUT' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      if (!action.user) return { ...state, step: 'unauthenticated' }
      return { ...state, step: action.user.user_metadata?.display_name ? 'authenticated' : 'needs_name', user: action.user }
    case 'SENDING': return { ...state, sending: true, error: null }
    case 'LINK_SENT': return { ...state, step: 'link_sent', sending: false, error: null }
    case 'AUTHED': return { ...state, step: 'authenticated', user: action.user, error: null, sending: false }
    case 'NEEDS_NAME': return { ...state, step: 'needs_name', user: action.user, error: null, sending: false }
    case 'NAME_SET': return { ...state, step: 'authenticated' }
    case 'ERROR': return { ...state, error: action.error, sending: false }
    case 'RESET': return { ...state, step: 'unauthenticated', error: null, sending: false }
    case 'SIGNED_OUT': return { step: 'unauthenticated', user: null, error: null, sending: false }
    default: return state
  }
}

export interface AuthUser { id: string; name: string; email: string }

export interface AuthState {
  step: AuthStep
  user: AuthUser | null
  error: string | null
  sending: boolean
  sendLink: (email: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  signOut: () => Promise<void>
  resetToEmail: () => void
}

export function useAuth(): AuthState {
  const [state, dispatch] = useReducer(reducer, {
    step: 'loading', user: null, error: null, sending: false,
  })

  useEffect(() => {
    // Restore existing session on load
    supabase.auth.getSession().then(({ data }) => {
      dispatch({ type: 'LOADED', user: data.session?.user ?? null })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const hasName = !!session.user.user_metadata?.display_name
        dispatch({ type: hasName ? 'AUTHED' : 'NEEDS_NAME', user: session.user })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const sendLink = useCallback(async (email: string) => {
    dispatch({ type: 'SENDING' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.href,
      },
    })
    if (error) dispatch({ type: 'ERROR', error: `${error.message}` })
    else dispatch({ type: 'LINK_SENT' })
  }, [])

  const setDisplayName = useCallback(async (name: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.toUpperCase().slice(0, 12) },
    })
    if (!error) dispatch({ type: 'NAME_SET' })
    else dispatch({ type: 'ERROR', error: error.message })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SIGNED_OUT' })
  }, [])

  const resetToEmail = useCallback(() => dispatch({ type: 'RESET' }), [])

  const rawUser = state.user
  const user: AuthUser | null = rawUser && rawUser.user_metadata?.display_name
    ? { id: rawUser.id, name: rawUser.user_metadata.display_name as string, email: rawUser.email ?? '' }
    : null

  return { step: state.step, user, error: state.error, sending: state.sending, sendLink, setDisplayName, signOut, resetToEmail }
}
