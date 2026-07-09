import { useState, useEffect } from 'react'
import type { GameState, Move, Player } from '../game/logic'
import { isValidMove } from '../game/logic'

const P1_COLOR = '#ff3333'
const P2_COLOR = '#3399ff'
const DOT_COLOR = '#00ff41'

const PLAYER_LABEL = (p: Player, isBotGame?: boolean): string => {
  if (p === 2 && isBotGame) return 'CPU'
  return p === 1 ? 'P-1' : 'P-2'
}

interface GameBoardProps {
  game: GameState
  myPlayer: Player
  isMyTurn: boolean
  opponentLeft?: boolean
  isBotGame?: boolean
  lastOpponentMove?: Move | null
  lastMoveKey?: number
  onMove: (move: Move) => void
  onRestart: () => void
  onLeave: () => void
}

export default function GameBoard({
  game, myPlayer, isMyTurn, opponentLeft, isBotGame, lastOpponentMove, lastMoveKey = 0, onMove, onRestart, onLeave,
}: GameBoardProps) {
  const [hovered, setHovered] = useState<{ type: 'h' | 'v'; row: number; col: number } | null>(null)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 8), 250)
    return () => clearInterval(id)
  }, [])

  const DOT = 8
  const CELL = 56
  const N = game.gridSize
  const SVG_SIZE = DOT * 2 + CELL * N
  const STROKE = 5

  const dotX = (col: number) => DOT + CELL * col
  const dotY = (row: number) => DOT + CELL * row

  const opponent: Player = myPlayer === 1 ? 2 : 1
  const myColor = myPlayer === 1 ? P1_COLOR : P2_COLOR

  const isLastOpp = (type: 'h' | 'v', row: number, col: number) =>
    lastOpponentMove?.type === type &&
    lastOpponentMove.row === row &&
    lastOpponentMove.col === col

  const handleLine = (move: Move) => {
    if (!isMyTurn || !isValidMove(game, move)) return
    onMove(move)
    setHovered(null)
  }

  const isHovered = (type: 'h' | 'v', row: number, col: number) =>
    hovered?.type === type && hovered.row === row && hovered.col === col

  return (
    <div className="crt min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 gap-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${(i * 41 + 3) % 100}%`,
              top: `${(i * 67 + 13) % 100}%`,
              opacity: 0.3,
              animation: `blink ${1.5 + (i % 3) * 0.4}s step-end ${i * 0.07}s infinite`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full max-w-xl">
          <button onClick={onLeave}
            className="text-[#ff3333] text-[7px] font-pixel hover:bg-[#ff333322] px-3 py-2 transition-colors"
            style={{ border: '2px solid #ff333360' }}>
            ← LEAVE
          </button>
          <p className="text-[#00ff41]/40 text-[7px] font-pixel pixel-blink">DOT ARENA</p>
          <div className="w-16" />
        </div>

        <div className="flex gap-3 w-full max-w-xl">
          {([myPlayer, opponent] as Player[]).map((p) => {
            const isActive = game.currentPlayer === p && !game.finished
            const pColor = p === 1 ? P1_COLOR : P2_COLOR
            return (
              <div key={p} className="flex-1 p-3 bg-black text-center transition-all duration-150"
                style={{
                  border: `4px solid ${isActive ? pColor : pColor + '40'}`,
                  boxShadow: isActive ? `4px 4px 0 ${pColor}44, 0 0 20px ${pColor}33` : '4px 4px 0 #111',
                }}>
                <p className="text-[7px] font-pixel mb-1" style={{ color: pColor + (isActive ? 'ff' : '80') }}>
                  {PLAYER_LABEL(p, isBotGame)} {p === myPlayer ? '(YOU)' : ''}
                </p>
                <p className="text-2xl font-pixel" style={{
                  color: pColor,
                  textShadow: isActive ? `2px 2px 0 #000, 0 0 15px ${pColor}` : `2px 2px 0 #000`,
                }}>
                  {game.scores[p].toString().padStart(2, '0')}
                </p>
                {isActive && (
                  <p className="text-[6px] font-pixel mt-1 pixel-blink" style={{ color: pColor }}>
                    {p === myPlayer ? '▶ YOUR TURN' : '⌛ THEIR TURN'}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {!game.finished && (
          <div className="text-[7px] font-pixel px-4 py-2"
            style={{
              color: isMyTurn ? '#00ff41' : '#ffffff60',
              border: `2px solid ${isMyTurn ? '#00ff4160' : '#ffffff20'}`,
              boxShadow: isMyTurn ? '0 0 15px #00ff4133' : 'none',
            }}>
            {isMyTurn ? '▶ CLICK A LINE' : '⌛ WAITING...'}
          </div>
        )}

        <div className="bg-black p-4 md:p-6"
          style={{
            border: '4px solid #00ff4160',
            boxShadow: '4px 4px 0 #003a0f',
          }}>
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            style={{
              display: 'block',
              maxWidth: '85vw',
              maxHeight: '55vh',
              cursor: isMyTurn ? 'crosshair' : 'default',
              imageRendering: 'pixelated',
            }}
          >
            {Array.from({ length: N }, (_, row) =>
              Array.from({ length: N }, (_, col) => {
                const owner = game.boxes[row][col]
                if (!owner) return null
                const fc = owner === 1 ? P1_COLOR : P2_COLOR
                return (
                  <g key={`box-${row}-${col}`}>
                    <rect
                      x={dotX(col) + STROKE / 2}
                      y={dotY(row) + STROKE / 2}
                      width={CELL - STROKE}
                      height={CELL - STROKE}
                      fill={fc}
                      opacity={0.18}
                    />
                    <text
                      x={dotX(col) + CELL / 2}
                      y={dotY(row) + CELL / 2 + 4}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="'Press Start 2P', monospace"
                      fill={fc}
                      opacity={0.8}
                    >
                      {owner === myPlayer ? 'YOU' : isBotGame && owner === 2 ? 'CPU' : 'FOE'}
                    </text>
                  </g>
                )
              })
            )}

            {Array.from({ length: N + 1 }, (_, row) =>
              Array.from({ length: N }, (_, col) => {
                const drawn = game.hLines[row][col]
                const owner = game.hOwner[row][col]
                const hover = isHovered('h', row, col) && !drawn
                const isLast = isLastOpp('h', row, col)
                const canClick = isMyTurn && isValidMove(game, { type: 'h', row, col })
                const x1 = dotX(col) + DOT
                const x2 = dotX(col + 1) - DOT
                const y = dotY(row)
                const lineColor = drawn
                  ? (owner === 1 ? P1_COLOR : P2_COLOR)
                  : hover ? myColor + 'cc' : '#00ff4118'
                return (
                  <g key={isLast ? `h-${row}-${col}-last-${lastMoveKey}` : `h-${row}-${col}`}
                    style={isLast ? { animation: 'last-move-pulse 1.2s ease-out' } : undefined}>
                    <rect x={x1 - 2} y={y - 10} width={x2 - x1 + 4} height={20}
                      fill="transparent"
                      onClick={() => handleLine({ type: 'h', row, col })}
                      onMouseEnter={() => canClick && setHovered({ type: 'h', row, col })}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: canClick ? 'crosshair' : 'default' }}
                    />
                    <line
                      x1={x1} y1={y} x2={x2} y2={y}
                      stroke={lineColor}
                      strokeWidth={isLast ? STROKE + 2 : drawn ? STROKE : hover ? 3 : 1.5}
                      style={{ transition: 'stroke 0.05s, stroke-width 0.05s', color: lineColor }}
                    />
                    {drawn && (
                      <line x1={x1} y1={y} x2={x2} y2={y}
                        stroke={lineColor} strokeWidth={1} opacity={0.4}
                        transform={`translate(0, 2)`}
                      />
                    )}
                  </g>
                )
              })
            )}

            {Array.from({ length: N }, (_, row) =>
              Array.from({ length: N + 1 }, (_, col) => {
                const drawn = game.vLines[row][col]
                const owner = game.vOwner[row][col]
                const hover = isHovered('v', row, col) && !drawn
                const isLast = isLastOpp('v', row, col)
                const canClick = isMyTurn && isValidMove(game, { type: 'v', row, col })
                const x = dotX(col)
                const y1 = dotY(row) + DOT
                const y2 = dotY(row + 1) - DOT
                const lineColor = drawn
                  ? (owner === 1 ? P1_COLOR : P2_COLOR)
                  : hover ? myColor + 'cc' : '#00ff4118'
                return (
                  <g key={isLast ? `v-${row}-${col}-last-${lastMoveKey}` : `v-${row}-${col}`}
                    style={isLast ? { animation: 'last-move-pulse 1.2s ease-out' } : undefined}>
                    <rect x={x - 10} y={y1 - 2} width={20} height={y2 - y1 + 4}
                      fill="transparent"
                      onClick={() => handleLine({ type: 'v', row, col })}
                      onMouseEnter={() => canClick && setHovered({ type: 'v', row, col })}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: canClick ? 'crosshair' : 'default' }}
                    />
                    <line
                      x1={x} y1={y1} x2={x} y2={y2}
                      stroke={lineColor}
                      strokeWidth={isLast ? STROKE + 2 : drawn ? STROKE : hover ? 3 : 1.5}
                      style={{ transition: 'stroke 0.05s, stroke-width 0.05s', color: lineColor }}
                    />
                    {drawn && (
                      <line x1={x} y1={y1} x2={x} y2={y2}
                        stroke={lineColor} strokeWidth={1} opacity={0.4}
                        transform={`translate(2, 0)`}
                      />
                    )}
                  </g>
                )
              })
            )}

            {Array.from({ length: N + 1 }, (_, row) =>
              Array.from({ length: N + 1 }, (_, col) => {
                const pulse = (row + col + frame) % 8 === 0
                return (
                  <rect
                    key={`dot-${row}-${col}`}
                    x={dotX(col) - DOT / 2}
                    y={dotY(row) - DOT / 2}
                    width={DOT}
                    height={DOT}
                    fill={DOT_COLOR}
                    opacity={pulse ? 1 : 0.85}
                  />
                )
              })
            )}
          </svg>
        </div>

        {opponentLeft && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div className="bg-black p-8 text-center max-w-xs w-full"
              style={{ border: '4px solid #ff3333', boxShadow: '8px 8px 0 #3a0000' }}>
              <p className="text-[#ff3333] text-[10px] font-pixel mb-2">OPPONENT</p>
              <p className="text-[#ff3333] text-[10px] font-pixel mb-6 pixel-blink">LEFT THE GAME!</p>
              <button onClick={onLeave}
                className="w-full py-3 text-[9px] font-pixel bg-[#00ff41] text-black hover:bg-[#00cc33] transition-colors"
                style={{ boxShadow: '4px 4px 0 #003a0f' }}>
                NEW GAME
              </button>
            </div>
          </div>
        )}

        {game.finished && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-black p-8 text-center max-w-xs w-full"
              style={{
                border: `4px solid ${game.winner === myPlayer ? '#00ff41' : game.winner === null ? '#ffdd00' : '#ff3333'}`,
                boxShadow: `8px 8px 0 ${game.winner === myPlayer ? '#003a0f' : game.winner === null ? '#3a3300' : '#3a0000'}`,
              }}>
              {game.winner === null ? (
                <>
                  <p className="text-[#ffdd00] text-sm font-pixel mb-1"
                    style={{ textShadow: '2px 2px 0 #3a3300' }}>DRAW!</p>
                  <p className="text-[#ffdd00]/50 text-[8px] font-pixel mb-6">
                    {game.scores[1]} - {game.scores[2]}
                  </p>
                </>
              ) : game.winner === myPlayer ? (
                <>
                  <p className="text-[#00ff41] text-[9px] font-pixel mb-1 pixel-blink">NEW RECORD!</p>
                  <p className="text-[#00ff41] text-sm font-pixel mb-1"
                    style={{ textShadow: '2px 2px 0 #003a0f' }}>YOU WON</p>
                  <p className="text-[#00ff41]/50 text-[8px] font-pixel mb-6">
                    {game.scores[myPlayer]} - {game.scores[opponent]}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[#ff3333] text-[9px] font-pixel mb-1">GAME OVER</p>
                  <p className="text-[#ff3333] text-sm font-pixel mb-1"
                    style={{ textShadow: '2px 2px 0 #3a0000' }}>YOU LOST</p>
                  <p className="text-[#ff3333]/50 text-[8px] font-pixel mb-6">
                    {game.scores[myPlayer]} - {game.scores[opponent]}
                  </p>
                </>
              )}
              <div className="flex gap-3">
                <button onClick={onRestart}
                  className="flex-1 py-3 text-[7px] font-pixel bg-[#00ff41] text-black hover:bg-[#00cc33] transition-colors"
                  style={{ boxShadow: '3px 3px 0 #003a0f' }}>
                  REMATCH
                </button>
                <button onClick={onLeave}
                  className="flex-1 py-3 text-[7px] font-pixel text-[#ff3333] hover:bg-[#ff333322] transition-colors"
                  style={{ border: '2px solid #ff333360' }}>
                  LEAVE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
