export type Player = 1 | 2

export interface GameState {
  gridSize: number // number of boxes per side
  hLines: boolean[][] // [row][col] row=0..gridSize, col=0..gridSize-1
  vLines: boolean[][] // [row][col] row=0..gridSize-1, col=0..gridSize
  hOwner: (Player | null)[][] // who drew each h-line
  vOwner: (Player | null)[][] // who drew each v-line
  boxes: (Player | null)[][] // [row][col] row=0..gridSize-1, col=0..gridSize-1
  scores: { 1: number; 2: number }
  currentPlayer: Player
  finished: boolean
  winner: Player | null // null = draw
}

export function createGame(gridSize = 5): GameState {
  const hLines = Array.from({ length: gridSize + 1 }, () =>
    Array(gridSize).fill(false)
  )
  const vLines = Array.from({ length: gridSize }, () =>
    Array(gridSize + 1).fill(false)
  )
  const hOwner: (Player | null)[][] = Array.from({ length: gridSize + 1 }, () =>
    Array(gridSize).fill(null)
  )
  const vOwner: (Player | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize + 1).fill(null)
  )
  const boxes: (Player | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  )
  return {
    gridSize,
    hLines,
    vLines,
    hOwner,
    vOwner,
    boxes,
    scores: { 1: 0, 2: 0 },
    currentPlayer: 1,
    finished: false,
    winner: null,
  }
}

export interface Move {
  type: 'h' | 'v'
  row: number
  col: number
}

function checkBox(
  state: GameState,
  row: number,
  col: number,
  player: Player
): boolean {
  const { hLines, vLines, gridSize } = state
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return false
  const closed =
    hLines[row][col] && hLines[row + 1][col] && vLines[row][col] && vLines[row][col + 1]
  if (closed && state.boxes[row][col] === null) {
    state.boxes[row][col] = player
    state.scores[player]++
    return true
  }
  return false
}

export function applyMove(state: GameState, move: Move, player: Player): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state))
  if (s.finished) return s

  const { type, row, col } = move
  if (type === 'h') {
    if (s.hLines[row][col]) return s
    s.hLines[row][col] = true
    s.hOwner[row][col] = player
  } else {
    if (s.vLines[row][col]) return s
    s.vLines[row][col] = true
    s.vOwner[row][col] = player
  }

  let captured = false
  if (type === 'h') {
    captured = checkBox(s, row - 1, col, player) || captured
    captured = checkBox(s, row, col, player) || captured
  } else {
    captured = checkBox(s, row, col - 1, player) || captured
    captured = checkBox(s, row, col, player) || captured
  }

  const total = s.gridSize * s.gridSize
  if (s.scores[1] + s.scores[2] >= total) {
    s.finished = true
    if (s.scores[1] > s.scores[2]) s.winner = 1
    else if (s.scores[2] > s.scores[1]) s.winner = 2
    else s.winner = null
  } else if (!captured) {
    s.currentPlayer = player === 1 ? 2 : 1
  } else {
    s.currentPlayer = player
  }

  return s
}

export function isValidMove(state: GameState, move: Move): boolean {
  if (state.finished) return false
  const { type, row, col } = move
  if (type === 'h') {
    if (row < 0 || row > state.gridSize || col < 0 || col >= state.gridSize) return false
    return !state.hLines[row][col]
  } else {
    if (row < 0 || row >= state.gridSize || col < 0 || col > state.gridSize) return false
    return !state.vLines[row][col]
  }
}
