import type { User } from '@supabase/supabase-js'
import type { ProfileState } from '../hooks/useProfile'
import { getPlayerFromUser } from '../lib/playerStats'

interface Props {
  profile: ProfileState
  user: User | null
}

export default function Profile({ profile, user }: Props) {
  const { open, myStats, leaderboard, loading, closeProfile, refresh } = profile

  if (!open || !user) return null

  const player = getPlayerFromUser(user)
  const totalGames = myStats ? myStats.wins + myStats.losses + myStats.draws : 0
  const winRate = totalGames > 0 ? Math.round((myStats!.wins / totalGames) * 100) : 0
  const myRank = leaderboard.findIndex(p => p.playerId === user.id) + 1

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={closeProfile}>
      <div className="w-full max-w-sm bg-black relative overflow-hidden"
        style={{ border: '4px solid #00ff41', boxShadow: '8px 8px 0 #003a0f, 0 0 40px #00ff4122' }}
        onClick={e => e.stopPropagation()}>

        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '2px solid #00ff4140' }}>
          <p className="text-[#00ff41] text-[9px] font-pixel">★ PERFIL</p>
          <button onClick={closeProfile}
            className="text-[#ff3333] text-[9px] font-pixel hover:bg-[#ff333322] px-2 py-1 transition-colors"
            style={{ border: '1px solid #ff333340' }}>✕</button>
        </div>

        <div className="relative p-5 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-[#00ff41] text-[10px] font-pixel"
              style={{ border: '3px solid #00ff41', boxShadow: '3px 3px 0 #003a0f', background: '#001a00' }}>
              {player.name.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#00ff41] text-[10px] font-pixel truncate">{player.name}</p>
              <p className="text-white/30 text-[6px] font-pixel mt-0.5 truncate">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          {loading && !myStats ? (
            <p className="text-[#00ff41]/50 text-[8px] font-pixel text-center py-4 pixel-blink">CARREGANDO...</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'VITÓRIAS', value: myStats?.wins ?? 0, color: '#00ff41' },
                  { label: 'DERROTAS', value: myStats?.losses ?? 0, color: '#ff3333' },
                  { label: 'EMPATES', value: myStats?.draws ?? 0, color: '#ffdd00' },
                  { label: 'WIN%', value: `${winRate}%`, color: '#3399ff' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center py-2 bg-[#001a00]"
                    style={{ border: `2px solid ${color}40` }}>
                    <p className="font-pixel text-base" style={{ color }}>{value}</p>
                    <p className="text-[5px] font-pixel text-white/30 mt-1 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {totalGames > 0 && (
                <div>
                  <div className="flex justify-between text-[6px] font-pixel text-white/30 mb-1">
                    <span>{totalGames} PARTIDAS</span>
                    {myRank > 0 && <span className="text-[#ffdd00]">#{myRank} NO RANKING</span>}
                  </div>
                  <div className="w-full h-2 bg-[#111]" style={{ border: '1px solid #333' }}>
                    <div className="flex h-full">
                      {myStats!.wins > 0 && <div style={{ width: `${(myStats!.wins / totalGames) * 100}%`, backgroundColor: '#00ff41' }} />}
                      {myStats!.draws > 0 && <div style={{ width: `${(myStats!.draws / totalGames) * 100}%`, backgroundColor: '#ffdd00' }} />}
                      {myStats!.losses > 0 && <div style={{ width: `${(myStats!.losses / totalGames) * 100}%`, backgroundColor: '#ff3333' }} />}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#ffdd00] text-[8px] font-pixel">★ RANKING GLOBAL</p>
              <button onClick={refresh} className="text-[6px] font-pixel text-white/30 hover:text-white/60 transition-colors">↺ ATUALIZAR</button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {leaderboard.length === 0 ? (
                <p className="text-white/20 text-[7px] font-pixel text-center py-3">
                  {totalGames === 0 ? 'JOGUE PARA APARECER AQUI' : 'SEM DADOS AINDA'}
                </p>
              ) : leaderboard.map((p, i) => {
                const isMe = p.playerId === user.id
                const rankColor = i === 0 ? '#ffdd00' : i === 1 ? '#aaaaaa' : i === 2 ? '#ff8800' : '#ffffff40'
                return (
                  <div key={p.playerId} className="flex items-center gap-3 px-3 py-2"
                    style={{ background: isMe ? '#002200' : 'transparent', border: isMe ? '1px solid #00ff4140' : '1px solid transparent' }}>
                    <span className="text-[8px] font-pixel w-5 text-right flex-shrink-0" style={{ color: rankColor }}>
                      {i === 0 ? '★' : `${i + 1}`}
                    </span>
                    <span className="text-[7px] font-pixel flex-1 truncate" style={{ color: isMe ? '#00ff41' : 'rgba(255,255,255,0.6)' }}>
                      {p.name}{isMe && <span className="text-[#00ff41]/50"> ◀</span>}
                    </span>
                    <span className="text-[7px] font-pixel text-[#00ff41] flex-shrink-0">{p.wins}W</span>
                    <span className="text-[7px] font-pixel text-[#ff3333] flex-shrink-0">{p.losses}L</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
