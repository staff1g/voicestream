'use client'

import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [username, setUsername] = useState('')
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    // Handle Username
    const name = document.cookie
      .split('; ')
      .find(r => r.startsWith('kick_username='))
      ?.split('=')[1]

    if (name) {
      setUsername(decodeURIComponent(name))
    }

    //  Handle OBS Update Popup check
    const hasDismissedPopup = localStorage.getItem('obs_auth_update_dismissed')
    if (!hasDismissedPopup) {
      setShowPopup(true)
    }
  }, [])

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    window.location.href = '/'
  }

  function closePopup() {
    setShowPopup(false)
  }

  function neverShowAgain() {
    localStorage.setItem('obs_auth_update_dismissed', 'true')
    setShowPopup(false)
  }

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
      href: '/dashboard/dating',
      icon: 'ti-heart',
      title: 'Dating',
      desc: 'Voir les matches de tes viewers',
      color: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-400',
      glow: 'group-hover:shadow-pink-500/20',
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
      desc: 'Voir activite de tes chatters',
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
    {
      href: '/dashboard/stream-stats',
      icon: 'ti-broadcast',
      title: 'Stream statistics',
      desc: 'Unique chatters et activite par stream',
      color: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-400',
      glow: 'group-hover:shadow-rose-500/20',
    },
    {
      href: '/dashboard/chatter-moderation',
      icon: 'ti-shield-off',
      title: 'Chatter moderation',
      desc: 'Ban or unban chatters from voice messages',
      color: 'from-red-500/20 to-orange-500/20',
      iconColor: 'text-red-400',
      glow: 'group-hover:shadow-red-500/20',
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
              <i className="ti ti-microphone-2 text-white text-lg"></i>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">BezBez</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
              <span className="text-sm text-gray-300">{username}</span>
            </div>
            <button onClick={logout} className="flex items-center gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-colors">
              <i className="ti ti-logout text-base"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tes outils</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tools.map((tool) => (
            <a key={tool.href} href={tool.href} className={`group relative rounded-2xl p-5 bg-gradient-to-br ${tool.color} backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-xl ${tool.glow}`}>
              <div className="absolute inset-0 rounded-2xl bg-gray-950/40"></div>
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 ${tool.iconColor}`}>
                  <i className={`ti ${tool.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-white text-base mb-1">{tool.title}</p>
                <p className="text-gray-400 text-sm">{tool.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* UPDATE NOTIFICATION POPUP */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
              <i className="ti ti-alert-triangle text-2xl text-purple-400"></i>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Mise à jour requise</h3>
            
           <p className="text-gray-300 text-sm mb-6 leading-relaxed">
           Suite à une mise à jour de sécurité, tu dois récupérer ton{" "}
           <strong className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-base font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20">
             nouveau lien OBS
           </strong>{" "}
           depuis l'outil "Voice messages" pour que l'overlay continue de fonctionner.
           <span className="mt-2 block font-medium text-gray-200">
             L'ancien lien ne marchera plus.
           </span>
</p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closePopup}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={neverShowAgain}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-600/20"
              >
                Ne plus afficher
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}