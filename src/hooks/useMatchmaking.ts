Encontrei exatamente o problema! Confirmado: sobrou um pedaço duplicado e "solto" de uma correção anterior, bem depois do fechamento da função findMatch — repare que tem um bloco ch.on('presence', ...) inteiro flutuando fora de qualquer função, sem contexto, isso é o resto da versão antiga que ficou colado sem querer.
Vou te passar o arquivo completo e limpo dessa vez — copie exatamente isso, substituindo o arquivo inteiro:
ts// @refresh reset
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

interface PresenceState { playerId: string; joinedAt: number }
const BOT_TIMEOUT_SEC = 30

export function useMatchmaking(): MatchState {
  const [state, dispatch] = useReducer(reducer, INIT)
  const myId = useRef(makeId())
  const gridSizeRef = useRef(5)
  const matchChannelRef = useRef<RealtimeChannel | null>(null)
  const gameChannelRef = useRef<RealtimeChannel | null>(null)
  const timersRef = useRef<{
    search: ReturnType<typeof setInterval> | null
    bot: ReturnType<typeof setTimeout> | null
    botMove: ReturnType<typeof setTimeout> | null
  }>({ search: null, bot: null, botMove: null })

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
    if (t.botMove) { clearTimeout(t.botMove); t.botMove = null }
  }, [])

  const cleanup = useCallback(() => {
    clearTimers()
    matchChannelRef.current?.unsubscribe()
    gameChannelRef.current?.unsubscribe()
    matchChannelRef.current = null
    gameChannelRef.current = null
  }, [clearTimers])

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

  const findMatch = useCallback((gridSize = 5) => {
    gridSizeRef.current = gridSize
    cleanup()
    dispatch({ type: 'SEARCHING', gridSize })

    const t = timersRef.current
    t.search = setInterval(() => dispatch({ type: 'TICK' }), 1000)

    t.bot = setTimeout(() => {
      matchChannelRef.current?.unsubscribe()
      matchChannelRef.current = null
      clearTimers()
      dispatch({ type: 'START_BOT', gridSize })
    }, BOT_TIMEOUT_SEC * 1000)

    const ch = supabase.channel(`matchmaking:${gridSize}`, {
      config: { presence: { key: myId.current }, broadcast: { self: false } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const s = ch.presenceState<PresenceState>()
      const players = Object.values(s).flat()
        .sort((a, b) => a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId))

      if (players.length < 2) return

      const [p1, p2] = players
      const roomId = [p1.playerId, p2.playerId].sort().join('_')
      const asPlayer: Player = myId.current === p1.playerId ? 1 : 2

      clearTimers()
      ch.unsubscribe()
      matchChannelRef.current = null
      joinGameChannel(roomId, asPlayer, gridSize)
    })

    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') await ch.track({ playerId: myId.current, joinedAt: Date.now() })
    })

    matchChannelRef.current = ch
  }, [cleanup, clearTimers, joinGameChannel])

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
