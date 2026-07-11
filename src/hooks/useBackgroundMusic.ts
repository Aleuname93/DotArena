import { useEffect, useRef, useState, useCallback } from 'react'

const TRACKS = {
  lobby: '/audio/lobby.mp3',
  game: '/audio/game.mp3',
} as const

type TrackName = keyof typeof TRACKS | null

export function useBackgroundMusic(track: TrackName, volume = 0.5) {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const buffersRef = useRef<Partial<Record<keyof typeof TRACKS, AudioBuffer>>>({})
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeTrackRef = useRef<TrackName>(null)
  const wantedTrackRef = useRef<TrackName>(track)
  const unlockedRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)

  const playTrack = useCallback((name: TrackName) => {
    const ctx = ctxRef.current
    const gain = gainRef.current
    if (!ctx || !gain) return

    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch { /* ja parado */ }
      sourceRef.current = null
    }

    if (!name) {
      activeTrackRef.current = null
      return
    }

    const buffer = buffersRef.current[name]
    if (!buffer) {
      // ainda carregando: nao marca como ativo, assim o loader toca assim que chegar
      activeTrackRef.current = null
      return
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    source.start(0)
    sourceRef.current = source
    activeTrackRef.current = name
  }, [])

  useEffect(() => {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctor()
    ctxRef.current = ctx
    const gain = ctx.createGain()
    gain.gain.value = mutedRef.current ? 0 : volume
    gain.connect(ctx.destination)
    gainRef.current = gain

    let cancelled = false
    ;(async () => {
      for (const key of Object.keys(TRACKS) as (keyof typeof TRACKS)[]) {
        try {
          const res = await fetch(TRACKS[key])
          const arr = await res.arrayBuffer()
          const buf = await ctx.decodeAudioData(arr)
          if (cancelled) return
          buffersRef.current[key] = buf
          if (unlockedRef.current && wantedTrackRef.current === key && !sourceRef.current) {
            playTrack(key)
          }
        } catch { /* ignora falha ao carregar uma faixa */ }
      }
    })()

    return () => {
      cancelled = true
      sourceRef.current?.stop()
      ctx.close()
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return
      unlockedRef.current = true
      ctxRef.current?.resume()
      playTrack(wantedTrackRef.current)
    }
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [playTrack])

  useEffect(() => {
    wantedTrackRef.current = track
    if (unlockedRef.current) playTrack(track)
  }, [track, playTrack])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m
      mutedRef.current = next
      if (gainRef.current) gainRef.current.gain.value = next ? 0 : volume
      return next
    })
  }, [volume])

  return { muted, toggleMute }
}
