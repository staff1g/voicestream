'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function MillionairePlay() {
  const [username, setUsername] = useState('')
  const [gameState, setGameState] = useState<any>(null)
  const [answering, setAnswering] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; correctOption: string; chosenOption: string } | null>(null)
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
    const decoded = decodeURIComponent(name)
    setUsername(decoded)
    fetchState(decoded)
    pollRef.current = setInterval(() => fetchState(decoded), 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  async function fetchState(name: string) {
    const res = await fetch(`/api/millionaire/${name}/current`)
    const data = await res.json()
    setGameState(data)
  }

  async function submitAnswer(option: string) {
    if (answering) return
    setAnswering(true)
    setResult(null)
    try {
      const res = await fetch('/api/millionaire/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerUsername: username, chosenOption: option }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        setTimeout(() => {
          setResult(null)
          fetchState(username)
        }, 3000)
      }
    } catch {}
    setAnswering(false)
  }

  const question = gameState?.question
  const game = gameState?.game

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <a href="/dashboard/millionaire" className="text-sm text-gray-500 hover:text-white">
            Retour
          </a>
          <span className="text-gray-400">@{username}</span>
        </div>

        {!game || !question ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <p className="text-gray-500">Aucune question active pour le moment</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm mb-2">
              Niveau {game.playing_level} - {question.amount}
            </p>
            <h1 className="text-xl font-semibold mb-8">{question.question_text}</h1>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const text = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }[opt]
                return (
                  <button
                    key={opt}
                    onClick={() => submitAnswer(opt)}
                    disabled={answering}
                    className="bg-gray-800 hover:bg-purple-700 rounded-xl p-4 text-left disabled:opacity-50"
                  >
                    <span className="font-semibold text-purple-400 mr-2">{opt}:</span>
                    {text}
                  </button>
                )
              })}
            </div>

            {result && (
              <div className={`rounded-xl p-4 ${result.correct ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                {result.correct
                  ? `Bonne reponse ! C'etait ${result.correctOption}`
                  : `Mauvaise reponse. La bonne reponse etait ${result.correctOption}`}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}