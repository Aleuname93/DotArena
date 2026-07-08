import type { AuthUser } from '../hooks/useAuth'
import { supabase } from './supabase'

const BASE = 'https://egpanvytcbdvlxueykju.supabase.co/functions/v1/server'

export interface PlayerStats {
  playerId: string
  name: string
  wins: number
  losses: number
  draws: number
  lastSeen: string
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function postResult(user: AuthUser, result: 'win' | 'loss' | 'draw'): Promise<PlayerStats | null> {
  try {
    const res = await fetch(`${BASE}/stats`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ playerId: user.id, name: user.name, result }),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchMyStats(user: AuthUser): Promise<PlayerStats | null> {
  try {
    const res = await fetch(`${BASE}/stats/${user.id}`, {
      headers: await authHeaders(),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function fetchLeaderboard(): Promise<PlayerStats[]> {
  try {
    const res = await fetch(`${BASE}/leaderboard`, {
      headers: await authHeaders(),
    })
    return res.ok ? res.json() : []
  } catch { return [] }
}
