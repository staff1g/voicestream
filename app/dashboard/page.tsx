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

  const tools = [
    {
      href: '/dashboard/voice-messages',
      icon: 'ti-microphone-2',
      title: 'Voice messages',
      desc: 'Recois des messages vocaux en direct',
      color: 'from-purple-500/20 to-fuchsia-500/20',
      iconColor: 'text-purple-400',
      glow: 'group-hover:shadow-purple-500/20',
    },
    {
      href: '/dashboard/games',
      icon: 'ti-message-question',
      title: 'Guess the word',
      desc: 'Cree un quiz pour ton chat',
      color: 'from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400',
      glow: 'group-hover:shadow-cyan-500/20',
    },
    {
      href: '/dashboard/chatter-stats',
      icon: 'ti-chart-bar',
      title: 'Chatter statistics',
      desc: 'Voir l activite de tes chatters',
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/20',
    },
    {
      href: '/dashboard/millionaire',
      icon: 'ti-diamond',
      title: 'Qui veut gagner des millions',
      desc: 'Quiz personnel avec overlay OBS',
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      glow: 'group-hover:shadow-amber-500/20',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <i className="ti ti-microphone-2 text-white text-lg" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">VoiceStream</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
            <span className="text-sm text-gray-300">@{username}</span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tes outils</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tools.map((tool) => (
            
              key={tool.href}
              href={tool.href}
              className={`group relative rounded-2xl p-5 bg-gradient-to-br ${tool.color} backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-xl ${tool.glow}`}
            >
              <div className="absolute inset-0 rounded-2xl bg-gray-950/40" />
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 ${tool.iconColor}`}>
                  <i className={`ti ${tool.icon} text-xl`} />
                </div>
                <p className="font-medium text-white text-base mb-1">{tool.title}</p>
                <p className="text-gray-400 text-sm">{tool.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}