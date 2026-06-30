'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [username, setUsername] = useState('')
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
    setUsername(decodeURIComponent(name))
  }, [])

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">VoiceStream</h1>
          <span className="text-gray-400">@{username}</span>
        </div>

        <h2 className="text-lg font-semibold mb-4">Outils</h2>

        <div className="grid grid-cols-2 gap-4">
          <a href="/dashboard/voice-messages" className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-all">
            <p className="font-medium text-lg">Voice messages</p>
            <p className="text-gray-400 text-sm mt-1">Recois des messages vocaux en direct</p>
          </a>
          <a href="/dashboard/games" className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-all">
            <p className="font-medium text-lg">Guess the word</p>
            <p className="text-gray-400 text-sm mt-1">Cree un quiz pour ton chat</p>
          </a>
          <a href="/dashboard/chatter-stats" className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-all">
            <p className="font-medium text-lg">Chatter statistics</p>
            <p className="text-gray-400 text-sm mt-1">Voir l activite de tes chatters</p>
          </a>
          <a href="/dashboard/millionaire" className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 transition-all">
            <p className="font-medium text-lg">Qui veut gagner des millions</p>
            <p className="text-gray-400 text-sm mt-1">Quiz personnel avec overlay OBS</p>
          </a>
        </div>
      </div>
    </main>
  )
}