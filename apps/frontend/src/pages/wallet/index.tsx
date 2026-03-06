import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus'
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}

export default function WalletPage() {
  const router = useRouter()
  const { user, isAuthenticated, updateBalance } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchTransactions()
  }, [isAuthenticated])

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get('/wallet/transactions')
      setTransactions(data.transactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/wallet/deposit', {
        amount: parseFloat(depositAmount),
        method: 'crypto',
      })
      setDepositAmount('')
      fetchTransactions()
      // Refresh balance
      const { data } = await api.get('/users/balance')
      updateBalance(data.balance)
      alert('Депозит успешно создан!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка')
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        walletAddress,
      })
      setWithdrawAmount('')
      setWalletAddress('')
      fetchTransactions()
      // Refresh balance
      const { data } = await api.get('/users/balance')
      updateBalance(data.balance)
      alert('Вывод создан и будет обработан в течение 24 часов')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '📥'
      case 'withdrawal': return '📤'
      case 'bet': return '🎮'
      case 'win': return '🏆'
      case 'bonus': return '🎁'
      default: return '💰'
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'deposit': return 'Депозит'
      case 'withdrawal': return 'Вывод'
      case 'bet': return 'Ставка'
      case 'win': return 'Выигрыш'
      case 'bonus': return 'Бонус'
      default: return type
    }
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
        <Link href="/games" className="text-gray-400 hover:text-white">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold">💰 Кошелёк</h1>
        <div></div>
      </header>

      {/* Balance Card */}
      <div className="game-card mb-6 text-center">
        <div className="text-gray-400 text-sm mb-2">Баланс</div>
        <div className="text-5xl font-bold text-primary-light">
          ${user?.balance?.toFixed(2) || '0.00'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['deposit', 'withdraw', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-dark-light text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'deposit' ? '📥 Депозит' : tab === 'withdraw' ? '📤 Вывод' : '📊 История'}
          </button>
        ))}
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div className="game-card">
          <h3 className="text-lg font-bold mb-4">Пополнить баланс</h3>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Сумма ($)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="input-field"
                placeholder="100"
                min="1"
                required
              />
            </div>

            <div className="flex gap-2">
              {[10, 50, 100, 500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1 py-2 rounded-xl bg-dark-light hover:bg-primary/20 transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <button type="submit" className="btn-success w-full">
              Пополнить
            </button>
          </form>
        </div>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div className="game-card">
          <h3 className="text-lg font-bold mb-4">Вывести средства</h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Сумма ($)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="input-field"
                placeholder="100"
                min="1"
                max={user?.balance}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Адрес кошелька</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="input-field"
                placeholder="USDT TRC20 адрес"
                required
              />
            </div>

            <button type="submit" className="btn-danger w-full">
              Вывести
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="game-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(tx.type)}</span>
                  <div>
                    <div className="font-semibold">{getTypeName(tx.type)}</div>
                    <div className="text-gray-400 text-sm">{tx.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}
                    ${tx.amount.toFixed(2)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(tx.createdAt).toLocaleString('ru')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="game-card text-center text-gray-400 py-8">
              История пуста
            </div>
          )}
        </div>
      )}
    </div>
  )
}
