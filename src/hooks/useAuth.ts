// @refresh reset
import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthStep = 'loading' | 'unauthenticated' | 'otp_sent' | 'authenticated' | 'needs_name'

interface State {
  step: AuthStep
  user: User | null
  email: string
  error: string | null
  sending: boolean
}

type Action =
  | { type: 'LOADED'; user: User | null }
  | { type: 'SENDING' }
  | { type: 'OTP_SENT'; email: string }
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
      const hasName = !!action.user.user_metadata?.display_name
      return { ...state, step: hasName ? 'authenticated' : 'needs_name', user: action.user }
    case 'SENDING':
      return { ...state, sending: true, error: null }
    case 'OTP_SENT':
      return { ...state, step: 'otp_sent', email: action.email, sending: false, error: null }
    case 'AUTHED':
      return { ...state, step: 'authenticated', user: action.user, error: null }
    case 'NEEDS_NAME':
      return { ...state, step: 'needs_name', user: action.user, error: null }
    case 'NAME_SET':
      return { ...state, step: 'authenticated' }
    case 'ERROR':
      return { ...state, error: action.error, sending: false }
    case 'RESET':
      return { ...state, step: 'unauthenticated', error: null, email: '', sending: false }
    case 'SIGNED_OUT':
      return { step: 'unauthenticated', user: null, email: '', error: null, sending: false }
    default:
      return state
  }
}

const INIT: State = { step: 'loading', user: null, email: '', error: null, sending: false }

export interface AuthState {
  step: AuthStep
  user: User | null
  error: string | null
  sending: boolean
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (token: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  signOut: () => Promise<void>
  resetToEmail: () => void
}

export function useAuth(): AuthState {
  const [state, dispatch] = useReducer(reducer, INIT)
  const emailRef = useRef('')

  useEffect(() => {
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

  const sendOtp = useCallback(async (email: string) => {
    dispatch({ type: 'SENDING' })
    emailRef.current = email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
    if (error) dispatch({ type: 'ERROR', error: 'Erro ao enviar link. Verifique o email.' })
    else dispatch({ type: 'OTP_SENT', email })
  }, [])

  const verifyOtp = useCallback(async (token: string) => {
    dispatch({ type: 'SENDING' })
    const { data, error } = await supabase.auth.verifyOtp({
      email: emailRef.current || state.email,
      token,
      type: 'email',
    })
    if (error) dispatch({ type: 'ERROR', error: 'Código inválido ou expirado.' })
    else if (data.user) {
      const hasName = !!data.user.user_metadata?.display_name
      dispatch({ type: hasName ? 'AUTHED' : 'NEEDS_NAME', user: data.user })
    }
  }, [state.email])

  const setDisplayName = useCallback(async (name: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.toUpperCase().slice(0, 12) },
    })
    if (!error) dispatch({ type: 'NAME_SET' })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SIGNED_OUT' })
  }, [])

  const resetToEmail = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { step: state.step, user: state.user, error: state.error, sending: state.sending, sendOtp, verifyOtp, setDisplayName, signOut, resetToEmail }
}
