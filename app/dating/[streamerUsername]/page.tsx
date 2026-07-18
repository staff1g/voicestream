'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

export default function DatingPage({ params }: { params: Promise<{ streamerUsername: string }> }) {
  const { streamerUsername } = use(params)
  const router = useRouter()
  const [chatterUsername, setChatterUsername] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matched, setMatched] = useState(false)
  const [matchName, setMatchName] = useState('')
  const [formData, setFormData] = useState({ displayName: '', bio: '', discord: '', gender: '', lookingFor: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const name = document.cookie.split('; ').find(r => r.startsWith('chatter_username='))?.split('=')[1]
    if (!name) { router.push('/'); return }
    const decoded = decodeURIComponent(name)
    setChatterUsername(decoded)
    fetchProfile(decoded)
  }, [])

  async function fetchProfile(name: string) {
    const res = await fetch(`/api/dating/profile?chatter=${name}&streamer=${streamerUsername}`)
    const data = await res.json()
    if (data.profile) {
      setProfile(data.profile)
      fetchProfiles(name)
    }
  }

  async function fetchProfiles(name: string) {
    const res = await fetch(`/api/dating/profiles-to-swipe?chatter=${name}&streamer=${streamerUsername}`)
    const data = await res.json()
    setProfiles(data.profiles || [])
    setCurrentIndex(0)
  }

  async function saveProfile() {
    if (!formData.displayName || !formData.gender || !formData.lookingFor) return
    setSaving(true)
    const res = await fetch('/api/dating/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatterUsername,
        streamerUsername,
        displayName: formData.displayName,
        bio: formData.bio,
        discordUsername: formData.discord,
        gender: formData.gender,
        lookingFor: formData.lookingFor,
      }),
    })
    const data = await res.json()
    if (data.profile) {
      setProfile(data.profile)
      fetchProfiles(chatterUsername)
    }
    setSaving(false)
  }

  async function swipe(liked: boolean) {
    const target = profiles[currentIndex]
    if (!target || !profile) return

    const res = await fetch('/api/dating/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromProfileId: profile.id, toProfileId: target.id, liked }),
    })
    const data = await res.json()

    if (data.matched) {
      setMatched(true)
      setMatchName(target.display_name)
      setTimeout(() => { setMatched(false); setMatchName('') }, 3000)
    }

    setCurrentIndex(i => i + 1)
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2 text-center">Cree ton profil</h1>
          <p className="text-gray-400 text-sm text-center mb-6">Dating sur le stream de @{streamerUsername}</p>

          <input
            type="text"
            value={formData.displayName}
            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="Ton prenom ou pseudo"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3"
          />
          <textarea
            value={formData.bio}
            onChange={e => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Bio (optionnel)"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3 h-20 resize-none"
          />
          <input
            type="text"
            value={formData.discord}
            onChange={e => setFormData({ ...formData, discord: e.target.value })}
            placeholder="Discord username (optionnel)"
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none mb-3"
          />

          <p className="text-gray-400 text-sm mb-2">Je suis :</p>
          <div className="flex gap-2 mb-4">
            {['Homme', 'Femme'].map(g => (
              <button
                key={g}
                onClick={() => setFormData({ ...formData, gender: g })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${formData.gender === g ? 'bg-purple-600' : 'bg-gray-800'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="text-gray-400 text-sm mb-2">Je cherche :</p>
          <div className="flex gap-2 mb-6">
            {['Homme', 'Femme'].map(g => (
              <button
                key={g}
                onClick={() => setFormData({ ...formData, lookingFor: g })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${formData.lookingFor === g ? 'bg-pink-600' : 'bg-gray-800'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            onClick={saveProfile}
            disabled={saving || !formData.displayName || !formData.gender || !formData.lookingFor}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Commencer'}
          </button>
        </div>
      </main>
    )
  }

  const currentProfile = profiles[currentIndex]

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Dating</h1>
          <a href={`/dating/${streamerUsername}/matches`} className="text-sm text-purple-400 hover:text-purple-300">
            Mes matches
          </a>
        </div>

        {matched && (
          <div className="bg-pink-600/30 border border-pink-500 rounded-xl p-6 mb-6 text-center animate-pulse">
            <p className="text-2xl font-bold text-pink-400">Match !</p>
            <p className="text-gray-300 mt-2">Toi et {matchName} vous vous aimez bien</p>
          </div>
        )}

        {!currentProfile ? (
          <div className="bg-gray-900 rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-lg mb-2">Plus de profils</p>
            <p className="text-gray-600 text-sm">Reviens plus tard pour decouvrir de nouvelles personnes</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            {currentProfile.photo_url && (
              <img src={currentProfile.photo_url} alt="" className="w-full h-64 object-cover" />
            )}
            {!currentProfile.photo_url && (
              <div className="w-full h-64 bg-gray-800 flex items-center justify-center text-6xl">
                {currentProfile.gender === 'Homme' ? '👨' : '👩'}
              </div>
            )}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">{currentProfile.display_name}</h2>
              <p className="text-gray-400 text-sm mb-4">{currentProfile.bio || 'Pas de bio'}</p>

              <div className="flex gap-4">
                <button
                  onClick={() => swipe(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-red-600/30 rounded-xl text-2xl transition-colors"
                >
                  ✕
                </button>
                <button
                  onClick={() => swipe(true)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-green-600/30 rounded-xl text-2xl transition-colors"
                >
                  ♥
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}