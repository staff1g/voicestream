'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [username, setUsername] = useState('')
  const [queue, setQueue] = useState<any[]>([])
  const [origin, setOrigin] = useState('')
  const router = useRouter()

  useEffect(() => {
    setOrigin(window.location.origin)
    const name = document.cookie
      .split('; ')
      .find(r => r.startsWith('kick_username='))
      ?.split('=')[1]
    
    if (!name) {
      router.push('/')
      return
    }
    setUsername(decodeURIComponent(name))
    fetchQueue(decodeURIComponent(name))
  }, [])

  async function fetchQueue(name: string) {
    const res = await fetch(`/api/queue?username=${name}`)
    const data = await res.json()
    setQueue(data.queue || [])
  }

  const obsUrl = `${origin}/obs-overlay.html?streamer=${username}&server=${origin}`
  const chatterUrl = `${origin}/s/${username}`

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">🎙️ VoiceStream</h1>
          <span className="text-gray-400">@{username}</span>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">🔗 Page chatters</h2>
          <p className="text-gray-400 text-sm mb-3">Partage ce lien dans ton chat Kick :</p>
          <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-green-400 break-all">
            {chatterUrl}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">📺 OBS Browser Source</h2>
          <p className="text-gray-400 text-sm mb-3">Copii ce lien fel OBS :</p>
          <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-purple-400 break-all">
            {obsUrl}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              📋 Queue ({queue.length} messages)
            </h2>
            <button
              onClick={() => fetchQueue(username)}
              className="text-sm text-gray-400 hover:text-white"
            >
              🔄 Refresh
            </button>
          </div>
          {queue.length === 0 ? (
            <p className="text-gray-500 text-sm">Mafamach messages tawa</p>
          ) : (
            <div className="space-y-3">
              {queue.map((msg: any) => (
                <div key={msg.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{msg.chatter_username}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <audio controls src={msg.file_url} className="h-8" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}