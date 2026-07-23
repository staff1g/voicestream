'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
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
    fetchProfile(decoded)
  }, [])

  async function fetchProfile(name: string) {
    try {
      const res = await fetch(`/api/profile?username=${name}&role=streamer`)
      const data = await res.json()
      if (data.profile?.profile_picture) {
        setProfilePicture(data.profile.profile_picture)
      }
    } catch {}
  }

  if (!username) return null

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