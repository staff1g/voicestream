'use client'

import { useState, useRef, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatterSendPage({ params }: { params: Promise<{ streamerUsername: string }> }) {
  const { streamerUsername } = use(params)
  const router = useRouter()
  const [chatterUsername, setChatterUsername] = useState('')
  const [passes, setPasses] = useState(0)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<any>(null)
  const chunks = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const name = document.cookie
      .split('; ')
      .find(r => r.startsWith('chatter_username='))
      ?.split('=')[1]

    if (!name) {
      router.push('/')
      return
    }
    setChatterUsername(decodeURIComponent(name))
    fetchPasses(decodeURIComponent(name))
  }, [])

  async function fetchPasses(name: string) {
    const res = await fetch(`/api/passes?chatter=${name}&streamer=${streamerUsername}`)
    const data = await res.json()
    setPasses(data.passes || 0)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      mediaRecorder.current = new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data)
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current.start()
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 9) { stopRecording(); return s }
          return s + 1
        })
      }, 1000)
    } catch {
      setStatus({ msg: 'Autorise le micro !', type: 'error' })
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop()
    }
    clearInterval(timerRef.current)
    setRecording(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      setStatus({ msg: 'Choisis un fichier audio', type: 'error' })
      return
    }

    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      if (audio.duration > 30) {
        setStatus({ msg: 'Le fichier doit faire 30 secondes maximum', type: 'error' })
        URL.revokeObjectURL(url)
        return
      }
      setAudioBlob(file)
      setAudioUrl(url)
      setStatus(null)
    }
  }

  async function sendVoice() {
    if (!audioBlob) return
    if (passes <= 0) {
      setStatus({ msg: 'Tu n as pas de passes disponibles', type: 'error' })
      return
    }
    setSending(true)
    const form = new FormData()
    form.append('audio', audioBlob, audioBlob instanceof File ? audioBlob.name : 'voice.webm')
    form.append('streamer', streamerUsername)
    form.append('chatter_username', chatterUsername)

    try {
      const res = await fetch('/api/voice/send', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        setStatus({ msg: `Envoye ! Position #${data.position}`, type: 'success' })
        setAudioBlob(null)
        setAudioUrl('')
        fetchPasses(chatterUsername)
      } else {
        setStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setStatus({ msg: 'Serveur inaccessible', type: 'error' })
    }
    setSending(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-1">Voice Message</h1>
        <p className="text-gray-400 text-sm mb-2">
          Envoie ta voix au stream de <span className="text-purple-400">@{streamerUsername}</span>
        </p>
        <p className="text-sm mb-8">
          Passes disponibles : <span className="font-bold text-green-400">{passes}</span>
        </p>

        {recording && (
          <p className={`text-lg font-bold mb-4 ${seconds >= 8 ? 'text-red-400' : 'text-purple-400'}`}>
            {seconds}s / 10s
          </p>
        )}

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording() }}
          onTouchEnd={stopRecording}
          disabled={sending || passes <= 0}
          className={`w-24 h-24 rounded-full text-4xl mx-auto mb-4 flex items-center justify-center transition-all ${
            recording
              ? 'bg-red-500 animate-pulse'
              : passes <= 0
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {recording ? 'Stop' : 'Mic'}
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-800"></div>
          <span className="text-gray-600 text-xs">ou</span>
          <div className="flex-1 h-px bg-gray-800"></div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || passes <= 0}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium mb-4 disabled:opacity-50"
        >
          Choisir un fichier audio
        </button>

        {audioUrl && (
          <audio controls src={audioUrl} className="w-full mb-4" />
        )}

        {audioUrl && !recording && (
          <button
            onClick={sendVoice}
            disabled={sending}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold mb-4 disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer au stream'}
          </button>
        )}

        {status && (
          <div className={`rounded-xl p-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-900 text-green-300'
              : 'bg-red-900 text-red-300'
          }`}>
            {status.msg}
          </div>
        )}

        <p className="text-gray-600 text-xs mt-6">Enregistrement: 10s max - Fichier: 30s max</p>
      </div>
    </main>
  )
}