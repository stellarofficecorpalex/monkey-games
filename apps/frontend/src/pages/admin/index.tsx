import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface Stats {
  totalUsers: number
  totalGames: number
  totalBets: number
  totalWins: number
  profit: number
}

interface Game {
  id: string
  type: string
  name: string
  rtp: number
  minRtp: number
  maxRtp: number
}

interface User {
  id: string
  username: string
  email: string
  balance: number
  isActive: boolean
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'games' | 'users'>('stats')

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      router.push('/games')
      return
    }
    fetchData()
  }, [isAuthenticated, user])

  const fetchData = async () => {
    try {
      const [statsRes, gamesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/games'),
      ])
      setStats(statsRes.data)
      setGames(gamesRes.data)
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRtp = async (gameId: string, rtp: number) => {
    try {
      await api.patch(`/admin/games/${gameId}/rtp`, { rtp })
      setGames(games.map(g => g.id === gameId ? { ...g, rtp } : g))
      alert('RTP обновлён!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка')
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive })
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u))
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  if (!isAuthenticated || !user?.isAdmin || loading) {
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
        <Link href="/games" className="text-gray-400 hover:text-white">
          ← Назад к играм
        </Link>
        <h1 className="text-2xl font-bold">⚙️ Админка</h1>
        <div></div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['stats', 'games', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-dark-light text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'stats' ? '📊 Статистика' : tab === 'games' ? '🎮 Игры' : '👥 Пользователи'}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="game-card">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-gray-400 text-sm">Пользователей</div>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="game-card">
            <div className="text-4xl mb-2">🎮</div>
            <div className="text-gray-400 text-sm">Активных игр</div>
            <div className="text-3xl font-bold">{stats.totalGames}</div>
          </div>
          <div className="game-card">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-gray-400 text-sm">Всего ставок</div>
            <div className="text-3xl font-bold">${Number(stats.totalBets).toFixed(2)}</div>
          </div>
          <div className="game-card">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-gray-400 text-sm">Всего выигрышей</div>
            <div className="text-3xl font-bold">${Number(stats.totalWins).toFixed(2)}</div>
          </div>
          <div className="game-card col-span-full">
            <div className="text-4xl mb-2">📈</div>
            <div className="text-gray-400 text-sm">Прибыль платформы</div>
            <div className={`text-4xl font-bold ${Number(stats.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${Number(stats.profit).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{game.name}</h3>
                  <p className="text-gray-400 capitalize">{game.type}</p>
                </div>
                <span className="text-4xl">{game.type === 'crash' ? '🚀' : '🎯'}</span>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  RTP: {game.rtp}% (от {game.minRtp}% до {game.maxRtp}%)
                </label>
                <input
                  type="range"
                  min={game.minRtp}
                  max={game.maxRtp}
                  step="0.5"
                  value={game.rtp}
                  onChange={(e) => {
                    const newRtp = parseFloat(e.target.value)
                    setGames(games.map(g => g.id === game.id ? { ...g, rtp: newRtp } : g))
                  }}
                  onMouseUp={() => updateRtp(game.id, game.rtp)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{game.minRtp}% (казино)</span>
                  <span className="text-primary-light font-bold">{game.rtp}%</span>
                  <span>{game.maxRtp}% (игрок)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="game-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3">Пользователь</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Баланс</th>
                <th className="pb-3">Статус</th>
                <th className="pb-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800">
                  <td className="py-3">{u.username}</td>
                  <td className="py-3 text-gray-400">{u.email}</td>
                  <td className="py-3">${u.balance.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {u.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleUserStatus(u.id, !u.isActive)}
                      className={`px-3 py-1 rounded text-sm ${
                        u.isActive ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                      }`}
                    >
                      {u.isActive ? 'Заблокировать' : 'Разблокировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Нет пользователей
            </div>
          )}
        </div>
      )}
    </div>
  )
}
