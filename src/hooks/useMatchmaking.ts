// @refresh reset
import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { createGame, applyMove, type GameState, type Move, type Player } from '../game/logic'
import { getBotMove } from '../game/bot'

export type MatchStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'playing'
  | 'playing_bot'
  | 'opponent_left'

interface State {
  status: MatchStatus
  myPlayer: Player | null
  game: GameState
  searchSeconds: number
  lastOpponentMove: Move | null
  lastMoveKey: number
}

type Action =
  | { type: 'SEARCHING'; gridSize: number }
  | { type: 'TICK' }
  | { type: 'MATCHED'; asPlayer: Player; gridSize: number }
  | { type: 'PLAYING' }
  | { type: 'START_BOT'; gridSize: number }
  | { type: 'OPP_MOVE'; move: Move; opponent: Player }
  | { type: 'MY_MOVE'; move: Move }
  | { type: 'BOT_MOVE'; move: Move }
  | { type: 'RESTART'; gridSize: number }
  | { type: 'OPPONENT_LEFT' }
  | { type: 'IDLE'; gridSize: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SEARCHING':
      return { ...state, status: 'searching', myPlayer: null, searchSeconds: 0, lastOpponentMove: null, lastMoveKey: 0, game: createGame(action.gridSize) }
    case 'TICK':
      return { ...state, searchSeconds: state.searchSeconds + 1 }
    case 'MATCHED':
      return { ...state, status: 'matched', myPlayer: action.asPlayer, game: createGame(action.gridSize), lastOpponentMove: null, lastMoveKey: 0 }
    case 'PLAYING':
      return { ...state, status: 'playing' }
    case 'START_BOT':
      return { ...state, status: 'playing_bot', myPlayer: 1, game: createGame(action.gridSize), lastOpponentMove: null, lastMoveKey: 0 }
    case 'OPP_MOVE': {
      const next = applyMove(state.game, action.move, action.opponent)
      return { ...state, game: next, lastOpponentMove: action.move, lastMoveKey: state.lastMoveKey + 1 }
    }
    case 'MY_MOVE': {
      if (!state.myPlayer || state.game.finished || state.game.currentPlayer !== state.myPlayer) return state
      return { ...state, game: applyMove(state.game, action.move, state.myPlayer) }
    }
    case 'BOT_MOVE': {
      if (state.game.finished || state.game.currentPlayer !== 2) return state
      const next = applyMove(state.game, action.move, 2)
      return { ...state, game: next, lastOpponentMove: action.move, lastMoveKey: state.lastMoveKey + 1 }
    }
    case 'RESTART':
      return { ...state, game: createGame(action.gridSize), lastOpponentMove: null, lastMoveKey: 0 }
    case 'OPPONENT_LEFT':
      return { ...state, status: 'opponent_left' }
    case 'IDLE':
      return { ...state, status: 'idle', myPlayer: null, searchSeconds: 0, lastOpponentMove: null, lastMoveKey: 0, game: createGame(action.gridSize) }
    default:
      return state
  }
}

const INIT: State = {
  status: 'idle',
  myPlayer: null,
  game: createGame(5),
  searchSeconds: 0,
  lastOpponentMove: null,
  lastMoveKey: 0,
}

export interface MatchState {
  status: MatchStatus
  myPlayer: Player | null
  game: GameState
  isMyTurn: boolean
  searchSeconds: number
  lastOpponentMove: Move | null
  lastMoveKey: number
  findMatch: (gridSize?: number) => void
  cancelSearch: () => void
  sendMove: (move: Move) => void
  sendRestart: () => void
  leaveGame: () => void
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const BOT_TIMEOUT_SEC = 15
const POLL_INTERVAL_MS = 1200
const STALE_SECONDS = 25

export function useMatchmaking(): MatchState {
  const [state, dispatch] = useReducer(reducer, INIT)
  const myId = useRef(makeId())
  const gridSizeRef = useRef(5)
  const gameChannelRef = useRef<RealtimeChannel | null>(null)
  const statusRef = useRef<MatchStatus>('idle')
  statusRef.current = state.status

  const timersRef = useRef<{
    search: ReturnType<typeof setInterval> | null
    bot: ReturnType<typeof setTimeout> | null
    poll: ReturnType<typeof setInterval> | null
    botMove: ReturnType<typeof setTimeout> | null
  }>({ search: null, bot: null, poll: null, botMove: null })

  const { status, myPlayer, game, searchSeconds, lastOpponentMove, lastMoveKey } = state

  const isMyTurn =
    myPlayer !== null &&
    game.currentPlayer === myPlayer &&
    !game.finished &&
    status !== 'opponent_left'

  const clearTimers = useCallback(() => {
    const t = timersRef.current
    if (t.search) { clearInterval(t.search); t.search = null }
    if (t.bot) { clearTimeout(t.bot); t.bot = null }
    if (t.poll) { clearInterval(t.poll); t.poll = null }
    if (t.botMove) { clearTimeout(t.botMove); t.botMove = null }
  }, [])

  const removeFromQueue = useCallback(async () => {
    try {
      await supabase.from('matchmaking_queue').delete().eq('player_id', myId.current)
    } catch { /* ignore */ }
  }, [])

  const cleanup = useCallback(() => {
    clearTimers()
    gameChannelRef.current?.unsubscribe()
    gameChannelRef.current = null
    removeFromQueue()
  }, [clearTimers, removeFromQueue])

  const gameRef = useRef(game)
  gameRef.current = game

  const triggerBotMove = useCallback(() => {
    const t = timersRef.current
    if (t.botMove) { clearTimeout(t.botMove); t.botMove = null }
    t.botMove = setTimeout(() => {
      const current = gameRef.current
      if (current.finished || current.currentPlayer !== 2) return
      const move = getBotMove(current)
      if (!move) return
      dispatch({ type: 'BOT_MOVE', move })
      const next = applyMove(current, move, 2)
      if (!next.finished && next.currentPlayer === 2) {
        triggerBotMove()
      }
    }, 600 + Math.random() * 400)
  }, [])

  useEffect(() => {
    if (status === 'playing_bot' && !game.finished && game.currentPlayer === 2) {
      triggerBotMove()
    }
  }, [status, game.currentPlayer, game.finished, triggerBotMove])

  const joinGameChannel = useCallback((roomId: string, asPlayer: Player, gs: number) => {
    console.log('[MATCHMAKING] Entrando na sala', roomId, 'como Player', asPlayer)
    dispatch({ type: 'MATCHED', asPlayer, gridSize: gs })

    const ch = supabase.channel(`game:${roomId}`, {
      config: { broadcast: { self: false } },
    })

    ch.on('broadcast', { event: 'move' }, ({ payload }: { payload: { move?: Move } }) => {
      if (!payload.move) return
      const opponent: Player = asPlayer === 1 ? 2 : 1
      dispatch({ type: 'OPP_MOVE', move: payload.move, opponent })
    })

    ch.on('broadcast', { event: 'restart' }, () => {
      dispatch({ type: 'RESTART', gridSize: gs })
    })

    ch.on('broadcast', { event: 'leave' }, () => {
      dispatch({ type: 'OPPONENT_LEFT' })
    })

    ch.subscribe(() => dispatch({ type: 'PLAYING' }))
    gameChannelRef.current = ch
  }, [])

  const pollForMatch = useCallback(async (gridSize: number) => {
    if (statusRef.current !== 'searching') return

    // 1. Será que alguém já me encontrou e preencheu minha sala?
    const { data: mine } = await supabase
      .from('matchmaking_queue')
      .select('room_id')
      .eq('player_id', myId.current)
      .maybeSingle()

    if (mine?.room_id) {
      const ids = mine.room_id.split('_')
      const asPlayer: Player = ids[0] === myId.current ? 1 : 2
      console.log('[MATCHMAKING] Fui encontrado! Sala:', mine.room_id, 'Player', asPlayer)
      clearTimers()
      await removeFromQueue()
      joinGameChannel(mine.room_id, asPlayer, gridSize)
      return
    }

    // 2. Procura alguém esperando o mesmo tamanho de tabuleiro
    const staleBefore = new Date(Date.now() - STALE_SECONDS * 1000).toISOString()
    const { data: candidates } = await supabase
      .from('matchmaking_queue')
      .select('player_id, created_at')
      .eq('grid_size', gridSize)
      .is('room_id', null)
      .neq('player_id', myId.current)
      .gt('created_at', staleBefore)
      .order('created_at', { ascending: true })
      .limit(1)

    const candidate = candidates?.[0]
    if (!candidate) return

    const roomId = [myId.current, candidate.player_id].sort().join('_')
    console.log('[MATCHMAKING] Candidato encontrado:', candidate.player_id, '— tentando sala', roomId)

    // 3. Tenta "reservar" as duas linhas com esse roomId (só se ainda estiverem livres)
    const { data: myClaim } = await supabase
      .from('matchmaking_queue')
      .update({ room_id: roomId })
      .eq('player_id', myId.current)
      .is('room_id', null)
      .select()

    if (!myClaim || myClaim.length === 0) return // alguém mexeu na minha linha, tenta de novo no próximo tick

    const { data: theirClaim } = await supabase
      .from('matchmaking_queue')
      .update({ room_id: roomId })
      .eq('player_id', candidate.player_id)
      .is('room_id', null)
      .select()

    if (!theirClaim || theirClaim.length === 0) {
      // Candidato foi pego por outra pessoa entre a leitura e a escrita — libera minha linha e tenta de novo
      await supabase.from('matchmaking_queue').update({ room_id: null }).eq('player_id', myId.current)
      return
    }

    console.log('[MATCHMAKING] Match confirmado! Sala:', roomId)
    const asPlayer: Player = myId.current === [myId.current, candidate.player_id].sort()[0] ? 1 : 2
    clearTimers()
    joinGameChannel(roomId, asPlayer, gridSize)
  }, [clearTimers, removeFromQueue, joinGameChannel])

  const findMatch = useCallback((gridSize = 5) => {
    if (statusRef.current === 'searching' || statusRef.current === 'matched' || statusRef.current === 'playing' || statusRef.current === 'playing_bot') {
      console.log('[MATCHMAKING] Ignorado — já está em busca ou partida')
      return
    }

    console.log('[MATCHMAKING] Meu ID:', myId.current, '— procurando tabuleiro', gridSize)
    gridSizeRef.current = gridSize
    clearTimers()
    dispatch({ type: 'SEARCHING', gridSize })

    supabase.from('matchmaking_queue').upsert({
      player_id: myId.current,
      grid_size: gridSize,
      room_id: null,
      created_at: new Date().toISOString(),
    }).then(() => {
      console.log('[MATCHMAKING] Entrei na fila')
    })

    const t = timersRef.current
    t.search = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    t.poll = setInterval(() => pollForMatch(gridSize), POLL_INTERVAL_MS)

    t.bot = setTimeout(() => {
      console.log('[MATCHMAKING] Timeout — indo para o bot')
      clearTimers()
      removeFromQueue()
      dispatch({ type: 'START_BOT', gridSize })
    }, BOT_TIMEOUT_SEC * 1000)
  }, [clearTimers, removeFromQueue, pollForMatch])

  const cancelSearch = useCallback(() => {
    cleanup()
    dispatch({ type: 'IDLE', gridSize: gridSizeRef.current })
  }, [cleanup])

  const sendMove = useCallback((move: Move) => {
    dispatch({ type: 'MY_MOVE', move })
    gameChannelRef.current?.send({ type: 'broadcast', event: 'move', payload: { move } })
  }, [])

  const sendRestart = useCallback(() => {
    dispatch({ type: 'RESTART', gridSize: gridSizeRef.current })
    gameChannelRef.current?.send({ type: 'broadcast', event: 'restart', payload: {} })
  }, [])

  const leaveGame = useCallback(() => {
    gameChannelRef.current?.send({ type: 'broadcast', event: 'leave', payload: {} })
    cleanup()
    dispatch({ type: 'IDLE', gridSize: gridSizeRef.current })
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return { status, myPlayer, game, isMyTurn, searchSeconds, lastOpponentMove, lastMoveKey, findMatch, cancelSearch, sendMove, sendRestart, leaveGame }
}
