import type { GameState, Move } from './logic'

function countSidesOfBox(state: GameState, row: number, col: number): number {
  let sides = 0
  if (state.hLines[row][col]) sides++
  if (state.hLines[row + 1][col]) sides++
  if (state.vLines[row][col]) sides++
  if (state.vLines[row][col + 1]) sides++
  return sides
}

function getAllMoves(state: GameState): Move[] {
  const moves: Move[] = []
  const N = state.gridSize
  for (let r = 0; r <= N; r++)
    for (let c = 0; c < N; c++)
      if (!state.hLines[r][c]) moves.push({ type: 'h', row: r, col: c })
  for (let r = 0; r < N; r++)
    for (let c = 0; c <= N; c++)
      if (!state.vLines[r][c]) moves.push({ type: 'v', row: r, col: c })
  return moves
}

// How many boxes does this move complete?
function boxesCompleted(state: GameState, move: Move): number {
  const N = state.gridSize
  let count = 0
  const { type, row, col } = move

  const checkBox = (r: number, c: number): boolean => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false
    if (state.boxes[r][c] !== null) return false
    let sides = countSidesOfBox(state, r, c)
    // add the hypothetical move
    if (type === 'h' && (row === r || row === r + 1) && col === c) sides++
    if (type === 'v' && row === r && (col === c || col === c + 1)) sides++
    return sides === 4
  }

  if (type === 'h') {
    if (checkBox(row - 1, col)) count++
    if (checkBox(row, col)) count++
  } else {
    if (checkBox(row, col - 1)) count++
    if (checkBox(row, col)) count++
  }
  return count
}

// How many 3-sided boxes does this move create (gift to opponent)?
function boxesGifted(state: GameState, move: Move): number {
  const N = state.gridSize
  let count = 0
  const { type, row, col } = move

  const checkBox = (r: number, c: number): boolean => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false
    if (state.boxes[r][c] !== null) return false
    let sides = countSidesOfBox(state, r, c)
    if (type === 'h' && (row === r || row === r + 1) && col === c) sides++
    if (type === 'v' && row === r && (col === c || col === c + 1)) sides++
    return sides === 3
  }

  if (type === 'h') {
    if (checkBox(row - 1, col)) count++
    if (checkBox(row, col)) count++
  } else {
    if (checkBox(row, col - 1)) count++
    if (checkBox(row, col)) count++
  }
  return count
}

export function getBotMove(state: GameState): Move | null {
  const moves = getAllMoves(state)
  if (moves.length === 0) return null

  // 1. Take any move that completes a box
  const winning = moves.filter((m) => boxesCompleted(state, m) > 0)
  if (winning.length > 0) {
    winning.sort((a, b) => boxesCompleted(state, b) - boxesCompleted(state, a))
    return winning[0]
  }

  // 2. Avoid moves that gift 3-sided boxes (safe moves)
  const safe = moves.filter((m) => boxesGifted(state, m) === 0)
  if (safe.length > 0) {
    return safe[Math.floor(Math.random() * safe.length)]
  }

  // 3. All moves gift something — pick the one that gifts fewest
  moves.sort((a, b) => boxesGifted(state, a) - boxesGifted(state, b))
  return moves[0]
}
