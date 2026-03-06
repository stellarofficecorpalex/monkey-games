import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Game } from '../games/entities/game.entity';
import { GameRound } from '../games/entities/game-round.entity';
import { Transaction } from '../wallet/entities/transaction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GameRound)
    private gameRoundRepository: Repository<GameRound>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getStats(): Promise<any> {
    const [totalUsers, totalGames, totalBets, totalWins] = await Promise.all([
      this.userRepository.count(),
      this.gameRepository.count({ where: { isActive: true } }),
      this.transactionRepository
        .createQueryBuilder('t')
        .where('t.type = :type', { type: 'bet' })
        .select('SUM(t.amount)', 'total')
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('t')
        .where('t.type = :type', { type: 'win' })
        .select('SUM(t.amount)', 'total')
        .getRawOne(),
    ]);

    return {
      totalUsers,
      totalGames,
      totalBets: totalBets?.total || 0,
      totalWins: totalWins?.total || 0,
      profit: Number(totalBets?.total || 0) - Number(totalWins?.total || 0),
    };
  }

  async getUsers(page: number = 1, limit: number = 20): Promise<any> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  async updateGameRtp(gameId: string, rtp: number): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });

    if (rtp < game.minRtp || rtp > game.maxRtp) {
      throw new ForbiddenException(`RTP must be between ${game.minRtp} and ${game.maxRtp}`);
    }

    game.rtp = rtp;
    return this.gameRepository.save(game);
  }

  async getGameRounds(gameId: string, page: number = 1, limit: number = 50): Promise<any> {
    const [rounds, total] = await this.gameRoundRepository.findAndCount({
      where: { game: { id: gameId } },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return {
      rounds,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
