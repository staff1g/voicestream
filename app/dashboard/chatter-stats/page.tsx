 
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatterStatsDashboard() {
  const [username, setUsername] = useState('')
  const [chatters, setChatters] = useState<any[]>([])
  const [selectedChatter, setSelectedChatter] = useState<any>(null)
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
    fetchChatters(decoded)
  }, [])

  async function fetchChatters(name: string) {
    const res = await fetch(`/api/streamer/chatter-stats?streamer=${name}`)
    const data = await res.json()
    setChatters(data.chatters || [])
  }

  async function viewChatter(chatterUsername: string) {
    const res = await fetch(`/api/streamer/chatter-stats?streamer=${username}&chatter=${chatterUsername}`)
    const data = await res.json()
    setSelectedChatter(data)
  }

  if (selectedChatter) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setSelectedChatter(null)} className="text-sm text-gray-500 hover:text-white mb-6">
            Retour a la liste
          </button>

          <h1 className="text-2xl font-bold mb-8">{selectedChatter.chatter}</h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-1">Streams suivis</p>
              <p className="text-3xl font-bold text-purple-400">{selectedChatter.presenceCount}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-1">Messages envoyes</p>
              <p className="text-3xl font-bold text-green-400">{selectedChatter.totalMessages}</p>
            </div>
          </div>

          {selectedChatter.lastSeen && (
            <p className="text-gray-500 text-sm">
              Dernier message: {new Date(selectedChatter.lastSeen).toLocaleString()}
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-white mb-2 inline-block">
              Retour au dashboard
            </a>
            <h1 className="text-2xl font-bold">Chatter statistics</h1>
          </div>
          <span className="text-gray-400">@{username}</span>
        </div>

        {chatters.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune activite enregistree pour le moment</p>
        ) : (
          <div className="space-y-2">
            {chatters.map((c: any) => (
              <button
                key={c.username}
                onClick={() => viewChatter(c.username)}
                className="w-full bg-gray-900 hover:bg-gray-800 rounded-lg p-4 flex items-center justify-between transition-all"
              >
                <span className="font-medium">{c.username}</span>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>{c.presenceCount} streams</span>
                  <span>{c.totalMessages} messages</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}