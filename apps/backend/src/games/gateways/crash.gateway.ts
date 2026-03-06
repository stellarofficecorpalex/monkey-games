import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameEngineService } from '../services/game-engine.service';
import { GamesService } from '../games.service';
import { GameType } from '../entities/game.entity';

interface CrashBet {
  userId: string;
  username: string;
  betAmount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
}

@WebSocketGateway({
  namespace: '/crash',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
@Injectable()
export class CrashGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private crashGameId: string;
  private currentMultiplier = 1.0;
  private crashPoint = 1.0;
  private gameRunning = false;
  private bets: Map<string, CrashBet> = new Map();
  private gameInterval: NodeJS.Timeout | null = null;
  private gameState: 'waiting' | 'running' | 'crashed' = 'waiting';
  private gameHistory: any[] = [];

  constructor(
    private configService: ConfigService,
    private gameEngineService: GameEngineService,
    private gamesService: GamesService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Send current game state
    client.emit('gameState', {
      state: this.gameState,
      multiplier: this.currentMultiplier,
      crashPoint: this.gameRunning ? null : this.crashPoint,
      bets: Array.from(this.bets.values()),
      history: this.gameHistory.slice(-10),
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    client.data.userId = data.userId;
    client.emit('joined', { success: true });
  }

  @SubscribeMessage('bet')
  async handleBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; username: string; betAmount: number; autoCashout?: number },
  ) {
    if (this.gameState !== 'waiting') {
      client.emit('error', { message: 'Bets are closed for this round' });
      return;
    }

    // Store bet
    this.bets.set(client.id, {
      userId: data.userId,
      username: data.username,
      betAmount: data.betAmount,
      autoCashout: data.autoCashout,
      cashedOut: false,
    });

    // Broadcast bet to all clients
    this.server.emit('betPlaced', {
      username: data.username,
      betAmount: data.betAmount,
    });
  }

  @SubscribeMessage('cashout')
  async handleCashout(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    if (this.gameState !== 'running') {
      return;
    }

    const bet = this.bets.get(client.id);
    if (!bet || bet.cashedOut) {
      return;
    }

    bet.cashedOut = true;
    bet.cashoutMultiplier = this.currentMultiplier;

    // Broadcast cashout
    this.server.emit('cashout', {
      username: bet.username,
      multiplier: this.currentMultiplier,
      winAmount: bet.betAmount * this.currentMultiplier,
    });

    // Process cashout on backend
    // In production, this would interact with the game engine service
    console.log(`User ${bet.username} cashed out at ${this.currentMultiplier}x`);
  }

  async startGameRound() {
    if (this.gameRunning) return;

    // Get crash game
    const game = await this.gamesService.findByType(GameType.CRASH);
    this.crashGameId = game.id;

    // Generate crash point using provably fair
    const result = await this.gameEngineService.playGame(this.crashGameId, 'system', {
      betAmount: 0,
    });
    this.crashPoint = result.result.crashPoint;

    this.gameRunning = true;
    this.gameState = 'running';
    this.currentMultiplier = 1.0;

    this.server.emit('roundStart', { crashPointHash: result.serverSeedHash });

    // Start multiplier growth
    this.gameInterval = setInterval(() => {
      this.currentMultiplier += 0.01;
      this.server.emit('multiplier', { multiplier: this.currentMultiplier });

      // Check auto-cashouts
      for (const [clientId, bet] of this.bets) {
        if (!bet.cashedOut && bet.autoCashout && this.currentMultiplier >= bet.autoCashout) {
          // Auto cashout
          bet.cashedOut = true;
          bet.cashoutMultiplier = this.currentMultiplier;
          this.server.emit('cashout', {
            username: bet.username,
            multiplier: this.currentMultiplier,
            winAmount: bet.betAmount * this.currentMultiplier,
            auto: true,
          });
        }
      }

      // Check crash
      if (this.currentMultiplier >= this.crashPoint) {
        this.crashGame();
      }
    }, 100);
  }

  private crashGame() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    this.gameState = 'crashed';
    this.gameRunning = false;

    // Add to history
    this.gameHistory.push({
      crashPoint: this.crashPoint,
      timestamp: Date.now(),
    });

    // Broadcast crash
    this.server.emit('crash', {
      crashPoint: this.crashPoint,
    });

    // Start new round after delay
    setTimeout(() => {
      this.bets.clear();
      this.startGameRound();
    }, 5000);
  }
}
