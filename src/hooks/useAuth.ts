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
2. Novo AuthScreen (substitua o arquivo inteiro)
tsximport { useState, useEffect } from 'react'
import type { AuthState } from '../hooks/useAuth'

interface Props { auth: AuthState }

export default function AuthScreen({ auth }: Props) {
  const { step, error, sending, setDisplayName } = auth
  const [name, setName] = useState('')
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 2), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="crt min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              opacity: i % 3 === 0 ? 0.8 : 0.3,
              animation: `blink ${1 + (i % 3) * 0.5}s step-end ${i * 0.1}s infinite`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-[#00ff41] text-2xl font-pixel mb-1"
            style={{ textShadow: '3px 3px 0 #003a0f, 0 0 20px #00ff4188' }}>DOT</h1>
          <h1 className="text-[#ffdd00] text-2xl font-pixel"
            style={{ textShadow: '3px 3px 0 #3a3300, 0 0 20px #ffdd0088' }}>ARENA</h1>
        </div>

        <div className="w-full bg-black p-7"
          style={{ border: '4px solid #00ff41', boxShadow: '4px 4px 0 #003a0f, 0 0 30px #00ff4133' }}>

          {/* LOADING */}
          {step === 'loading' && (
            <p className="text-[#00ff41] text-[8px] font-pixel text-center py-6 pixel-blink">CARREGANDO...</p>
          )}

          {/* CHOOSE NAME */}
          {step === 'needs_name' && (
            <>
              <p className="text-[#ffdd00] text-[8px] font-pixel mb-1 text-center pixel-blink">★ BEM-VINDO! ★</p>
              <p className="text-white/30 text-[7px] font-pixel mb-6 text-center">ESCOLHA SEU NOME</p>

              <div className="relative mb-2" style={{ border: '2px solid #00ff41', boxShadow: '2px 2px 0 #003a0f' }}>
                <input
                  autoFocus maxLength={12} value={name}
                  onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && setDisplayName(name)}
                  placeholder="SEU_NOME"
                  className="w-full bg-black text-[#00ff41] font-pixel text-sm px-4 py-3 tracking-widest"
                  style={{ outline: 'none', caretColor: 'transparent' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ff41] font-pixel"
                  style={{ opacity: frame === 0 ? 1 : 0 }}>▮</span>
              </div>
              <p className="text-white/20 text-[6px] font-pixel mb-5 text-right">{name.length}/12</p>

              {error && <p className="text-[#ff3333] text-[7px] font-pixel mb-3 text-center">{error}</p>}

              <button onClick={() => name.trim() && setDisplayName(name)} disabled={!name.trim() || sending}
                className="w-full py-4 font-pixel text-[10px] tracking-wider transition-all hover:scale-[1.02] disabled:opacity-30"
                style={{ backgroundColor: '#00ff41', color: '#000', border: '2px solid #00ff41', boxShadow: '4px 4px 0 #003a0f' }}>
                {sending ? '...' : '▶ ENTRAR NA ARENA'}
              </button>
            </>
          )}
        </div>

        <p className="text-white/15 text-[6px] font-pixel">© 2024 DOT ARENA • INSERT COIN</p>
      </div>
    </div>
  )
}
