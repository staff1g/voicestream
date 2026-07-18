'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDating() {
  const [username, setUsername] = useState('')
  const [matches, setMatches] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const name = document.cookie.split('; ').find(r => r.startsWith('kick_username='))?.split('=')[1]
    if (!name) { router.push('/'); return }
    const decoded = decodeURIComponent(name)
    setUsername(decoded)
    fetchMatches(decoded)
  }, [])

  async function fetchMatches(name: string) {
    const res = await fetch(`/api/dating/admin-matches?streamer=${name}`)
    const data = await res.json()
    setMatches(data.matches || [])
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-white mb-2 inline-block">
              Retour au dashboard
            </a>
            <h1 className="text-2xl font-bold">Dating - Matches</h1>
          </div>
          <span className="text-gray-400">@{username}</span>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun match pour le moment</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m: any) => (
              <div key={m.id} className="bg-gray-900 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-pink-400">{m.person1.name}</p>
                    <p className="text-gray-500 text-xs">{m.person1.gender}</p>
                    {m.person1.discord && <p className="text-purple-400 text-xs">Discord: {m.person1.discord}</p>}
                  </div>
                  <span className="text-2xl">❤️</span>
                  <div>
                    <p className="font-medium text-pink-400">{m.person2.name}</p>
                    <p className="text-gray-500 text-xs">{m.person2.gender}</p>
                    {m.person2.discord && <p className="text-purple-400 text-xs">Discord: {m.person2.discord}</p>}
                  </div>
                </div>
                <p className="text-gray-600 text-xs">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
} 
