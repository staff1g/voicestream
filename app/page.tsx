'use client'

import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const [checking, setChecking] = useState(true)
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    redirected.current = true

    fetch('/api/auth/session')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('no session')
      })
      .then(data => {
        // Full browser navigation : no React re-render loop
        if (data.role === 'streamer') {
          window.location.replace('/dashboard')
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        setChecking(false)
      })
  }, [])

  if (checking) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/logo.svg" alt="BezBez" width={200} height={200} />
        </div>
        <p className="text-gray-400 text-lg mb-8">
          Messages vocaux en direct, jeux interactifs, statistiques de stream. tout ce qu&apos;il faut pour animer ta communaute Kick. Bienvenue chez les BezBeziens.
        </p>

        <div className="space-y-4">
          <a href="/api/auth/kick" className="block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all">
            Je suis streamer
          </a>
          <a href="/api/auth/chatter" className="block bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all">
            Je suis chatter
          </a>
        </div>

        <p className="text-gray-600 text-sm mt-6">
          Gratuit - Aucune carte requise
        </p>
      </div>
    </main>
  )
}
