// @refresh reset
// v6
import { useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useMatchmaking } from './hooks/useMatchmaking'
import { useProfile } from './hooks/useProfile'
import { postResult, getPlayerFromUser } from './lib/playerStats'
import AuthScreen from './components/AuthScreen'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import Profile from './components/Profile'

export default function App() {
  const auth = useAuth()
  const { step, user, signOut } = auth

  const {
    status, myPlayer, game, isMyTurn, searchSeconds,
    lastOpponentMove, lastMoveKey,
    findMatch, cancelSearch, sendMove, sendRestart, leaveGame,
  } = useMatchmaking()

  const profile = useProfile(user ?? null)
  const reportedRef = useRef(false)

  // Save result after online game ends
  useEffect(() => {
    if (!game.finished || status !== 'playing' || !myPlayer || !user || reportedRef.current) return
    reportedRef.current = true
    const result = game.winner === null ? 'draw' : game.winner === myPlayer ? 'win' : 'loss'
    postResult(user, result).then(stats => { if (stats) profile.refresh() })
  }, [game.finished, game.winner, myPlayer, status]) // eslint-disable-line

  useEffect(() => {
    if (!game.finished) reportedRef.current = false
  }, [game.finished])

  // Auth screens (loading, email, OTP, name)
  if (step !== 'authenticated') {
    return <AuthScreen auth={auth} />
  }

  // Game screen
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

  const player = user ? getPlayerFromUser(user) : null

  return (
    <>
      <Lobby
        status={status}
        searchSeconds={searchSeconds}
        onFind={findMatch}
        onCancel={cancelSearch}
        onOpenProfile={profile.openProfile}
        playerName={player?.name}
        onSignOut={signOut}
      />
      <Profile profile={profile} user={user} />
    </>
  )
}
