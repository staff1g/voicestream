'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AMOUNTS = ['1 000', '4 000', '8 000', '16 000', '32 000', '64 000', '125 000', '250 000', '500 000', '1 000 000']

export default function MillionaireDashboard() {
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState('A')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [obsCopied, setObsCopied] = useState(false)
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

  async function launchQuestion() {
    if (currentLevel > 10) return
    if (!question.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setStatus({ msg: 'Remplis tous les champs', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/millionaire/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamerUsername: username,
          question,
          optionA, optionB, optionC, optionD,
          correctOption,
          amount: AMOUNTS[currentLevel - 1],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ msg: 'Question lancee !', type: 'success' })
        setQuestion('')
        setOptionA('')
        setOptionB('')
        setOptionC('')
        setOptionD('')
        setCorrectOption('A')
        setCurrentLevel(l => l + 1)
      } else {
        setStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setStatus({ msg: 'Erreur serveur', type: 'error' })
    }
    setSubmitting(false)
  }

  async function resetGame() {
    await fetch('/api/millionaire/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamerUsername: username }),
    })
    setCurrentLevel(1)
    setStatus({ msg: 'Jeu reinitialise', type: 'success' })
  }

  function copyObsLink() {
    const url = `${window.location.origin}/millionaire-overlay.html?streamer=${username}&server=${window.location.origin}`
    navigator.clipboard.writeText(url)
    setObsCopied(true)
    setTimeout(() => setObsCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-white mb-2 inline-block">
              Retour au dashboard
            </a>
            <h1 className="text-2xl font-bold">Qui veut gagner des millions</h1>
          </div>
          <span className="text-gray-400">@{username}</span>
        </div>

        <a href="/dashboard/millionaire-play" className="block bg-purple-600 hover:bg-purple-700 rounded-xl p-4 text-center font-semibold mb-6">
          Jouer / Repondre aux questions
        </a>

        {currentLevel > 10 ? (
          <div className="bg-gray-900 rounded-xl p-8 mb-6 text-center">
            <p className="text-xl font-semibold text-green-400 mb-2">Quiz complet</p>
            <p className="text-gray-400 text-sm">Les 10 questions ont ete envoyees. Reinitialise pour recommencer.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Question niveau {currentLevel} ({AMOUNTS[currentLevel - 1]})
            </h2>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Texte de la question"
              className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctOption === 'A'} onChange={() => setCorrectOption('A')} />
                <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} placeholder="Option A" className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctOption === 'B'} onChange={() => setCorrectOption('B')} />
                <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} placeholder="Option B" className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctOption === 'C'} onChange={() => setCorrectOption('C')} />
                <input type="text" value={optionC} onChange={(e) => setOptionC(e.target.value)} placeholder="Option C" className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctOption === 'D'} onChange={() => setCorrectOption('D')} />
                <input type="text" value={optionD} onChange={(e) => setOptionD(e.target.value)} placeholder="Option D" className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none" />
              </div>
            </div>

            <p className="text-gray-500 text-xs mb-4">Coche le bouton radio devant la bonne reponse</p>

            <button
              onClick={launchQuestion}
              disabled={submitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
            >
              {submitting ? 'Lancement...' : 'Lancer cette question'}
            </button>

            {status && (
              <p className={`text-sm mt-3 ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {status.msg}
              </p>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">OBS Browser Source</h2>
          <p className="text-gray-400 text-sm mb-3">Copie ce lien dans OBS (fond transparent) :</p>
          <button
            onClick={copyObsLink}
            className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {obsCopied ? 'Copie !' : 'Copier le lien OBS'}
          </button>
        </div>

        <button onClick={resetGame} className="text-sm text-gray-500 hover:text-white">
          Reinitialiser le jeu
        </button>
      </div>
    </main>
  )
}