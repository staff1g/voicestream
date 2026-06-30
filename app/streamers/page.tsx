'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Streamers() {
  const [username, setUsername] = useState('')
  const [streamers, setStreamers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const name = document.cookie
      .split('; ')
      .find(r => r.startsWith('chatter_username='))
      ?.split('=')[1]

    if (!name) {
      router.push('/')
      return
    }
    setUsername(decodeURIComponent(name))
    fetchStreamers()
  }, [])

  async function fetchStreamers() {
    const res = await fetch('/api/streamers')
    const data = await res.json()
    setStreamers(data.streamers || [])
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">VoiceStream</h1>
          <span className="text-gray-400">@{username}</span>
        </div>

        <h2 className="text-lg font-semibold mb-4">Choisis un streamer</h2>

        {streamers.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun streamer disponible pour le moment</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {streamers.map((s: any) => (
              <a key={s.id} href={`/chatter/${s.username}`} className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-all">
                <p className="font-medium text-lg">{s.username}</p>
                <p className="text-gray-400 text-sm mt-1">Envoyer un message vocal</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}