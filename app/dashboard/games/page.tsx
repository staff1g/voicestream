'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function GamesDashboard() {
  const [username, setUsername] = useState('')
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const pollRef = useRef<any>(null)

  useEffect(() => {
    const name = document.cookie
      .split('; ')
      .find(r => r.startsWith('kick_username='))
      ?.split('=')[1]

    if (!name) {
      router.push('/')
      return
    }
    setUsername(decodeURIComponent(name))
  }, [])

  useEffect(() => {
    if (!gameId) return
    fetchGameState()
    pollRef.current = setInterval(fetchGameState, 3000)
    return () => clearInterval(pollRef.current)
  }, [gameId])

  async function fetchGameState() {
    if (!gameId) return
    const res = await fetch(`/api/games/${gameId}/current`)
    const data = await res.json()
    setGameState(data)
  }

  async function launchQuestion() {
    if (!answer.trim()) {
      setStatus({ msg: 'Entre une reponse', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/games/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerUsername: username, answer, hint }),
      })
      const data = await res.json()
      if (res.ok) {
        setGameId(data.gameId)
        setAnswer('')
        setHint('')
        setStatus(null)
      } else {
        setStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setStatus({ msg: 'Erreur serveur', type: 'error' })
    }
    setSubmitting(false)
  }

  async function endGame() {
    await fetch('/api/games/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamerUsername: username }),
    })
    clearInterval(pollRef.current)
    setGameId(null)
    setGameState(null)
  }

  const question = gameState?.question

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-white mb-2 inline-block">
              Retour au dashboard
            </a>
            <h1 className="text-2xl font-bold">Guess the word</h1>
          </div>
          <span className="text-gray-400">@{username}</span>
        </div>

        {question && !question.answered_by && (
          <div className="bg-gray-900 rounded-xl p-8 mb-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Question en cours</p>
            <h1 className="text-5xl font-bold tracking-widest mb-4">
              {'★ '.repeat(question.length).trim()}
            </h1>
            {question.hint && (
              <p className="text-gray-400">Indice: {question.hint}</p>
            )}
            <p className="text-gray-600 text-sm mt-4">En attente d une bonne reponse dans le chat...</p>
          </div>
        )}

        {question && question.answered_by && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 mb-6 text-center">
            <p className="text-green-400 font-semibold text-lg">{question.answered_by} a trouve la reponse !</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {question ? 'Question suivante' : 'Lancer une question'}
          </h2>
          <input
            type="password"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Reponse secrete"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3"
          />
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Indice (optionnel)"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3"
          />
          <button
            onClick={launchQuestion}
            disabled={submitting}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? 'Lancement...' : 'Lancer cette question'}
          </button>
          {status && (
            <p className="text-red-400 text-sm mt-3">{status.msg}</p>
          )}
        </div>

        {gameState?.scores?.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Classement</h2>
            <div className="space-y-2">
              {gameState.scores.map((s: any, i: number) => (
                <div key={s.chatter_username} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <span>{i + 1}. {s.chatter_username}</span>
                  <span className="text-purple-400 font-medium">{s.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameId && (
          <button onClick={endGame} className="text-sm text-gray-500 hover:text-white">
            Reinitialiser le jeu
          </button>
        )}
      </div>
    </main>
  )
}