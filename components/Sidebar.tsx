'use client'

import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/dashboard', icon: 'ti-home', label: 'Dashboard' },
  { href: '/dashboard/voice-messages', icon: 'ti-microphone-2', label: 'Voice messages' },
  { href: '/dashboard/games', icon: 'ti-message-question', label: 'Guess the word' },
  { href: '/dashboard/chatter-stats', icon: 'ti-chart-bar', label: 'Chatter stats' },
  { href: '/dashboard/millionaire', icon: 'ti-diamond', label: 'Millionaire' },
  { href: '/dashboard/stream-stats', icon: 'ti-broadcast', label: 'Stream stats' },
  { href: '/dashboard/dating', icon: 'ti-heart', label: 'Dating' },
  { href: '/dashboard/chatter-moderation', icon: 'ti-shield-off', label: 'Moderation' },
]

export default function Sidebar({ username }: { username: string }) {
  const pathname = usePathname()

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-gray-950 border-r border-white/5 flex flex-col z-40">
      <div className="p-4 flex items-center gap-2">
        <img src="/logo.svg" alt="BezBez" width={28} height={28} />
        <span className="text-white font-semibold text-sm">BezBez</span>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = pathname === item.href
          return (
            <a key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <i className={`ti ${item.icon} text-lg`}></i>
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-600/10 hover:text-red-400 transition-all w-full">
          <i className="ti ti-logout text-lg"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
