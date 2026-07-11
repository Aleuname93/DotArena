import { useState, useEffect } from 'react'
import type { MatchStatus } from '../hooks/useMatchmaking'

interface LobbyProps {
  status: MatchStatus
  searchSeconds: number
  onFind: (gridSize: number) => void
  onCancel: () => void
  onOpenProfile?: () => void
  playerName?: string
  onSignOut?: () => void
}

export default function Lobby({ status, searchSeconds, onFind, onCancel, onOpenProfile, playerName, onSignOut }: LobbyProps) {
  const [gridSize, setGridSize] = useState(5)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 8), 300)
    return () => clearInterval(id)
  }, [])

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const BOT_TIMEOUT = 15
  const remaining = Math.max(0, BOT_TIMEOUT - searchSeconds)

  const logoPixels = [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [1,1,0,1,1],
    [0,1,0,1,0],
  ]

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
          <div className="flex gap-1 justify-center mb-5">
            {logoPixels.map((row, ri) => (
              <div key={ri} className="flex flex-col gap-1">
                {row.map((on, ci) => {
                  const isRed = (ri + ci) % 2 === 0
                  const color = isRed ? '#00ff41' : '#ffdd00'
                  const glow = isRed ? '#00ff4188' : '#ffdd0088'
                  return (
                    <div key={ci} className="w-3 h-3 transition-all duration-100"
                      style={{
                        backgroundColor: on ? color : 'transparent',
                        boxShadow: on && frame % 2 === 0 ? `0 0 6px ${glow}` : 'none',
                      }} />
                  )
                })}
              </div>
            ))}
          </div>

          <h1 className="text-[#00ff41] text-lg font-pixel leading-tight mb-1"
            style={{ textShadow: '2px 2px 0 #003a0f, 0 0 20px #00ff4188' }}>
            DOT
          </h1>
          <h1 className="text-[#ffdd00] text-lg font-pixel leading-tight"
            style={{ textShadow: '2px 2px 0 #3a3300, 0 0 20px #ffdd0088' }}>
            ARENA
          </h1>

          <p className="text-[#00ff41]/50 text-[7px] font-pixel mt-3 tracking-widest pixel-blink">
            ★ MULTIPLAYER ONLINE ★
          </p>
        </div>

        {onOpenProfile && (
          <button onClick={onOpenProfile}
            className="flex items-center gap-2 px-4 py-2 transition-all hover:scale-105 active:scale-95"
            style={{ border: '2px solid #00ff4160', boxShadow: '2px 2px 0 #003a0f' }}>
            <span className="text-[#00ff41] text-[9px] font-pixel">👾</span>
            <span className="text-[#00ff41] text-[8px] font-pixel">{playerName ?? 'PROFILE'}</span>
            <span className="text-[#00ff41]/40 text-[7px] font-pixel">▶</span>
          </button>
        )}

        <div className="w-full p-6 bg-black"
          style={{
            border: '4px solid #00ff41',
            boxShadow: '4px 4px 0 #003a0f, 0 0 30px #00ff4133',
          }}>
          {status === 'idle' && (
            <div className="space-y-6">
              <div>
                <p className="text-white/40 text-[8px] font-pixel mb-3">GRID SIZE:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 5, 6, 7].map((s) => (
                    <button key={s} onClick={() => setGridSize(s)}
                      className="py-2 text-[9px] font-pixel transition-all duration-75 hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: gridSize === s ? '#00ff41' : 'transparent',
                        color: gridSize === s ? '#000' : '#00ff41',
                        border: `2px solid ${gridSize === s ? '#00ff41' : '#00ff4160'}`,
                        boxShadow: gridSize === s ? '2px 2px 0 #003a0f' : 'none',
                      }}>
                      {s}x{s}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => onFind(gridSize)}
                className="w-full py-4 text-[11px] font-pixel transition-all duration-75 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: '#00ff41',
                  color: '#000',
                  border: '2px solid #00ff41',
                  boxShadow: '4px 4px 0 #003a0f',
                }}>
                ▶ PLAY NOW
              </button>

              <div className="text-center py-3" style={{ border: '2px solid #ffffff15' }}>
                <p className="text-white/30 text-[7px] font-pixel mb-2">VERSUS MODE</p>
                <div className="flex justify-around">
                  <div>
                    <p className="text-[#ff3333] text-[9px] font-pixel">P1</p>
                    <p className="text-white/30 text-[7px] font-pixel">YOU</p>
                  </div>
                  <p className="text-white/20 text-[9px] font-pixel self-center">VS</p>
                  <div>
                    <p className="text-[#3399ff] text-[9px] font-pixel">P2</p>
                    <p className="text-white/30 text-[7px] font-pixel">ONLINE</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'searching' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center gap-1 py-2">
                {Array.from({ length: 8 }, (_, i) => {
                  const active = frame % 8 === i || frame % 8 === (i + 1) % 8
                  const color = i % 2 === 0 ? '#00ff41' : '#ffdd00'
                  return (
                    <div key={i} className="w-3 h-5"
                      style={{
                        backgroundColor: color,
                        opacity: active ? 1 : 0.15,
                        boxShadow: active ? `0 0 8px ${color}` : 'none',
                      }} />
                  )
                })}
              </div>

              <div>
                <p className="text-white/60 text-[9px] font-pixel mb-2">SEARCHING...</p>
                <p className="text-[#ffdd00] text-base font-pixel"
                  style={{ textShadow: '2px 2px 0 #3a3300' }}>
                  {fmtTime(searchSeconds)}
                </p>
              </div>

              <div>
                <p className="text-white/30 text-[7px] font-pixel mb-2">
                  {remaining}S FOR BOT
                </p>
                <div className="w-full h-3 bg-[#111]" style={{ border: '2px solid #333' }}>
                  <div className="h-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (searchSeconds / BOT_TIMEOUT) * 100)}%`,
                      backgroundColor: remaining <= 5 ? '#ff3333' : '#00ff41',
                      boxShadow: remaining <= 5 ? '0 0 8px #ff3333' : '0 0 8px #00ff41',
                    }} />
                </div>
              </div>

              <button onClick={onCancel}
                className="w-full py-3 text-[9px] font-pixel transition-all hover:bg-[#ff333322]"
                style={{ border: '2px solid #ff333360', color: '#ff3333' }}>
                ✕ CANCEL
              </button>
            </div>
          )}

          {status === 'matched' && (
            <div className="text-center space-y-5 py-4">
              <p className="text-white text-[10px] font-pixel pixel-blink">
                !! OPPONENT FOUND !!
              </p>
              <div className="flex justify-center gap-2">
                {['P', '1', 'V', 'S', 'P', '2'].map((c, i) => {
                  const color = i < 2 ? '#00ff41' : i === 2 ? '#ffffff' : i === 3 ? '#ffffff' : '#ffdd00'
                  return (
                    <span key={i} className="text-[10px] font-pixel"
                      style={{
                        color,
                        opacity: frame % 6 === i ? 1 : 0.4,
                        textShadow: frame % 6 === i ? `0 0 10px ${color}` : 'none',
                      }}>
                      {c}
                    </span>
                  )
                })}
              </div>
              <p className="text-white/40 text-[7px] font-pixel pixel-blink">LOADING...</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <p className="text-white/15 text-[6px] font-pixel text-center">
            © 2026 DOT ARENA • INSERT COIN
          </p>
          {onSignOut && (
            <button onClick={onSignOut}
              className="text-white/20 text-[6px] font-pixel hover:text-[#ff3333] transition-colors">
              SIGN OUT
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
