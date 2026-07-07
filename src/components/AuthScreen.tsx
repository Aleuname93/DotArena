import { useState, useEffect } from 'react'
import type { AuthState } from '../hooks/useAuth'

interface Props { auth: AuthState }

export default function AuthScreen({ auth }: Props) {
  const { step, error, sending, sendLink, setDisplayName, resetToEmail } = auth
  const [email, setEmail] = useState('')
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

          {/* EMAIL */}
          {(step === 'unauthenticated') && (
            <>
              <p className="text-[#ffdd00] text-[8px] font-pixel mb-1 text-center pixel-blink">★ ENTRAR ★</p>
              <p className="text-white/30 text-[7px] font-pixel mb-6 text-center">SEU EMAIL</p>

              <div className="relative mb-4" style={{ border: '2px solid #00ff41', boxShadow: '2px 2px 0 #003a0f' }}>
                <input
                  autoFocus type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email && sendLink(email)}
                  placeholder="jogador@email.com"
                  className="w-full bg-black text-[#00ff41] font-pixel text-[9px] px-4 py-3 tracking-wide"
                  style={{ outline: 'none', caretColor: '#00ff41' }}
                />
              </div>

              {error && (
                <p className="text-[#ff3333] text-[7px] font-pixel mb-3 text-center leading-relaxed">{error}</p>
              )}

              <button onClick={() => email && sendLink(email)} disabled={!email || sending}
                className="w-full py-4 font-pixel text-[10px] tracking-wider transition-all hover:scale-[1.02] disabled:opacity-30"
                style={{ backgroundColor: '#00ff41', color: '#000', border: '2px solid #00ff41', boxShadow: '4px 4px 0 #003a0f' }}>
                {sending ? 'ENVIANDO...' : '▶ ENVIAR LINK'}
              </button>
            </>
          )}

          {/* LINK SENT */}
          {step === 'link_sent' && (
            <>
              <p className="text-[#ffdd00] text-[8px] font-pixel mb-1 text-center pixel-blink">★ LINK ENVIADO! ★</p>

              <div className="flex justify-center py-5">
                <div className="text-5xl" style={{ animation: 'blink 2s step-end infinite' }}>📨</div>
              </div>

              <p className="text-white/50 text-[7px] font-pixel mb-2 text-center leading-relaxed">
                ABRA SEU EMAIL E CLIQUE NO LINK
              </p>
              <p className="text-[#00ff41]/40 text-[6px] font-pixel mb-5 text-center leading-relaxed">
                APÓS CLICAR, VOLTE PARA ESTA ABA — VOCÊ ENTRARÁ AUTOMATICAMENTE
              </p>

              <div className="flex justify-center gap-1 mb-5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-[#00ff41] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>

              <button onClick={resetToEmail}
                className="w-full py-3 font-pixel text-[7px] text-white/30 hover:text-white/60 transition-colors"
                style={{ border: '1px solid #ffffff15' }}>
                ← USAR OUTRO EMAIL
              </button>
            </>
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
