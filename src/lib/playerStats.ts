const BASE = 'https://egpanvytcbdvlxueykju.supabase.co/functions/v1/make-server-9d32eba6'

export interface PlayerStats {
  playerId: string
  name: string
  wins: number
  losses: number
  draws: number
  lastSeen: string
}

// Persistent player ID + name stored in localStorage
export function getLocalPlayer(): { id: string; name: string } {
  let id = localStorage.getItem('dot_arena_id')
  if (!id) {
    id = Math.random().toString(36).slice(2, 8).toUpperCase()
    localStorage.setItem('dot_arena_id', id)
  }
  let name = localStorage.getItem('dot_arena_name')
  if (!name) {
    const adjectives = ['FAST', 'SHARP', 'BOLD', 'DARK', 'GRIM', 'IRON', 'VOID', 'NEON']
    const nouns = ['PIXEL', 'BLADE', 'STORM', 'GHOST', 'LASER', 'CYBER', 'ROGUE', 'TITAN']
    name = adjectives[Math.floor(Math.random() * adjectives.length)] + '_' + nouns[Math.floor(Math.random() * nouns.length)]
    localStorage.setItem('dot_arena_name', name)
  }
  return { id, name }
}

export function setLocalName(name: string) {
  localStorage.setItem('dot_arena_name', name.toUpperCase().slice(0, 12))
}

export async function postResult(result: 'win' | 'loss' | 'draw'): Promise<PlayerStats | null> {
  try {
    const { id, name } = getLocalPlayer()
    const res = await fetch(`${BASE}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: id, name, result }),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchMyStats(): Promise<PlayerStats | null> {
  try {
    const { id } = getLocalPlayer()
    const res = await fetch(`${BASE}/stats/${id}`)
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchLeaderboard(): Promise<PlayerStats[]> {
  try {
    const res = await fetch(`${BASE}/leaderboard`)
    return res.ok ? res.json() : []
  } catch { return [] }
}
