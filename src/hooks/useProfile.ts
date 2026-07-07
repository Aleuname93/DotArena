import { useCallback, useRef, useState } from 'react'
import { fetchMyStats, fetchLeaderboard, setLocalName, getLocalPlayer, type PlayerStats } from '../lib/playerStats'

export interface ProfileState {
  open: boolean
  myStats: PlayerStats | null
  leaderboard: PlayerStats[]
  loading: boolean
  myPlayer: { id: string; name: string }
  openProfile: () => void
  closeProfile: () => void
  changeName: (name: string) => void
  refresh: () => void
}

export function useProfile(): ProfileState {
  const [open, setOpen] = useState(false)
  const [myStats, setMyStats] = useState<PlayerStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(false)
  const [myPlayer, setMyPlayer] = useState(() => getLocalPlayer())
  const fetchedRef = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [stats, board] = await Promise.all([fetchMyStats(), fetchLeaderboard()])
    setMyStats(stats)
    setLeaderboard(board)
    setLoading(false)
  }, [])

  const openProfile = useCallback(() => {
    setOpen(true)
    if (!fetchedRef.current) {
      fetchedRef.current = true
      refresh()
    }
  }, [refresh])

  const closeProfile = useCallback(() => setOpen(false), [])

  const changeName = useCallback((name: string) => {
    setLocalName(name)
    setMyPlayer(getLocalPlayer())
  }, [])

  return { open, myStats, leaderboard, loading, myPlayer, openProfile, closeProfile, changeName, refresh }
}
