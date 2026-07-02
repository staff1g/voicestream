'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AMOUNTS = ['1 000', '4 000', '8 000', '16 000', '32 000', '64 000', '125 000', '250 000', '500 000', '1 000 000']

const emptyQuestion = () => ({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A' })

export default function MillionaireDashboard() {
  const [username, setUsername] = useState('')
  const [quizName, setQuizName] = useState('')
  const [questions, setQuestions] = useState(Array.from({ length: 10 }, emptyQuestion))
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const [quizzes, setQuizzes] = useState<any[]>([])
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
    const decoded = decodeURIComponent(name)
    setUsername(decoded)
    fetchQuizzes(decoded)
  }, [])

  async function fetchQuizzes(name: string) {
    try {
      const res = await fetch(`/api/millionaire/${name}/current`)
      const data = await res.json()

      const res2 = await fetch(`/api/millionaire/list?streamer=${name}`)
      const data2 = await res2.json()
      setQuizzes(data2.quizzes || [])
    } catch {}
  }

  function updateQuestion(index: number, field: string, value: string) {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  async function createQuiz() {
    if (!quizName.trim()) {
      setStatus({ msg: 'Donne un nom au quiz', type: 'error' })
      return
    }
    const filled = questions.filter(q => q.question.trim() && q.optionA.trim() && q.optionB.trim() && q.optionC.trim() && q.optionD.trim())
    if (filled.length < 10) {
      setStatus({ msg: 'Remplis les 10 questions', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/millionaire/create-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamerUsername: username, quizName, questions: filled }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ msg: 'Quiz cree !', type: 'success' })
        setQuizName('')
        setQuestions(Array.from({ length: 10 }, emptyQuestion))
        fetchQuizzes(username)
      } else {
        setStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setStatus({ msg: 'Erreur serveur', type: 'error' })
    }
    setSubmitting(false)
  }

  async function activateQuiz(gameId: string) {
    await fetch('/api/millionaire/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamerUsername: username, gameId }),
    })
    fetchQuizzes(username)
  }

  function copyObsLink() {
    const url = `${window.location.origin}/millionaire-overlay.html?streamer=${username}&server=${window.location.origin}`
    navigator.clipboard.writeText(url)
    setObsCopied(true)
    setTimeout(() => setObsCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
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

        {quizzes.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Tes quizzes</h2>
            <div className="space-y-2">
              {quizzes.map((q: any) => (
                <div key={q.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{q.name || 'Sans nom'}</p>
                    <p className="text-gray-500 text-xs">{q.status}</p>
                  </div>
                  {q.status === 'ready' && (
                    <button
                      onClick={() => activateQuiz(q.id)}
                      className="bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1 text-sm font-semibold"
                    >
                      Activer
                    </button>
                  )}
                  {q.status === 'active' && (
                    <span className="text-green-400 text-sm font-medium">En cours</span>
                  )}
                  {q.status === 'finished' && (
                    <button
                      onClick={() => activateQuiz(q.id)}
                      className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-1 text-sm"
                    >
                      Rejouer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Creer un nouveau quiz</h2>
          <input
            type="text"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            placeholder="Nom du quiz (ex: Quiz Guest 1)"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-4"
          />

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Question {i + 1} — {AMOUNTS[i]}</p>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                  placeholder="Texte de la question"
                  className="w-full bg-gray-700 rounded-lg p-2 text-sm outline-none mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1">
                    <input type="radio" name={`correct-${i}`} checked={q.correctOption === 'A'} onChange={() => updateQuestion(i, 'correctOption', 'A')} />
                    <input type="text" value={q.optionA} onChange={(e) => updateQuestion(i, 'optionA', e.target.value)} placeholder="A" className="flex-1 bg-gray-700 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="radio" name={`correct-${i}`} checked={q.correctOption === 'B'} onChange={() => updateQuestion(i, 'correctOption', 'B')} />
                    <input type="text" value={q.optionB} onChange={(e) => updateQuestion(i, 'optionB', e.target.value)} placeholder="B" className="flex-1 bg-gray-700 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="radio" name={`correct-${i}`} checked={q.correctOption === 'C'} onChange={() => updateQuestion(i, 'correctOption', 'C')} />
                    <input type="text" value={q.optionC} onChange={(e) => updateQuestion(i, 'optionC', e.target.value)} placeholder="C" className="flex-1 bg-gray-700 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="radio" name={`correct-${i}`} checked={q.correctOption === 'D'} onChange={() => updateQuestion(i, 'correctOption', 'D')} />
                    <input type="text" value={q.optionD} onChange={(e) => updateQuestion(i, 'optionD', e.target.value)} placeholder="D" className="flex-1 bg-gray-700 rounded-lg p-2 text-sm outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={createQuiz}
            disabled={submitting}
            className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? 'Creation...' : 'Creer le quiz'}
          </button>

          {status && (
            <p className={`text-sm mt-3 ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {status.msg}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}