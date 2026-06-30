 
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GamesDashboard() {
  const [username, setUsername] = useState('')
  const [questions, setQuestions] = useState(
    Array.from({ length: 10 }, () => ({ answer: '', hint: '' }))
  )
  const [creating, setCreating] = useState(false)
  const [activeGame, setActiveGame] = useState<any>(null)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const router = useRouter()

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

  function updateQuestion(index: number, field: 'answer' | 'hint', value: string) {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  async function createAndStartGame() {
    const filled = questions.filter(q => q.answer.trim())
    if (filled.length === 0) {
      setStatus({ msg: 'Remplis au moins une question', type: 'error' })
      return
    }

    setCreating(true)
    try {
      const createRes = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerUsername: username, questions: filled }),
      })
      const createData = await createRes.json()

      if (!createRes.ok) {
        setStatus({ msg: createData.error || 'Erreur', type: 'error' })
        setCreating(false)
        return
      }

      const startRes = await fetch('/api/games/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: createData.gameId }),
      })

      if (startRes.ok) {
        setStatus({ msg: 'Game lance !', type: 'success' })
        setActiveGame({ id: createData.gameId })
      }
    } catch {
      setStatus({ msg: 'Erreur serveur', type: 'error' })
    }
    setCreating(false)
  }

  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game-overlay.html?streamer=${username}&server=${window.location.origin}`
    : ''

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Guess the word</h1>
          <span className="text-gray-400">@{username}</span>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">OBS Browser Source</h2>
          <p className="text-gray-400 text-sm mb-3">Copie ce lien dans OBS :</p>
          <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-purple-400 break-all">
            {overlayUrl}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Cree ton quiz (10 questions)</h2>

          <div className="space-y-3 mb-6">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500 text-sm w-6 pt-3">{i + 1}</span>
                <input
                  type="text"
                  value={q.answer}
                  onChange={(e) => updateQuestion(i, 'answer', e.target.value)}
                  placeholder="Reponse secrete"
                  className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none"
                />
                <input
                  type="text"
                  value={q.hint}
                  onChange={(e) => updateQuestion(i, 'hint', e.target.value)}
                  placeholder="Indice (optionnel)"
                  className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={createAndStartGame}
            disabled={creating}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
          >
            {creating ? 'Lancement...' : 'Lancer le quiz'}
          </button>

          {status && (
            <div className={`rounded-xl p-3 text-sm mt-4 ${
              status.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}