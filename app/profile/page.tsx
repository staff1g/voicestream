 
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const streamerName = document.cookie.split('; ').find(r => r.startsWith('kick_username='))?.split('=')[1]
    const chatterName = document.cookie.split('; ').find(r => r.startsWith('chatter_username='))?.split('=')[1]

    if (streamerName) {
      const decoded = decodeURIComponent(streamerName)
      setUsername(decoded)
      setRole('streamer')
      fetchProfile(decoded, 'streamer')
    } else if (chatterName) {
      const decoded = decodeURIComponent(chatterName)
      setUsername(decoded)
      setRole('chatter')
      fetchProfile(decoded, 'chatter')
    } else {
      router.push('/')
    }
  }, [])

  async function fetchProfile(name: string, r: string) {
    const res = await fetch(`/api/profile?username=${name}&role=${r}`)
    const data = await res.json()
    if (data.profile) {
      setBio(data.profile.bio || '')
      setProfilePicture(data.profile.profile_picture || '')
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('role', role)
      form.append('bio', bio)
      if (imageFile) {
        form.append('image', imageFile)
      }

      const res = await fetch('/api/profile', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        setStatus({ msg: 'Profil sauvegarde !', type: 'success' })
        if (imagePreview) {
          setProfilePicture(imagePreview)
          setImageFile(null)
          setImagePreview('')
        }
      } else {
        setStatus({ msg: data.error || 'Erreur', type: 'error' })
      }
    } catch {
      setStatus({ msg: 'Erreur serveur', type: 'error' })
    }
    setSaving(false)
  }

  const displayPicture = imagePreview || profilePicture

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white">
            Retour
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 hover:border-purple-500 cursor-pointer overflow-hidden flex items-center justify-center transition-colors mb-3"
          >
            {displayPicture ? (
              <img src={displayPicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <i className="ti ti-camera text-2xl text-gray-500"></i>
                <p className="text-gray-500 text-xs mt-1">Photo</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <p className="text-gray-300 font-medium">{username}</p>
          <p className="text-gray-500 text-xs">{role === 'streamer' ? 'Streamer' : 'Chatter'}</p>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Parle un peu de toi..."
            className="w-full bg-gray-800 rounded-lg p-3 text-sm outline-none h-24 resize-none"
          />
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>

        {status && (
          <p className={`text-sm mt-3 text-center ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {status.msg}
          </p>
        )}
      </div>
    </main>
  )
}