import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface Bonus {
  id: string
  type: 'welcome' | 'deposit' | 'referral' | 'daily' | 'vip'
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled'
  amount: number
  wagered: number
  wageringRequirement: number
  expiresAt: string
  createdAt: string
}

export default function BonusPage() {
  const router = useRouter()
  const { user, isAuthenticated, updateBalance } = useAuthStore()
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [activeBonus, setActiveBonus] = useState<Bonus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchData()
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      const [bonusesRes, activeRes] = await Promise.all([
        api.get('/bonus'),
        api.get('/bonus/active'),
      ])
      setBonuses(bonusesRes.data)
      setActiveBonus(activeRes.data)
    } catch (error) {
      console.error('Failed to fetch bonuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimWelcome = async () => {
    setClaiming('welcome')
    try {
      await api.post('/bonus/welcome')
      fetchData()
      alert('Welcome бонус активирован! Сделайте первый депозит для получения бонуса.')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка')
    } finally {
      setClaiming(null)
    }
  }

  const claimDaily = async () => {
    setClaiming('daily')
    try {
      const { data } = await api.post('/bonus/daily')
      fetchData()
      const balanceRes = await api.get('/users/balance')
      updateBalance(balanceRes.data.balance)
      alert(`Получено $${data.amount}!`)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка')
    } finally {
      setClaiming(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return '🎉'
      case 'deposit': return '💳'
      case 'referral': return '👥'
      case 'daily': return '📅'
      case 'vip': return '👑'
      default: return '🎁'
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'welcome': return 'Welcome бонус'
      case 'deposit': return 'Депозитный бонус'
      case 'referral': return 'Реферальный бонус'
      case 'daily': return 'Ежедневный бонус'
      case 'vip': return 'VIP бонус'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/30 text-yellow-400'
      case 'active': return 'bg-green-900/30 text-green-400'
      case 'completed': return 'bg-blue-900/30 text-blue-400'
      case 'expired': return 'bg-red-900/30 text-red-400'
      default: return 'bg-gray-800 text-gray-400'
    }
  }

  const getStatusName = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает'
      case 'active': return 'Активен'
      case 'completed': return 'Выполнен'
      case 'expired': return 'Истёк'
      default: return status
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const hasWelcomeBonus = bonuses.some(b => b.type === 'welcome')

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/games" className="text-gray-400 hover:text-white">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold">🎁 Бонусы</h1>
        <div></div>
      </header>

      {/* Active Bonus Progress */}
      {activeBonus && (
        <div className="game-card mb-6">
          <h3 className="text-lg font-bold mb-3">🎯 Активный бонус</h3>
          <div className="flex items-center justify-between mb-2">
            <span>{getTypeName(activeBonus.type)}</span>
            <span className="text-primary-light font-bold">${activeBonus.amount}</span>
          </div>
          <div className="w-full bg-dark-light rounded-full h-3 mb-2">
            <div
              className="bg-primary rounded-full h-3 transition-all"
              style={{
                width: `${Math.min(100, (activeBonus.wagered / (activeBonus.amount * activeBonus.wageringRequirement)) * 100)}%`,
              }}
            />
          </div>
          <div className="text-sm text-gray-400">
            Отыграно: ${activeBonus.wagered.toFixed(2)} / ${(activeBonus.amount * activeBonus.wageringRequirement).toFixed(2)}
          </div>
        </div>
      )}

      {/* Available Bonuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Daily Bonus */}
        <div className="game-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📅</span>
            <div>
              <h3 className="text-lg font-bold">Ежедневный бонус</h3>
              <p className="text-gray-400 text-sm">$5 каждый день</p>
            </div>
          </div>
          <button
            onClick={claimDaily}
            disabled={claiming !== null}
            className="btn-success w-full"
          >
            {claiming === 'daily' ? 'Загрузка...' : 'Забрать $5'}
          </button>
        </div>

        {/* Welcome Bonus */}
        <div className="game-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🎉</span>
            <div>
              <h3 className="text-lg font-bold">Welcome бонус</h3>
              <p className="text-gray-400 text-sm">100% на первый депозит до $500</p>
            </div>
          </div>
          <button
            onClick={claimWelcome}
            disabled={hasWelcomeBonus || claiming !== null}
            className={`${hasWelcomeBonus ? 'bg-gray-700' : 'btn-primary'} w-full py-3 rounded-xl font-semibold`}
          >
            {hasWelcomeBonus ? 'Уже активирован' : claiming === 'welcome' ? 'Загрузка...' : 'Активировать'}
          </button>
        </div>

        {/* Referral Bonus */}
        <div className="game-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">👥</span>
            <div>
              <h3 className="text-lg font-bold">Реферальная программа</h3>
              <p className="text-gray-400 text-sm">10% от депозитов друзей</p>
            </div>
          </div>
          <div className="bg-dark-light p-3 rounded-xl text-center text-sm">
            <p className="text-gray-400 mb-1">Ваша реферальная ссылка:</p>
            <code className="text-primary-light">
              https://t.me/monkey_games_bot?start={user?.id}
            </code>
          </div>
        </div>

        {/* VIP */}
        <div className="game-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">👑</span>
            <div>
              <h3 className="text-lg font-bold">VIP статус</h3>
              <p className="text-gray-400 text-sm">Эксклюзивные бонусы и кэшбэк</p>
            </div>
          </div>
          <div className="text-center text-gray-400 py-3">
            Недоступен. Играйте больше для повышения уровня!
          </div>
        </div>
      </div>

      {/* Bonus History */}
      <div className="game-card">
        <h3 className="text-lg font-bold mb-4">📊 История бонусов</h3>
        <div className="space-y-3">
          {bonuses.map((bonus) => (
            <div key={bonus.id} className="flex items-center justify-between p-3 bg-dark-light rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getTypeIcon(bonus.type)}</span>
                <div>
                  <div className="font-semibold">{getTypeName(bonus.type)}</div>
                  <div className="text-gray-400 text-sm">
                    {new Date(bonus.createdAt).toLocaleDateString('ru')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary-light">${bonus.amount}</div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(bonus.status)}`}>
                  {getStatusName(bonus.status)}
                </span>
              </div>
            </div>
          ))}

          {bonuses.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Нет бонусов
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
