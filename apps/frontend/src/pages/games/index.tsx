import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface Game {
  id: string
  type: 'crash' | 'plinko'
  name: string
  rtp: number
}

export default function GamesPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, updateBalance } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    fetchGames()
    fetchBalance()
  }, [isAuthenticated])

  const fetchGames = async () => {
    try {
      const { data } = await api.get('/games')
      setGames(data)
    } catch (error) {
      console.error('Failed to fetch games:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const { data } = await api.get('/users/balance')
      updateBalance(data.balance)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  const handleLogout = () => {
    logout()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/')
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐵</span>
          <h1 className="text-2xl font-bold">Monkey Games</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-dark-card px-4 py-2 rounded-xl">
            <span className="text-gray-400 text-sm">Баланс:</span>
            <span className="ml-2 font-bold text-primary-light">
              ${user?.balance?.toFixed(2) || '0.00'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-4 mb-6">
        <Link
          href="/games"
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold"
        >
          🎮 Игры
        </Link>
        <Link
          href="/wallet"
          className="px-4 py-2 rounded-xl bg-dark-light text-gray-400 hover:text-white transition-colors"
        >
          💰 Кошелёк
        </Link>
        <Link
          href="/bonus"
          className="px-4 py-2 rounded-xl bg-dark-light text-gray-400 hover:text-white transition-colors"
        >
          🎁 Бонусы
        </Link>
        {user?.isAdmin && (
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-dark-light text-gray-400 hover:text-white transition-colors"
          >
            ⚙️ Админка
          </Link>
        )}
      </nav>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Space Monkey - Crash */}
        <Link
          href="/games/crash"
          className="game-card group cursor-pointer hover:border-primary/50 transition-all"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl">🚀</span>
                <span className="text-sm text-gray-400">
                  RTP: {games.find((g) => g.type === 'crash')?.rtp || 96}%
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-2 group-hover:text-primary-light transition-colors">
                Space Monkey
              </h2>
              <p className="text-gray-400">
                Космическая краш-игра. Успей забрать выигрыш до крушения!
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                  Provably Fair
                </span>
                <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-sm">
                  Live
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Plinko Monkey */}
        <Link
          href="/games/plinko"
          className="game-card group cursor-pointer hover:border-primary/50 transition-all"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-xl"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl">🎯</span>
                <span className="text-sm text-gray-400">
                  RTP: {games.find((g) => g.type === 'plinko')?.rtp || 96}%
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-2 group-hover:text-primary-light transition-colors">
                Plinko Monkey
              </h2>
              <p className="text-gray-400">
                Бросай мяч и выигрывай до 35x! Классический Plinko.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                  Provably Fair
                </span>
                <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-sm">
                  Мгновенный результат
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">📊 Последние игры</h3>
        <div className="game-card">
          <div className="text-center text-gray-400 py-8">
            История игр пуста. Начните играть!
          </div>
        </div>
      </div>
    </div>
  )
}
