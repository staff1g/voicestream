'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function StreamStats() {
  const [username, setUsername] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [tracking, setTracking] = useState(false)
  const pollRef = useRef<any>(null)
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
    fetchStats(decoded)
    return () => clearInterval(pollRef.current)
  }, [])

  async function fetchStats(name: string) {
    const res = await fetch(`/api/streamer/stream-stats?streamer=${name}`)
    const data = await res.json()
    setSessions(data.sessions || [])

    const hasActiveStream = (data.sessions || []).some((s: any) => !s.ended_at)
    if (hasActiveStream && !pollRef.current) {
      setTracking(true)
      takeSnapshot(name)
      pollRef.current = setInterval(() => takeSnapshot(name), 120000)
    }
  }

  async function takeSnapshot(name: string) {
    await fetch('/api/streamer/viewer-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamerUsername: name }),
    })
    const res = await fetch(`/api/streamer/stream-stats?streamer=${name}`)
    const data = await res.json()
    setSessions(data.sessions || [])
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return 'En cours'
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${mins}m`
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-white mb-2 inline-block">
              Retour au dashboard
            </a>
            <h1 className="text-2xl font-bold">Stream statistics</h1>
          </div>
          <div className="flex items-center gap-3">
            {tracking && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-400 text-xs">Tracking actif</span>
              </div>
            )}
            <span className="text-gray-400">@{username}</span>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun stream enregistre pour le moment</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s: any) => (
              <div key={s.id} className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {!s.ended_at && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                    <p className="text-sm text-gray-400">{formatDate(s.started_at)}</p>
                  </div>
                  <p className="text-sm text-gray-500">{formatDuration(s.started_at, s.ended_at)}</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Unique chatters</p>
                    <p className="text-xl font-bold text-purple-400">{s.uniqueChatters}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Messages</p>
                    <p className="text-xl font-bold text-cyan-400">{s.totalMessages}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Avg viewers</p>
                    <p className="text-xl font-bold text-emerald-400">{s.avgViewers}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Max viewers</p>
                    <p className="text-xl font-bold text-rose-400">{s.maxViewers}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}