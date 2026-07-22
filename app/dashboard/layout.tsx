'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  if (!username) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar username={username} />
      <main className="ml-56 min-h-screen">
        {children}
      </main>
    </div>
  )
}