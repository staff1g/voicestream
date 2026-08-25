'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BanToggle from '@/components/BanToggle'

interface Chatter {
  id: string
  username: string
  passes: number
  updated_at: string
}

interface BannedChatter {
  chatter_username: string
  banned_at: string
}

export default function ChatterModeration() {
  const [username, setUsername] = useState('')
  const [chatters, setChatters] = useState<Chatter[]>([])
  const [bannedChatters, setBannedChatters] = useState<BannedChatter[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'banned'>('all')
  const [page, setPage] = useState(0)

  const perPage = 10
  const router = useRouter()
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return

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
    hasFetched.current = true
    loadAll(decoded)
  }, [router])

  async function loadAll(name: string) {
    try {
      const [chattersRes, bannedRes] = await Promise.all([
        fetch(`/api/streamer/chatters?streamer=${name}`),
        fetch(`/api/streamer/ban?streamerUsername=${name}`)
      ])

      const chattersData = await chattersRes.json()
      const bannedData = await bannedRes.json()

      setChatters(chattersData.chatters || [])
      setBannedChatters(bannedData.bannedChatters || [])
    } catch {}
  }

  async function refreshBanned(name: string) {
    try {
      const res = await fetch(
        `/api/streamer/ban?streamerUsername=${name}`
      )

      const data = await res.json()
      setBannedChatters(data.bannedChatters || [])
    } catch {}
  }

  function isBanned(chatterUsername: string): boolean {
    return bannedChatters.some(
      b =>
        b.chatter_username.toLowerCase() ===
        chatterUsername.toLowerCase()
    )
  }

  const handleBanToggled = useCallback(() => {
    if (username) {
      refreshBanned(username)
    }
  }, [username])

  async function unbanChatter(chatterUsername: string) {
    try {
      const res = await fetch('/api/streamer/ban', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          streamerUsername: username,
          chatterUsername
        })
      })

      if (res.ok) {
        refreshBanned(username)
      }
    } catch {}
  }

  const allChattersWithBanStatus = chatters.map(chatter => ({
    ...chatter,
    isBanned: isBanned(chatter.username)
  }))

  const filtered =
    tab === 'all'
      ? allChattersWithBanStatus.filter(chatter =>
          chatter.username
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      : bannedChatters.filter(chatter =>
          chatter.chatter_username
            .toLowerCase()
            .includes(search.toLowerCase())
        )

  const totalPages = Math.ceil(filtered.length / perPage)

  const paginated = filtered.slice(
    page * perPage,
    (page + 1) * perPage
  )

  useEffect(() => {
    setPage(0)
  }, [search, tab])

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-white mb-2 inline-block transition-colors"
            >
              Retour au dashboard
            </a>

            <h1 className="text-2xl font-bold">
              Moderation des chatters
            </h1>
          </div>

          <span className="text-gray-400">
            @{username}
          </span>
        </div>

        {/* Voice message management */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            Gestion des messages vocaux
          </h2>

          <p className="text-gray-400 text-sm">
            Recherchez un chatter dans la liste ci-dessous et utilisez
            le bouton à droite pour lui autoriser ou interdire l&apos;envoi
            de messages vocaux.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'all'
                ? 'bg-purple-600'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Tous les chatters ({chatters.length})
          </button>

          <button
            onClick={() => setTab('banned')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'banned'
                ? 'bg-red-600'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Bannis ({bannedChatters.length})
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            tab === 'all'
              ? 'Rechercher un chatter...'
              : 'Rechercher un utilisateur banni...'
          }
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm outline-none mb-4 focus:border-purple-500 transition-colors"
        />

        {/* Chatter list */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {tab === 'all'
                ? 'Chatters'
                : 'Utilisateurs bannis'}
            </h2>

            <button
              onClick={() => loadAll(username)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>

          {paginated.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {search
                ? 'Aucun chatter trouve'
                : tab === 'banned'
                  ? 'Aucun utilisateur banni'
                  : 'Aucun chatter pour le moment'}
            </p>
          ) : tab === 'all' ? (
            <div className="space-y-2">
              {(paginated as (Chatter & {
                isBanned: boolean
              })[]).map((chatter, index) => (
                <div
                  key={chatter.id}
                  className="w-full bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-500 text-sm w-6 shrink-0">
                      {page * perPage + index + 1}
                    </span>

                    <span className="font-medium truncate">
                      {chatter.username}
                    </span>

                    <span className="text-sm text-green-400 shrink-0">
                      {chatter.passes} passes
                    </span>
                  </div>

                  <BanToggle
                    streamerUsername={username}
                    chatterUsername={chatter.username}
                    initiallyBanned={chatter.isBanned}
                    onToggle={handleBanToggled}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(paginated as BannedChatter[]).map(
                (chatter, index) => (
                  <div
                    key={chatter.chatter_username}
                    className="w-full bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gray-500 text-sm w-6 shrink-0">
                        {page * perPage + index + 1}
                      </span>

                      <span className="font-medium truncate">
                        {chatter.chatter_username}
                      </span>

                      <span className="text-gray-500 text-xs shrink-0">
                        Banni le{' '}
                        {new Date(
                          chatter.banned_at
                        ).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        unbanChatter(chatter.chatter_username)
                      }
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors shrink-0"
                    >
                      Debannir
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() =>
                  setPage(p => Math.max(0, p - 1))
                }
                disabled={page === 0}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-30 transition-colors"
              >
                Precedent
              </button>

              <span className="text-gray-400 text-sm">
                {page + 1} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setPage(p =>
                    Math.min(totalPages - 1, p + 1)
                  )
                }
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-30 transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}