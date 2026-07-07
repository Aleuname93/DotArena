// @refresh reset
// v4
import { useEffect, useRef } from 'react'
import { useMatchmaking } from './hooks/useMatchmaking'
import { useProfile } from './hooks/useProfile'
import { postResult, getLocalPlayer } from './lib/playerStats'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import Profile from './components/Profile'

export default function App() {
  const {
    status, myPlayer, game, isMyTurn, searchSeconds,
    lastOpponentMove, lastMoveKey,
    findMatch, cancelSearch, sendMove, sendRestart, leaveGame,
  } = useMatchmaking()

  const profile = useProfile()
  const reportedRef = useRef(false)

  // Report result when game finishes (online only, not bot)
  useEffect(() => {
    if (!game.finished || status !== 'playing' || !myPlayer || reportedRef.current) return
    reportedRef.current = true
    const result = game.winner === null ? 'draw' : game.winner === myPlayer ? 'win' : 'loss'
    postResult(result).then(stats => {
      if (stats) profile.refresh()
    })
  }, [game.finished, game.winner, myPlayer, status]) // eslint-disable-line

  // Reset reporter on new game
  useEffect(() => {
    if (!game.finished) reportedRef.current = false
  }, [game.finished])

  if ((status === 'playing' || status === 'playing_bot' || status === 'opponent_left') && myPlayer) {
    return (
      <GameBoard
        game={game}
        myPlayer={myPlayer}
        isMyTurn={isMyTurn}
        opponentLeft={status === 'opponent_left'}
        isBotGame={status === 'playing_bot'}
        lastOpponentMove={lastOpponentMove}
        lastMoveKey={lastMoveKey}
        onMove={sendMove}
        onRestart={sendRestart}
        onLeave={leaveGame}
      />
    )
  }

  return (
    <>
      <Lobby
        status={status}
        searchSeconds={searchSeconds}
        onFind={findMatch}
        onCancel={cancelSearch}
        onOpenProfile={profile.openProfile}
        playerName={getLocalPlayer().name}
      />
      <Profile profile={profile} />
    </>
  )
}
