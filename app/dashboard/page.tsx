'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [username, setUsername] = useState('')
  const [queue, setQueue] = useState<any[]>([])
  const [origin, setOrigin] = useState('')
  const [rewardId, setRewardId] = useState('')
  const [webhookStatus, setWebhookStatus] = useState<{ msg: string; type: string } | null>(null)
  const [chatters, setChatters] = useState<any[]>([])
  const [newChatterName, setNewChatterName] = useState('')
  const [newChatterAmount, setNewChatterAmount] = useState('1')
  const [giveStatus, setGiveStatus] = useState<{ msg: string; type: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    setOrigin(window.location.origin)
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
    fetchQueue(decoded)
    fetchChatters(decoded)
  }, [])

  async function fetchQueue(name: string) {
    const res = await fetch(`/api/queue?username=${name}`)
    const data = await res.json()
    setQueue(data.queue || [])
  }

  async function fetchChatters(name: string) {
    const res = await fetch(`/api/streamer/chatters?streamer=${name}`)
    const data = await res.json()
    setChatters(data.chatters || [])
  }

  async function activateWebhook() {
    if (!rewardId) {
      setWebhookStatus({ msg: 'Entre un Reward ID', type: 'error' })
      return
    }
    setWebhookStatus({ msg: 'Activation...', type: 'info' })
    try {
      const res = await fetch('/api/streamer/subscribe-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, rewardId }),
      })
      const data = await res.json()
      if (res.ok) {
        setWebhookStatus({ msg: 'Webhook active !', type: 'success' })
      } else {
        setWebhookStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setWebhookStatus({ msg: 'Erreur serveur', type: 'error' })
    }
  }

  async function givePass() {
    if (!newChatterName.trim()) {
      setGiveStatus({ msg: 'Entre un pseudo', type: 'error' })
      return
    }
    setGiveStatus({ msg: 'En cours...', type: 'info' })
    try {
      const res = await fetch('/api/streamer/give-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamerUsername: username,
          chatterUsername: newChatterName.trim(),
          amount: newChatterAmount,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setGiveStatus({ msg: `Pass(es) donne(s) a ${newChatterName}`, type: 'success' })
        setNewChatterName('')
        setNewChatterAmount('1')
        fetchChatters(username)
      } else {
        setGiveStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setGiveStatus({ msg: 'Erreur serveur', type: 'error' })
    }
  }

  const obsUrl = `${origin}/obs-overlay.html?streamer=${username}&server=${origin}`
  const chatterUrl = `${origin}/chatter/${username}`

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">VoiceStream</h1>
          <span className="text-gray-400">@{username}</span>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Page chatters</h2>
          <p className="text-gray-400 text-sm mb-3">Partage ce lien dans ton chat Kick :</p>
          <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-green-400 break-all">
            {chatterUrl}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">OBS Browser Source</h2>
          <p className="text-gray-400 text-sm mb-3">Copie ce lien dans OBS :</p>
          <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-purple-400 break-all">
            {obsUrl}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Channel Points Reward</h2>
          <p className="text-gray-400 text-sm mb-3">
            Cree un reward sur Kick et colle son ID ici pour activer les passes automatiques.
          </p>
          <input
            type="text"
            value={rewardId}
            onChange={(e) => setRewardId(e.target.value)}
            placeholder="Reward ID"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm mb-3 outline-none"
          />
          <button
            onClick={activateWebhook}
            className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Activer
          </button>
          {webhookStatus && (
            <p className={`text-sm mt-3 ${
              webhookStatus.type === 'success' ? 'text-green-400' :
              webhookStatus.type === 'error' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {webhookStatus.msg}
            </p>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Donner des passes manuellement</h2>
          <p className="text-gray-400 text-sm mb-3">
            Donne des passes a un chatter sans passer par les channel points.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newChatterName}
              onChange={(e) => setNewChatterName(e.target.value)}
              placeholder="Pseudo Kick du chatter"
              className="flex-1 bg-gray-800 rounded-lg p-3 text-sm outline-none"
            />
            <input
              type="number"
              min="1"
              value={newChatterAmount}
              onChange={(e) => setNewChatterAmount(e.target.value)}
              className="w-20 bg-gray-800 rounded-lg p-3 text-sm outline-none"
            />
          </div>
          <button
            onClick={givePass}
            className="bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Donner
          </button>
          {giveStatus && (
            <p className={`text-sm mt-3 ${
              giveStatus.type === 'success' ? 'text-green-400' :
              giveStatus.type === 'error' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {giveStatus.msg}
            </p>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Chatters ({chatters.length})
            </h2>
            <button
              onClick={() => fetchChatters(username)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Refresh
            </button>
          </div>
          {chatters.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun chatter pour le moment</p>
          ) : (
            <div className="space-y-2">
              {chatters.map((c: any) => (
                <div key={c.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="font-medium">{c.username}</span>
                  <span className="text-sm text-green-400">{c.passes} passes</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Queue ({queue.length} messages)
            </h2>
            <button
              onClick={() => fetchQueue(username)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Refresh
            </button>
          </div>
          {queue.length === 0 ? (
            <p className="text-gray-500 text-sm">Mafamach messages tawa</p>
          ) : (
            <div className="space-y-3">
              {queue.map((msg: any) => (
                <div key={msg.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{msg.chatter_username}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <audio controls src={msg.file_url} className="h-8" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}