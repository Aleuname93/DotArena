import { useEffect, useRef } from 'react'

const TRACKS = {
  lobby: '/audio/lobby.mp3',
  game: '/audio/game.mp3',
} as const

type TrackName = keyof typeof TRACKS | null

export function useBackgroundMusic(track: TrackName, volume = 0.5) {
  const audiosRef = useRef<Partial<Record<keyof typeof TRACKS, HTMLAudioElement>>>({})
  const unlockedRef = useRef(false)

  useEffect(() => {
    for (const key of Object.keys(TRACKS) as (keyof typeof TRACKS)[]) {
      const audio = new Audio(TRACKS[key])
      audio.loop = true
      audio.volume = volume
      audiosRef.current[key] = audio
    }
    return () => {
      for (const audio of Object.values(audiosRef.current)) audio?.pause()
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (unlockedRef.current) return
    const unlock = () => {
      unlockedRef.current = true
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
      if (track) audiosRef.current[track]?.play().catch(() => {})
    }
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [track])

  useEffect(() => {
    for (const [key, audio] of Object.entries(audiosRef.current) as [keyof typeof TRACKS, HTMLAudioElement][]) {
      if (key === track) {
        if (audio.paused) audio.play().catch(() => {})
      } else {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [track])
}
