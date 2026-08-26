'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

type ApprovalStatus = 'checking' | 'approved' | 'pending' | 'rejected'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [status, setStatus] = useState<ApprovalStatus>('checking')
  const router = useRouter()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    checkApproval(decoded)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function checkApproval(name: string) {
    try {
      const res = await fetch(`/api/profile?username=${name}&role=streamer`)
      const data = await res.json()

      if (!data.profile) {
        // Record doesn't exist → rejected and deleted
        setStatus('rejected')
        stopPolling()
        return
      }

      if (data.profile.profile_picture) {
        setProfilePicture(data.profile.profile_picture)
      }

      if (data.profile.approved) {
        setStatus('approved')
        stopPolling()
      } else {
        setStatus('pending')
        startPolling(name)
      }
    } catch {
      setStatus('pending')
    }
  }

  function startPolling(name: string) {
    if (pollRef.current) return // already polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/profile?username=${name}&role=streamer`)
        const data = await res.json()

        if (!data.profile) {
          // Record deleted → rejected
          setStatus('rejected')
          stopPolling()
          return
        }

        if (data.profile.approved) {
          setStatus('approved')
          stopPolling()
          // Brief pause then reload to show full dashboard
          setTimeout(() => window.location.reload(), 1500)
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

  function logout() {
    document.cookie = 'kick_username=; path=/; max-age=0'
    document.cookie = 'kick_user_id=; path=/; max-age=0'
    router.push('/')
  }

  if (!username || status === 'checking') return null

  // ─── Rejected screen ───
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
          <h1 className="text-2xl font-bold text-white mb-3">
            Demande refusee
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Ta demande d&apos;acces a BezBez n&apos;a pas ete approuvee. Si tu penses
            qu&apos;il s&apos;agit d&apos;une erreur, contacte l&apos;administrateur.
          </p>
          <button
            onClick={logout}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    )
  }

  // ─── Pending screen (polls every 5s) ───
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
          <h1 className="text-2xl font-bold text-white mb-3">
            En attente d&apos;approbation
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            Ta demande d&apos;acces a ete envoyee. L&apos;administrateur de BezBez va examiner
            ton profil. Tu recevras un email des que ta demande sera approuvee ou refusee.
          </p>
          <p className="text-gray-600 text-xs mb-8">
            Cette page se met a jour automatiquement.
          </p>
          <button
            onClick={logout}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Deconnexion
          </button>
          <p className="text-gray-600 text-xs mt-6">
            Connecte en tant que @{username}
          </p>
        </div>
      </div>
    )
  }

  // ─── Approved: normal dashboard ───
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
