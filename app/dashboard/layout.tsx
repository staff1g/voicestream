'use client'

import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Status = 'checking' | 'approved' | 'pending' | 'rejected' | 'invalid'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [status, setStatus] = useState<Status>('checking')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    checkSession()
    return () => stopPolling()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/session')

      if (!res.ok) {
        setStatus('invalid')
        window.location.replace('/')
        return
      }

      const data = await res.json()
      setUsername(data.username)

      // Sync the kick_username cookie so child pages that still read it won't break
      document.cookie = `kick_username=${encodeURIComponent(data.username)}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`

      if (data.role !== 'streamer') {
        window.location.replace('/streamers')
        return
      }

      if (data.approved === true) {
        setStatus('approved')
        fetchProfilePicture(data.username)
      } else if (data.approved === false) {
        setStatus('pending')
        startPolling()
      }
    } catch {
      setStatus('invalid')
      window.location.replace('/')
    }
  }

  async function fetchProfilePicture(name: string) {
    try {
      const res = await fetch(`/api/profile?username=${name}&role=streamer`)
      const data = await res.json()
      if (data.profile?.profile_picture) {
        setProfilePicture(data.profile.profile_picture)
      }
    } catch {}
  }

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/session')

        if (!res.ok) {
          setStatus('rejected')
          stopPolling()
          return
        }

        const data = await res.json()

        if (data.approved === true) {
          setStatus('approved')
          setUsername(data.username)
          fetchProfilePicture(data.username)
          stopPolling()
        }
      } catch {}
    }, 5000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    document.cookie = 'kick_username=; path=/; max-age=0'
    window.location.href = '/'
  }

  // Don't render children until session is confirmed
  if (status === 'checking' || status === 'invalid') return null

  // ─── Rejected ───
  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Demande refusee</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Ta demande d&apos;acces a BezBez n&apos;a pas ete approuvee. Si tu penses
            qu&apos;il s&apos;agit d&apos;une erreur, contacte l&apos;administrateur.
          </p>
          <button onClick={logout} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors">
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    )
  }

  // ─── Pending ───
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">En attente d&apos;approbation</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            Ta demande d&apos;acces a ete envoyee. L&apos;administrateur de BezBez va examiner
            ton profil. Tu recevras un email des que ta demande sera approuvee ou refusee.
          </p>
          <p className="text-gray-600 text-xs mb-8 flex items-center justify-center gap-1">
          <span>Cette page se met a jour automatiquement.</span>
          <span className="inline-flex items-center gap-0.5 ml-1">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
          </span>
        </p>
          <button onClick={logout} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors">
            Deconnexion
          </button>
          <p className="text-gray-600 text-xs mt-6">Connecte en tant que @{username}</p>
        </div>
      </div>
    )
  }

  // ─── Approved ───
  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar username={username} />
      <main className="ml-56 min-h-screen">
        <div className="flex items-center justify-end p-4 border-b border-white/5">
          <a href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {profilePicture ? (
              <img src={profilePicture} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400 font-medium border border-white/10">
                {username?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span className="text-gray-300 text-sm">{username}</span>
          </a>
        </div>
        {children}
      </main>
    </div>
  )
}
