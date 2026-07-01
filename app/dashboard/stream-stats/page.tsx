 
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StreamStats() {
  const [username, setUsername] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
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
  }, [])

  async function fetchStats(name: string) {
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
          <span className="text-gray-400">@{username}</span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun stream enregistre pour le moment</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s: any) => (
              <div key={s.id} className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">{formatDate(s.started_at)}</p>
                  <p className="text-sm text-gray-500">{formatDuration(s.started_at, s.ended_at)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Unique chatters</p>
                    <p className="text-2xl font-bold text-purple-400">{s.uniqueChatters}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Messages total</p>
                    <p className="text-2xl font-bold text-cyan-400">{s.totalMessages}</p>
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