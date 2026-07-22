'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatterStatsDashboard() {
  const [username, setUsername] = useState('')
  const [chatters, setChatters] = useState<any[]>([])
  const [selectedChatter, setSelectedChatter] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'messages' | 'streams'>('messages')
  const [page, setPage] = useState(0)
  const perPage = 10
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

  const filtered = chatters
    .filter((c: any) => c.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      if (sortBy === 'streams') return b.presenceCount - a.presenceCount
      return b.totalMessages - a.totalMessages
    })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage)

  useEffect(() => {
    setPage(0)
  }, [search, sortBy])

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

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un chatter..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm outline-none mb-4 focus:border-purple-500 transition-colors"
        />

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSortBy('messages')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${sortBy === 'messages' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            Par messages
          </button>
          <button
            onClick={() => setSortBy('streams')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${sortBy === 'streams' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            Par streams
          </button>
        </div>

        {paginated.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun chatter trouve</p>
        ) : (
          <div className="space-y-2">
            {paginated.map((c: any, i: number) => (
              <button
                key={c.username}
                onClick={() => viewChatter(c.username)}
                className="w-full bg-gray-900 hover:bg-gray-800 rounded-lg p-4 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">{page * perPage + i + 1}</span>
                  <span className="font-medium">{c.username}</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>{c.presenceCount} streams</span>
                  <span>{c.totalMessages} msgs</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-30"
            >
              Precedent
            </button>
            <span className="text-gray-400 text-sm">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-30"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </main>
  )
}