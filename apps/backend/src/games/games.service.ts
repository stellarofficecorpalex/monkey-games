import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameType } from './entities/game.entity';
import { GameRound } from './entities/game-round.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(GameRound)
    private gameRoundsRepository: Repository<GameRound>,
  ) {}

  async findAll(): Promise<Game[]> {
    return this.gamesRepository.find({
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async findByType(type: GameType): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { type, isActive: true },
    });

    if (!game) {
      throw new NotFoundException(`Game with type ${type} not found`);
    }

    return game;
  }

  async updateRtp(gameId: string, rtp: number): Promise<Game> {
    const game = await this.findOne(gameId);

    if (rtp < game.minRtp || rtp > game.maxRtp) {
      throw new Error(`RTP must be between ${game.minRtp} and ${game.maxRtp}`);
    }

    game.rtp = rtp;
    return this.gamesRepository.save(game);
  }

  async getGameStats(gameId: string): Promise<any> {
    const stats = await this.gameRoundsRepository
      .createQueryBuilder('round')
      .select([
        'COUNT(*) as totalRounds',
        'SUM("betAmount") as totalBets',
        'SUM("winAmount") as totalWins',
        'AVG("winAmount" / NULLIF("betAmount", 0)) as avgMultiplier',
      ])
      .where('round.gameId = :gameId', { gameId })
      .getRawOne();

    return stats;
  }

  async getUserHistory(userId: string, limit: number = 50): Promise<GameRound[]> {
    return this.gameRoundsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['game'],
    });
  }
}
