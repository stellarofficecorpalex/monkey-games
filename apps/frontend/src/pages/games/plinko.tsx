import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

interface PlinkoResult {
  path: number[]
  position: number
  multiplier: number
  slots: number
  hash: string
}

interface GameResult {
  roundId: string
  result: PlinkoResult
  winAmount: number
  balance: number
  provablyFair: {
    serverSeedHash: string
    clientSeed: string
    nonce: number
  }
}

export default function PlinkoGame() {
  const router = useRouter()
  const { user, isAuthenticated, updateBalance } = useAuthStore()
  const [betAmount, setBetAmount] = useState('10')
  const [rows, setRows] = useState(12)
  const [result, setResult] = useState<GameResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0, visible: false })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameIdRef = useRef<string | null>(null)

  // Multipliers based on rows
  const multipliers: Record<number, number[]> = {
    8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    12: [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0],
    14: [18.0, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 18.0],
    16: [35.0, 11.0, 4.0, 2.0, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 2.0, 4.0, 11.0, 35.0],
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // Fetch plinko game ID
    fetchGameId()
  }, [isAuthenticated])

  const fetchGameId = async () => {
    try {
      const { data } = await api.get('/games')
      const plinkoGame = data.find((g: any) => g.type === 'plinko')
      if (plinkoGame) {
        gameIdRef.current = plinkoGame.id
      }
    } catch (error) {
      console.error('Failed to fetch game:', error)
    }
  }

  const play = async () => {
    if (!betAmount || loading || animating) return
    setLoading(true)
    setResult(null)

    try {
      const { data } = await api.post(`/games/${gameIdRef.current}/play`, {
        betAmount: parseFloat(betAmount),
        rows,
        clientSeed: Math.random().toString(36).substring(7),
      })

      setResult(data)
      updateBalance(data.balance)

      // Animate ball
      animateBall(data.result)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при ставке')
    } finally {
      setLoading(false)
    }
  }

  const animateBall = (result: PlinkoResult) => {
    setAnimating(true)
    const canvas = canvasRef.current
    if (!canvas) {
      setAnimating(false)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setAnimating(false)
      return
    }

    const width = canvas.width
    const height = canvas.height
    const slotWidth = width / (rows + 1)
    const rowHeight = height / (rows + 2)

    let currentRow = 0
    let currentX = width / 2
    let currentY = rowHeight / 2

    const animate = () => {
      // Clear previous ball
      drawBoard(ctx, width, height, result)

      if (currentRow <= rows) {
        // Draw ball at current position
        ctx.beginPath()
        ctx.arc(currentX, currentY, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.fill()
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.stroke()

        // Move to next position
        if (currentRow < result.path.length) {
          const direction = result.path[currentRow]
          currentX += (direction === 1 ? 1 : -1) * (slotWidth / 2)
        }
        currentY += rowHeight
        currentRow++

        requestAnimationFrame(animate)
      } else {
        // Ball landed
        setAnimating(false)
        highlightSlot(ctx, width, height, result.position)
      }
    }

    animate()
  }

  const drawBoard = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    result?: PlinkoResult
  ) => {
    ctx.clearRect(0, 0, width, height)

    const slotWidth = width / (rows + 1)
    const rowHeight = height / (rows + 2)

    // Draw pegs
    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 3
      const startX = (width - (pegsInRow - 1) * slotWidth) / 2

      for (let peg = 0; peg < pegsInRow; peg++) {
        const x = startX + peg * slotWidth
        const y = (row + 1) * rowHeight

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#9686c9'
        ctx.fill()
      }
    }

    // Draw slots at bottom
    const slots = rows + 1
    const slotStartX = slotWidth / 2
    const currentMultipliers = multipliers[rows] || multipliers[12]

    for (let i = 0; i < slots; i++) {
      const x = slotStartX + i * slotWidth
      const multiplier = currentMultipliers[i]

      // Slot background color based on multiplier
      let bgColor: string
      if (multiplier >= 10) bgColor = 'rgba(150, 134, 201, 0.4)'
      else if (multiplier >= 3) bgColor = 'rgba(73, 138, 41, 0.4)'
      else if (multiplier >= 1) bgColor = 'rgba(46, 34, 96, 0.4)'
      else bgColor = 'rgba(201, 51, 51, 0.4)'

      ctx.fillStyle = bgColor
      ctx.fillRect(x - slotWidth / 2 + 2, height - 60, slotWidth - 4, 50)

      // Multiplier text
      ctx.fillStyle = '#f0f0f0'
      ctx.font = 'bold 14px Inter'
      ctx.textAlign = 'center'
      ctx.fillText(`${multiplier}x`, x, height - 25)
    }
  }

  const highlightSlot = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    position: number
  ) => {
    const slotWidth = width / (rows + 1)
    const x = slotWidth / 2 + position * slotWidth

    ctx.fillStyle = 'rgba(245, 158, 11, 0.5)'
    ctx.fillRect(x - slotWidth / 2, height - 65, slotWidth, 55)
  }

  const drawInitialBoard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBoard(ctx, canvas.width, canvas.height)
  }

  useEffect(() => {
    drawInitialBoard()
  }, [rows])

  const currentMultipliers = multipliers[rows] || multipliers[12]

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/games" className="flex items-center gap-2 text-gray-400 hover:text-white">
          ← Назад
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-2xl">🎯</span>
          <h1 className="text-xl font-bold">Plinko Monkey</h1>
        </div>
        <div className="bg-dark-card px-4 py-2 rounded-xl">
          <span className="text-primary-light font-bold">
            ${user?.balance?.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Board */}
        <div className="lg:col-span-2 game-card">
          <canvas
            ref={canvasRef}
            width={600}
            height={500}
            className="w-full max-w-[600px] mx-auto"
          />

          {/* Result display */}
          {result && !animating && (
            <div className="text-center mt-4">
              <div className="text-4xl font-bold mb-2">
                {result.winAmount > 0 ? (
                  <span className="text-green-400">
                    +${result.winAmount.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-red-400">
                    -${result.result.multiplier < 1 ? (parseFloat(betAmount) * (1 - result.result.multiplier)).toFixed(2) : '0.00'}
                  </span>
                )}
              </div>
              <div className="text-gray-400">
                Множитель: <span className="text-primary-light font-bold">{result.result.multiplier}x</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="game-card">
          <h3 className="text-lg font-bold mb-4">⚙️ Настройки</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ставка ($)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="input-field"
                placeholder="10"
                disabled={loading || animating}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Ряды: {rows}</label>
              <input
                type="range"
                min="8"
                max="16"
                step="2"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value))}
                className="w-full"
                disabled={loading || animating}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>8 (легко)</span>
                <span>16 (сложно)</span>
              </div>
            </div>

            <button
              onClick={play}
              disabled={loading || animating}
              className="btn-success w-full"
            >
              {loading ? 'Загрузка...' : animating ? 'Мяч падает...' : 'Бросить мяч'}
            </button>

            {/* Multipliers preview */}
            <div className="mt-6">
              <label className="block text-sm text-gray-400 mb-2">
                Множители ({rows} рядов)
              </label>
              <div className="flex flex-wrap gap-1">
                {currentMultipliers.map((m, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      m >= 10
                        ? 'bg-purple-900/50 text-purple-300'
                        : m >= 3
                        ? 'bg-green-900/50 text-green-300'
                        : m >= 1
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-red-900/50 text-red-300'
                    }`}
                  >
                    {m}x
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Provably Fair */}
          {result && (
            <div className="mt-6 p-3 bg-dark-light rounded-xl text-xs">
              <p className="text-gray-400 mb-1">🔒 Provably Fair</p>
              <p className="text-gray-500 truncate">
                Hash: {result.provablyFair.serverSeedHash.slice(0, 16)}...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
