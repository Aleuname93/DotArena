import type { User } from '@supabase/supabase-js'

const BASE = 'https://egpanvytcbdvlxueykju.supabase.co/functions/v1/make-server-9d32eba6'

export interface PlayerStats {
  playerId: string
  name: string
  wins: number
  losses: number
  draws: number
  lastSeen: string
}

export function getPlayerFromUser(user: User): { id: string; name: string } {
  return {
    id: user.id,
    name: (user.user_metadata?.display_name as string) ?? user.email?.split('@')[0].toUpperCase() ?? 'PLAYER',
  }
}

export async function postResult(user: User, result: 'win' | 'loss' | 'draw'): Promise<PlayerStats | null> {
  try {
    const { id, name } = getPlayerFromUser(user)
    const res = await fetch(`${BASE}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: id, name, result }),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchMyStats(user: User): Promise<PlayerStats | null> {
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
