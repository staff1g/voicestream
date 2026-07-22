'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function GamesDashboard() {
  const [username, setUsername] = useState('')
  const [answer, setAnswer] = useState('')
  const [hint, setHint] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showWord, setShowWord] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState('#ffffff')
  const [brushSize, setBrushSize] = useState(4)
  const [isEraser, setIsEraser] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pollRef = useRef<any>(null)
  const [winner, setWinner] = useState<{ name: string; answer: string } | null>(null)

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
  pollRef.current = setInterval(() => {
    if (!document.querySelector('[data-winner-dialog]')) {
      fetchGameState()
    }
  }, 3000)
  return () => clearInterval(pollRef.current)
}, [gameId])

 useEffect(() => {
  if (!gameId) return
  fetchGameState()
  pollRef.current = setInterval(fetchGameState, 3000)
  return () => clearInterval(pollRef.current)
}, [gameId])

async function fetchGameState() {
  if (!gameId || winner) return
  const res = await fetch(`/api/games/${gameId}/current`)
  const data = await res.json()
  setGameState(data)
  if (data.question?.answered_by) {
    setWinner({ name: data.question.answered_by, answer: data.question.secret_answer })
  }
}

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.strokeStyle = isEraser ? '#1a1a2e' : brushColor
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw() {
    isDrawingRef.current = false
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  async function launchQuestion() {
    if (!answer.trim()) {
      setStatus({ msg: 'Entre une reponse', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('streamerUsername', username)
      form.append('answer', answer)
      form.append('hint', hint)
      if (imageFile) {
        form.append('image', imageFile)
      }

      const res = await fetch('/api/games/add-question', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (res.ok) {
        setGameId(data.gameId)
        setAnswer('')
        setHint('')
        setImageFile(null)
        setImagePreview('')
        setStatus(null)
        setShowWord(false)
        setDrawing(true)
        if (fileInputRef.current) fileInputRef.current.value = ''
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
    setShowWord(false)
    setDrawing(false)
  }

  const question = gameState?.question
  const COLORS = ['#ffffff', '#ff4444', '#44ff44', '#4488ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844']

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
            <p className="text-gray-500 text-sm mb-4">Question en cours</p>
            {question.image_url && (
              <img src={question.image_url} alt="Indice visuel" className="max-h-64 mx-auto mb-4 rounded-lg" />
            )}

            {drawing && (
              <div className="mb-4">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  className="border border-gray-700 rounded-lg cursor-crosshair mx-auto block"
                  style={{ background: '#1a1a2e' }}
                />
                <div className="flex items-center justify-center gap-2 mt-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setBrushColor(c); setIsEraser(false) }}
                      className="w-7 h-7 rounded-full border-2"
                      style={{ background: c, borderColor: brushColor === c && !isEraser ? '#fff' : 'transparent' }}
                    />
                  ))}
                  <button
                    onClick={() => setIsEraser(!isEraser)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${isEraser ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}
                  >
                    Gomme
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="px-3 py-1 bg-red-600 rounded-lg text-xs font-medium"
                  >
                    Effacer
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Taille:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-xs text-gray-400">{brushSize}px</span>
                </div>
              </div>
            )}

            {!drawing && (
              <button
                onClick={() => setDrawing(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-semibold mb-4"
              >
                Ouvrir le dessin
              </button>
            )}

            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {Array.from({ length: question.length }).map((_: unknown, i: number) => (
                <div key={i} className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-xl font-bold text-purple-400">
                  ?
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm mb-2">{question.length} lettres</p>
            {question.hint && (
              <p className="text-gray-400">Indice: {question.hint}</p>
            )}
            <p className="text-gray-600 text-sm mt-4">En attente d une bonne reponse dans le chat...</p>

            {question && (
              <div className="mt-4">
                <button
                  onClick={() => setShowWord(!showWord)}
                  className="text-sm text-gray-500 hover:text-purple-400 transition-colors"
                >
                  {showWord ? 'Cacher la reponse' : 'Voir la reponse'}
                </button>
                {showWord && (
                  <p className="text-purple-400 font-bold text-lg mt-2">{gameState?.question?.secret_answer}</p>
                )}
              </div>
            )}
          </div>
        )}

    {winner && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-gray-900 border border-green-500 rounded-2xl p-10 text-center max-w-md mx-4">
      <div className="text-5xl mb-4">🎉</div>
      <p className="text-green-400 font-bold text-2xl mb-2">Bonne reponse !</p>
      <p className="text-white text-3xl font-bold mb-4">{winner.answer}</p>
      <p className="text-gray-400 text-lg mb-6">
        Trouve par <span className="text-purple-400 font-semibold">{winner.name}</span>
      </p>
      <button
  onClick={async () => {
    await fetch('/api/games/next-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    })
    setWinner(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }}
  className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6 py-3 font-semibold"
>
  Question suivante
</button>
    </div>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium mb-3"
          >
            {imageFile ? imageFile.name : 'Ajouter une image (optionnel)'}
          </button>
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto mb-3 rounded-lg" />
          )}
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