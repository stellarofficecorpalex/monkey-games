import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Game, GameType } from '../entities/game.entity';
import { GameRound } from '../entities/game-round.entity';
import { User } from '../../users/entities/user.entity';
import { PlayGameDto } from '../dto/play-game.dto';
import { Transaction, TransactionType, TransactionStatus } from '../../wallet/entities/transaction.entity';

@Injectable()
export class GameEngineService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(GameRound)
    private gameRoundsRepository: Repository<GameRound>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async playGame(gameId: string, userId: string, playDto: PlayGameDto): Promise<any> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < playDto.betAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Generate provably fair seeds
    const serverSeed = this.generateServerSeed();
    const serverSeedHash = this.hashServerSeed(serverSeed);
    const clientSeed = playDto.clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = await this.getUserNonce(userId);

    // Calculate result based on game type
    let result: any;
    let winAmount = 0;

    switch (game.type) {
      case GameType.CRASH:
        result = this.calculateCrashResult(serverSeed, clientSeed, nonce, game.rtp);
        if (result.cashedOut && result.cashoutMultiplier && playDto.autoCashout) {
          winAmount = playDto.betAmount * result.cashoutMultiplier;
        }
        break;
      case GameType.PLINKO:
        result = this.calculatePlinkoResult(serverSeed, clientSeed, nonce, game.rtp, playDto.rows || 8);
        winAmount = playDto.betAmount * result.multiplier;
        break;
      default:
        throw new BadRequestException('Unknown game type');
    }

    // Create hash for verification
    const hash = this.generateHash(serverSeed, clientSeed, nonce);

    // Use transaction to ensure data consistency
    return this.dataSource.transaction(async (manager) => {
      // Deduct bet
      const balanceBefore = user.balance;
      user.balance = Number(user.balance) - playDto.betAmount;

      // Create transaction record
      const betTransaction = manager.create(Transaction, {
        user,
        type: TransactionType.BET,
        status: TransactionStatus.COMPLETED,
        amount: playDto.betAmount,
        balanceBefore,
        balanceAfter: user.balance,
        description: `Bet on ${game.name}`,
      });
      await manager.save(betTransaction);

      // Create game round
      const gameRound = manager.create(GameRound, {
        user,
        game,
        betAmount: playDto.betAmount,
        winAmount,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        hash,
        result,
        rtp: game.rtp,
      });
      await manager.save(gameRound);

      // Add winnings if any
      if (winAmount > 0) {
        const balanceBeforeWin = user.balance;
        user.balance = Number(user.balance) + winAmount;

        const winTransaction = manager.create(Transaction, {
          user,
          type: TransactionType.WIN,
          status: TransactionStatus.COMPLETED,
          amount: winAmount,
          balanceBefore: balanceBeforeWin,
          balanceAfter: user.balance,
          referenceId: gameRound.id,
          description: `Win on ${game.name}`,
        });
        await manager.save(winTransaction);
      }

      await manager.save(user);

      return {
        roundId: gameRound.id,
        result,
        winAmount,
        balance: user.balance,
        serverSeedHash,
        provablyFair: {
          serverSeedHash,
          clientSeed,
          nonce,
        },
      };
    });
  }

  private generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  private generateHash(serverSeed: string, clientSeed: string, nonce: number): string {
    const message = `${serverSeed}:${clientSeed}:${nonce}`;
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  private async getUserNonce(userId: string): Promise<number> {
    const lastRound = await this.gameRoundsRepository.findOne({
      where: { user: { id: userId } },
      order: { nonce: 'DESC' },
    });
    return lastRound ? lastRound.nonce + 1 : 0;
  }

  /**
   * Calculate Crash game result using Provably Fair algorithm
   * Formula: crash_point = max(1, 2^52 / (parseInt(hash.slice(0,13), 16) + 1) * (1 - house_edge))
   */
  private calculateCrashResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    rtp: number,
  ): any {
    const hash = this.generateHash(serverSeed, clientSeed, nonce);
    const h = parseInt(hash.slice(0, 13), 16);

    // House edge based on RTP (RTP 96% = 4% house edge)
    const houseEdge = (100 - rtp) / 100;

    // Calculate crash point
    // Formula ensures the game has the desired RTP
    const e = Math.pow(2, 52);
    const crashPoint = Math.max(1, (e / (h + 1)) * (1 - houseEdge));

    return {
      crashPoint: Math.floor(crashPoint * 100) / 100,
      hash,
      crashed: true,
    };
  }

  /**
   * Calculate Plinko game result
   * Ball drops through pegs, lands in a slot with multiplier
   */
  private calculatePlinkoResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    rtp: number,
    rows: number,
  ): any {
    const hash = this.generateHash(serverSeed, clientSeed, nonce);

    // Determine path - each bit determines left (0) or right (1)
    const path: number[] = [];
    let position = 0;

    for (let i = 0; i < rows; i++) {
      const bit = parseInt(hash[i % 64], 16) % 2;
      position += bit;
      path.push(bit);
    }

    // Multipliers based on RTP
    const multipliers = this.getPlinkoMultipliers(rows, rtp);
    const finalMultiplier = multipliers[position];

    return {
      path,
      position,
      multiplier: finalMultiplier,
      slots: rows + 1,
      hash,
    };
  }

  private getPlinkoMultipliers(rows: number, rtp: number): number[] {
    // Base multipliers for different row counts (standard Plinko)
    const baseMultipliers: Record<number, number[]> = {
      8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
      12: [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0],
      14: [18.0, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 18.0],
      16: [35.0, 11.0, 4.0, 2.0, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 2.0, 4.0, 11.0, 35.0],
    };

    const multipliers = baseMultipliers[rows] || baseMultipliers[8];

    // Adjust multipliers based on RTP
    // RTP 96% = multipliers as-is
    // Lower RTP = reduce multipliers proportionally
    const rtpAdjustment = rtp / 96;

    return multipliers.map((m) => Math.round(m * rtpAdjustment * 100) / 100);
  }

  /**
   * Verify a game round for Provably Fair
   */
  async verifyRound(roundId: string): Promise<any> {
    const round = await this.gameRoundsRepository.findOne({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    // Verify server seed hash
    const computedServerSeedHash = this.hashServerSeed(round.serverSeed);
    const serverSeedValid = computedServerSeedHash === round.serverSeedHash;

    // Verify result hash
    const computedHash = this.generateHash(round.serverSeed, round.clientSeed, round.nonce);
    const hashValid = computedHash === round.hash;

    // Recalculate result
    const game = await this.gamesRepository.findOne({ where: { id: round.game.id } });
    let verifiedResult: any;

    switch (game.type) {
      case GameType.CRASH:
        verifiedResult = this.calculateCrashResult(
          round.serverSeed,
          round.clientSeed,
          round.nonce,
          round.rtp,
        );
        break;
      case GameType.PLINKO:
        verifiedResult = this.calculatePlinkoResult(
          round.serverSeed,
          round.clientSeed,
          round.nonce,
          round.rtp,
          round.result.slots - 1,
        );
        break;
    }

    const resultValid =
      JSON.stringify(verifiedResult) === JSON.stringify(round.result);

    return {
      roundId,
      serverSeedValid,
      hashValid,
      resultValid,
      fair: serverSeedValid && hashValid && resultValid,
      verification: {
        serverSeed: round.serverSeed,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        hash: round.hash,
        computedHash,
        result: round.result,
        verifiedResult,
      },
    };
  }
}
