// @refresh reset
// v4 — Anonymous auth by default, optional Google link to save progress
import { useCallback, useEffect, useReducer } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthStep = 'loading' | 'needs_name' | 'authenticated'

interface State {
  step: AuthStep
  user: User | null
  error: string | null
  sending: boolean
}

type Action =
  | { type: 'LOADED'; user: User | null }
  | { type: 'SENDING' }
  | { type: 'AUTHED'; user: User }
  | { type: 'NEEDS_NAME'; user: User }
  | { type: 'NAME_SET' }
  | { type: 'ERROR'; error: string }
  | { type: 'SIGNED_OUT' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      if (!action.user) return { ...state, step: 'loading' }
      return { ...state, step: action.user.user_metadata?.display_name ? 'authenticated' : 'needs_name', user: action.user }
    case 'SENDING': return { ...state, sending: true, error: null }
    case 'AUTHED': return { ...state, step: 'authenticated', user: action.user, error: null, sending: false }
    case 'NEEDS_NAME': return { ...state, step: 'needs_name', user: action.user, error: null, sending: false }
    case 'NAME_SET': return { ...state, step: 'authenticated' }
    case 'ERROR': return { ...state, error: action.error, sending: false }
    case 'SIGNED_OUT': return { step: 'loading', user: null, error: null, sending: false }
    default: return state
  }
}

export interface AuthUser { id: string; name: string; email: string; isAnonymous: boolean }

export interface AuthState {
  step: AuthStep
  user: AuthUser | null
  error: string | null
  sending: boolean
  setDisplayName: (name: string) => Promise<void>
  linkGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [state, dispatch] = useReducer(reducer, {
    step: 'loading', user: null, error: null, sending: false,
  })

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      let user = data.session?.user ?? null

      // Sem sessão? Cria uma sessão anônima automaticamente, sem pedir nada ao jogador.
      if (!user) {
        const { data: anonData, error } = await supabase.auth.signInAnonymously()
        if (error) {
          if (mounted) dispatch({ type: 'ERROR', error: error.message })
          return
        }
        user = anonData.user
      }

      if (mounted) dispatch({ type: 'LOADED', user })
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const hasName = !!session.user.user_metadata?.display_name
        dispatch({ type: hasName ? 'AUTHED' : 'NEEDS_NAME', user: session.user })
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const setDisplayName = useCallback(async (name: string) => {
    dispatch({ type: 'SENDING' })
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.toUpperCase().slice(0, 12) },
    })
    if (!error) dispatch({ type: 'NAME_SET' })
    else dispatch({ type: 'ERROR', error: error.message })
  }, [])

  // Vincula a conta anônima atual a uma conta Google real (opcional, "salva" o progresso).
  const linkGoogle = useCallback(async () => {
    dispatch({ type: 'SENDING' })
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    if (error) dispatch({ type: 'ERROR', error: error.message })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SIGNED_OUT' })
  }, [])

  const rawUser = state.user
  const user: AuthUser | null = rawUser && rawUser.user_metadata?.display_name
    ? {
        id: rawUser.id,
        name: rawUser.user_metadata.display_name as string,
        email: rawUser.email ?? '',
        isAnonymous: rawUser.is_anonymous ?? !rawUser.email,
      }
    : null

  return { step: state.step, user, error: state.error, sending: state.sending, setDisplayName, linkGoogle, signOut }
}

