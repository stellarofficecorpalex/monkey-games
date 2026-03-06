import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { io, Socket } from 'socket.io-client'

interface CrashState {
  state: 'waiting' | 'running' | 'crashed'
  multiplier: number
  crashPoint: number | null
  bets: Bet[]
  history: HistoryItem[]
}

interface Bet {
  username: string
  betAmount: number
  cashedOut: boolean
  cashoutMultiplier?: number
}

interface HistoryItem {
  crashPoint: number
  timestamp: number
}

export default function CrashGame() {
  const router = useRouter()
  const { user, isAuthenticated, updateBalance } = useAuthStore()
  const [betAmount, setBetAmount] = useState('10')
  const [autoCashout, setAutoCashout] = useState('2.0')
  const [gameState, setGameState] = useState<CrashState>({
    state: 'waiting',
    multiplier: 1.0,
    crashPoint: null,
    bets: [],
    history: [],
  })
  const [myBet, setMyBet] = useState<{
    placed: boolean
    amount: number
    cashedOut: boolean
    multiplier?: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // Connect to WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'
    socketRef.current = io(`${wsUrl}/crash`, {
      transports: ['websocket'],
    })

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join', { userId: user?.id })
    })

    socketRef.current.on('gameState', (state: CrashState) => {
      setGameState(state)
    })

    socketRef.current.on('multiplier', (data: { multiplier: number }) => {
      setGameState((prev) => ({ ...prev, multiplier: data.multiplier }))
    })

    socketRef.current.on('roundStart', (data: { crashPointHash: string }) => {
      setGameState((prev) => ({ ...prev, state: 'running' }))
      setMyBet(null)
    })

    socketRef.current.on('crash', (data: { crashPoint: number }) => {
      setGameState((prev) => ({
        ...prev,
        state: 'crashed',
        crashPoint: data.crashPoint,
      }))
    })

    socketRef.current.on('cashout', (data: any) => {
      if (data.username === user?.username) {
        setMyBet({
          placed: true,
          amount: data.winAmount / data.multiplier,
          cashedOut: true,
          multiplier: data.multiplier,
        })
        updateBalance(Number(user?.balance) + data.winAmount)
      }
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [isAuthenticated])

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = 'transparent'
    ctx.clearRect(0, 0, width, height)

    if (gameState.state === 'waiting') {
      // Draw waiting state
      ctx.fillStyle = '#9686c9'
      ctx.font = 'bold 24px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Ожидание ставок...', width / 2, height / 2)
      return
    }

    // Draw multiplier curve
    const points: { x: number; y: number }[] = []
    const maxMultiplier = Math.min(gameState.multiplier * 1.5, 10)
    const timeRange = 10000 // 10 seconds

    // Generate curve points
    for (let i = 0; i <= 100; i++) {
      const t = i / 100
      const m = 1 + (gameState.multiplier - 1) * t
      const x = (t * width * 0.8) + width * 0.1
      const y = height - ((m - 1) / (maxMultiplier - 1)) * height * 0.7 - height * 0.1
      points.push({ x, y })
    }

    // Draw curve
    ctx.beginPath()
    ctx.strokeStyle = gameState.state === 'crashed' ? '#c93333' : '#498a29'
    ctx.lineWidth = 3
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    // Draw multiplier text
    ctx.fillStyle = gameState.state === 'crashed' ? '#c93333' : '#498a29'
    ctx.font = 'bold 48px Inter'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${gameState.multiplier.toFixed(2)}x`,
      width / 2,
      height / 2
    )

    if (gameState.state === 'crashed') {
      ctx.font = 'bold 32px Inter'
      ctx.fillStyle = '#c93333'
      ctx.fillText('CRASHED!', width / 2, height / 2 + 50)
    }
  }, [gameState.multiplier, gameState.state])

  const placeBet = async () => {
    if (!betAmount || loading) return
    setLoading(true)

    try {
      // Place bet via API (deducts balance)
      await api.post(`/games/${gameState.crashPoint ? 'crash-game-id' : 'crash-game-id'}/play`, {
        betAmount: parseFloat(betAmount),
        clientSeed: Math.random().toString(36).substring(7),
        autoCashout: parseFloat(autoCashout),
      })

      setMyBet({
        placed: true,
        amount: parseFloat(betAmount),
        cashedOut: false,
      })

      // Send bet to socket
      socketRef.current?.emit('bet', {
        userId: user?.id,
        username: user?.username,
        betAmount: parseFloat(betAmount),
        autoCashout: parseFloat(autoCashout),
      })

      updateBalance(Number(user?.balance) - parseFloat(betAmount))
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при ставке')
    } finally {
      setLoading(false)
    }
  }

  const cashout = () => {
    if (!myBet || myBet.cashedOut || gameState.state !== 'running') return
    socketRef.current?.emit('cashout', { userId: user?.id })
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/games" className="flex items-center gap-2 text-gray-400 hover:text-white">
          ← Назад
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-2xl">🚀</span>
          <h1 className="text-xl font-bold">Space Monkey</h1>
        </div>
        <div className="bg-dark-card px-4 py-2 rounded-xl">
          <span className="text-primary-light font-bold">
            ${user?.balance?.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Game Area */}
      <div className="game-card mb-6">
        {/* Graph */}
        <div className="crash-graph mb-6">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-full"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">Ставка ($)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="input-field"
              placeholder="10"
              disabled={gameState.state === 'running'}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">Авто-кэшаут (x)</label>
            <input
              type="number"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              className="input-field"
              placeholder="2.0"
              step="0.1"
              disabled={gameState.state === 'running'}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            {!myBet ? (
              <button
                onClick={placeBet}
                disabled={loading || gameState.state === 'running'}
                className="btn-success w-full"
              >
                {loading ? 'Загрузка...' : 'Поставить'}
              </button>
            ) : myBet.cashedOut ? (
              <button disabled className="btn-primary w-full opacity-50">
                Забрано: {myBet.multiplier?.toFixed(2)}x
              </button>
            ) : (
              <button
                onClick={cashout}
                disabled={gameState.state !== 'running'}
                className="btn-danger w-full"
              >
                Забрать ${(myBet.amount * gameState.multiplier).toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="game-card">
        <h3 className="text-lg font-bold mb-4">📊 История</h3>
        <div className="flex flex-wrap gap-2">
          {gameState.history.map((item, i) => (
            <span
              key={i}
              className={`px-3 py-1 rounded-lg font-mono ${
                item.crashPoint < 2
                  ? 'bg-red-900/30 text-red-400'
                  : item.crashPoint < 10
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-purple-900/30 text-purple-400'
              }`}
            >
              {item.crashPoint.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
