import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import { createGame, applyMove, type GameState, type Move, type Player } from '../game/logic'

export type ConnectionStatus =
  | 'idle'
  | 'hosting'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected'

interface PeerMessage {
  type: 'ready' | 'move' | 'restart' | 'chat'
  move?: Move
  message?: string
}

export interface GamePeerState {
  status: ConnectionStatus
  roomId: string | null
  myPlayer: Player | null
  game: GameState
  error: string | null
  isMyTurn: boolean
  sendMove: (move: Move) => void
  sendRestart: () => void
  createRoom: (gridSize?: number) => void
  joinRoom: (roomId: string) => void
  disconnect: () => void
}

export function useGamePeer(): GamePeerState {
  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const gridSizeRef = useRef(5)

  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [game, setGame] = useState<GameState>(createGame(5))
  const [error, setError] = useState<string | null>(null)

  const isMyTurn = myPlayer !== null && game.currentPlayer === myPlayer && !game.finished

  const handleMessage = useCallback(
    (msg: PeerMessage, asPlayer: Player) => {
      if (msg.type === 'move' && msg.move) {
        const opponent: Player = asPlayer === 1 ? 2 : 1
        setGame((prev) => applyMove(prev, msg.move!, opponent))
      } else if (msg.type === 'restart') {
        setGame(createGame(gridSizeRef.current))
      } else if (msg.type === 'ready') {
        setStatus('connected')
      }
    },
    []
  )

  const setupConnection = useCallback(
    (conn: DataConnection, asPlayer: Player) => {
      connRef.current = conn

      conn.on('data', (data) => {
        handleMessage(data as PeerMessage, asPlayer)
      })

      conn.on('open', () => {
        if (asPlayer === 2) {
          conn.send({ type: 'ready' } as PeerMessage)
          setStatus('connected')
        }
      })

      conn.on('close', () => {
        setStatus('disconnected')
      })

      conn.on('error', (err) => {
        setError(err.message)
        setStatus('error')
      })
    },
    [handleMessage]
  )

  const createRoom = useCallback((gridSize = 5) => {
    gridSizeRef.current = gridSize
    setGame(createGame(gridSize))

    if (peerRef.current) {
      peerRef.current.destroy()
    }

    const peer = new Peer()
    peerRef.current = peer
    setStatus('hosting')
    setMyPlayer(1)
    setError(null)

    peer.on('open', (id) => {
      setRoomId(id)
    })

    peer.on('connection', (conn) => {
      setupConnection(conn, 1)
      conn.on('open', () => {
        conn.send({ type: 'ready' } as PeerMessage)
        setStatus('connected')
      })
    })

    peer.on('error', (err) => {
      setError(err.message)
      setStatus('error')
    })
  }, [setupConnection])

  const joinRoom = useCallback((id: string) => {
    if (peerRef.current) {
      peerRef.current.destroy()
    }

    const peer = new Peer()
    peerRef.current = peer
    setStatus('connecting')
    setMyPlayer(2)
    setError(null)

    peer.on('open', () => {
      const conn = peer.connect(id.trim())
      setupConnection(conn, 2)
    })

    peer.on('error', (err) => {
      setError(`Não foi possível conectar: ${err.message}`)
      setStatus('error')
    })
  }, [setupConnection])

  const sendMove = useCallback((move: Move) => {
    if (!connRef.current || !myPlayer) return
    connRef.current.send({ type: 'move', move } as PeerMessage)
    setGame((prev) => applyMove(prev, move, myPlayer))
  }, [myPlayer])

  const sendRestart = useCallback(() => {
    setGame(createGame(gridSizeRef.current))
    connRef.current?.send({ type: 'restart' } as PeerMessage)
  }, [])

  const disconnect = useCallback(() => {
    connRef.current?.close()
    peerRef.current?.destroy()
    connRef.current = null
    peerRef.current = null
    setStatus('idle')
    setRoomId(null)
    setMyPlayer(null)
    setGame(createGame(gridSizeRef.current))
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      peerRef.current?.destroy()
    }
  }, [])

  return { status, roomId, myPlayer, game, error, isMyTurn, sendMove, sendRestart, createRoom, joinRoom, disconnect }
}
