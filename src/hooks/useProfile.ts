import { useCallback, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { fetchMyStats, fetchLeaderboard, getPlayerFromUser, type PlayerStats } from '../lib/playerStats'

export interface ProfileState {
  open: boolean
  myStats: PlayerStats | null
  leaderboard: PlayerStats[]
  loading: boolean
  openProfile: () => void
  closeProfile: () => void
  refresh: () => void
}

export function useProfile(user: User | null): ProfileState {
  const [open, setOpen] = useState(false)
  const [myStats, setMyStats] = useState<PlayerStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [stats, board] = await Promise.all([fetchMyStats(user), fetchLeaderboard()])
    setMyStats(stats)
    setLeaderboard(board)
    setLoading(false)
  }, [user])

  const openProfile = useCallback(() => {
    setOpen(true)
    if (!fetchedRef.current) {
      fetchedRef.current = true
      refresh()
    }
  }, [refresh])

  const closeProfile = useCallback(() => setOpen(false), [])

  return { open, myStats, leaderboard, loading, openProfile, closeProfile, refresh }
}
