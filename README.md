# 🐵 Monkey Games

**Space Monkey & Plinko Monkey** — iGaming платформа с Provably Fair системой.

## 🎮 Функции

- ✅ **Две игры**: Space Monkey (Crash) + Plinko Monkey
- ✅ **Provably Fair**: полная верификация честности каждого раунда
- ✅ **RTP Control**: ползунок RTP от 70% до 99% в админке
- ✅ **Бонусная система**: Welcome, Daily, Referral бонусы
- ✅ **Кошелёк**: Депозиты и выводы
- ✅ **Telegram Web App**: интеграция с Telegram
- ✅ **Админка**: управление пользователями и RTP

## 🛠 Технологии

- **Backend**: NestJS, PostgreSQL, Redis, WebSocket
- **Frontend**: Next.js, React, Tailwind CSS, Socket.io
- **Auth**: JWT + Refresh Tokens
- **Security**: bcrypt, helmet, rate-limiting

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
cd monkey-games

# Установка зависимостей
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..
```

### 2. Запуск базы данных

```bash
docker-compose up -d
```

### 3. Настройка окружения

```bash
cp apps/backend/.env.example apps/backend/.env
```

Отредактируйте `.env`:
```env
JWT_SECRET=your-super-secret-key
DB_PASSWORD=postgres
```

### 4. Заполнение базы данных

```bash
cd apps/backend
npm run seed
```

### 5. Запуск в development режиме

```bash
# Из корня проекта
npm run dev
```

- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs

## 📁 Структура проекта

```
monkey-games/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/     # Аутентификация
│   │   │   ├── games/    # Игровой движок
│   │   │   ├── users/    # Пользователи
│   │   │   ├── wallet/   # Кошелёк
│   │   │   ├── bonus/    # Бонусы
│   │   │   └── admin/    # Админка
│   │   └── ...
│   └── frontend/         # Next.js Web App
│       ├── src/
│       │   ├── pages/
│       │   │   ├── games/    # Игры
│       │   │   ├── admin/    # Админка
│       │   │   ├── wallet/   # Кошелёк
│       │   │   └── bonus/    # Бонусы
│       │   └── ...
│       └── ...
├── docker-compose.yml
└── package.json
```

## 🔐 Provably Fair

Каждый раунд можно верифицировать:

1. **Server Seed** — генерируется сервером (хеш показывается до игры)
2. **Client Seed** — задаётся игроком или генерируется случайно
3. **Nonce** — номер раунда игрока

### Формула Crash:
```
hash = SHA256(server_seed + client_seed + nonce)
crash_point = max(1, 2^52 / (parseInt(hash.slice(0,13), 16) + 1) * (1 - house_edge))
```

### Формула Plinko:
```
hash = SHA256(server_seed + client_seed + nonce)
path[i] = hash[i % 64] % 2  // 0 = лево, 1 = право
```

## 🎛 Админка

Доступ: http://localhost:3001/admin

**Логин**: `admin`  
**Пароль**: `admin123`

Функции:
- 📊 Статистика платформы
- 🎮 Управление RTP игр (ползунок 70-99%)
- 👥 Управление пользователями
- 📝 История раундов

## 📱 Telegram Bot

1. Создайте бота через @BotFather
2. Добавьте токен в `.env`:
```env
TELEGRAM_BOT_TOKEN=your-bot-token
```
3. Настройте Web App URL в BotFather

## 🚢 Деплой на VPS

```bash
# Сборка
npm run build

# Запуск через PM2
pm2 start npm --name "monkey-backend" -- run start:backend
pm2 start npm --name "monkey-frontend" -- run start:frontend
```

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `POST /api/auth/refresh` — Обновление токенов

### Games
- `GET /api/games` — Список игр
- `POST /api/games/:id/play` — Играть
- `POST /api/games/:id/verify` — Верификация раунда

### Wallet
- `GET /api/wallet/balance` — Баланс
- `POST /api/wallet/deposit` — Депозит
- `POST /api/wallet/withdraw` — Вывод

### Admin (требует прав админа)
- `GET /api/admin/stats` — Статистика
- `PATCH /api/admin/games/:id/rtp` — Изменить RTP
- `GET /api/admin/users` — Список пользователей

## 📝 Лицензия

MIT

---

**Разработано с 💜 для Monkey Games**
