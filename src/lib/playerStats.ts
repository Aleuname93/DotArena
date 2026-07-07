import type { AuthUser } from '../hooks/useAuth'

const BASE = 'https://egpanvytcbdvlxueykju.supabase.co/functions/v1/make-server-9d32eba6'

export interface PlayerStats {
  playerId: string
  name: string
  wins: number
  losses: number
  draws: number
  lastSeen: string
}

export async function postResult(user: AuthUser, result: 'win' | 'loss' | 'draw'): Promise<PlayerStats | null> {
  try {
    const res = await fetch(`${BASE}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: user.id, name: user.name, result }),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchMyStats(user: AuthUser): Promise<PlayerStats | null> {
  try {
    const res = await fetch(`${BASE}/stats/${user.id}`)
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchLeaderboard(): Promise<PlayerStats[]> {
  try {
    const res = await fetch(`${BASE}/leaderboard`)
    return res.ok ? res.json() : []
  } catch { return [] }
}
