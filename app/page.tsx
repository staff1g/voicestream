'use client'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
  <img src="/logo.svg" alt="BezBez" width={200} height={200} />
</div>
        <p className="text-gray-400 text-lg mb-8">
          Messages vocaux en direct, jeux interactifs, statistiques de stream. tout ce qu'il faut pour animer ta communaute Kick. Bienvenue chez les BezBeziens.
        </p>

        <div className="space-y-4">
          <a href="/api/auth/kick" className="block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all">
            Je suis streamer
          </a>
          <a href="/api/auth/chatter" className="block bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all">
            Je suis chatter
          </a>
        </div>

        <p className="text-gray-600 text-sm mt-6">
          Gratuit - Aucune carte requise
        </p>
      </div>
    </main>
  )
}