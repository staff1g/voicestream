 
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

export default function MyMatches({ params }: { params: Promise<{ streamerUsername: string }> }) {
  const { streamerUsername } = use(params)
  const router = useRouter()
  const [matches, setMatches] = useState<any[]>([])

  useEffect(() => {
    const name = document.cookie.split('; ').find(r => r.startsWith('chatter_username='))?.split('=')[1]
    if (!name) { router.push('/'); return }
    fetchMatches(decodeURIComponent(name))
  }, [])

  async function fetchMatches(name: string) {
    const res = await fetch(`/api/dating/matches?chatter=${name}&streamer=${streamerUsername}`)
    const data = await res.json()
    setMatches(data.matches || [])
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <a href={`/dating/${streamerUsername}`} className="text-sm text-gray-500 hover:text-white">
            Retour
          </a>
          <h1 className="text-xl font-bold">Mes matches</h1>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">Pas encore de match</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m: any) => (
              <div key={m.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.display_name}</p>
                  {m.discord_username && (
                    <p className="text-purple-400 text-sm">Discord: {m.discord_username}</p>
                  )}
                </div>
                <p className="text-gray-500 text-xs">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}