'use client'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4">VoiceStream</h1>
        <p className="text-gray-400 text-lg mb-8">
          Laisse tes chatters Kick t envoyer des messages vocaux en direct sur ton stream
        </p>
        <a href="/api/auth/kick" className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all">
          Connecte ton compte Kick
        </a>
        <p className="text-gray-600 text-sm mt-6">
          Gratuit - Aucune carte requise - Setup en 2 minutes
        </p>
      </div>
    </main>
  )
}