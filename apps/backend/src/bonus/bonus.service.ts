import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bonus, BonusType, BonusStatus } from './entities/bonus.entity';
import { User } from '../users/entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../wallet/entities/transaction.entity';

@Injectable()
export class BonusService {
  constructor(
    @InjectRepository(Bonus)
    private bonusRepository: Repository<Bonus>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async claimWelcomeBonus(userId: string): Promise<Bonus> {
    // Check if user already claimed welcome bonus
    const existingBonus = await this.bonusRepository.findOne({
      where: { user: { id: userId }, type: BonusType.WELCOME },
    });

    if (existingBonus) {
      throw new BadRequestException('Welcome bonus already claimed');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create welcome bonus (100% of first deposit, max $500)
    const bonus = this.bonusRepository.create({
      user,
      type: BonusType.WELCOME,
      status: BonusStatus.PENDING,
      amount: 0, // Will be set on first deposit
      wageringRequirement: 30, // 30x wagering
      maxBetPercent: 10,
      maxWithdrawal: 5000,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return this.bonusRepository.save(bonus);
  }

  async claimDailyBonus(userId: string): Promise<Bonus> {
    // Check if already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingBonus = await this.bonusRepository
      .createQueryBuilder('bonus')
      .where('bonus.userId = :userId', { userId })
      .andWhere('bonus.type = :type', { type: BonusType.DAILY })
      .andWhere('bonus.createdAt >= :today', { today })
      .getOne();

    if (existingBonus) {
      throw new BadRequestException('Daily bonus already claimed today');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Daily bonus: $5 free
    const bonusAmount = 5;

    return this.dataSource.transaction(async (manager) => {
      // Add bonus to balance
      const balanceBefore = user.balance;
      user.balance = Number(user.balance) + bonusAmount;

      // Create transaction
      const transaction = manager.create(Transaction, {
        user,
        type: TransactionType.BONUS,
        status: TransactionStatus.COMPLETED,
        amount: bonusAmount,
        balanceBefore,
        balanceAfter: user.balance,
        description: 'Daily bonus',
      });
      await manager.save(transaction);

      // Create bonus record
      const bonus = manager.create(Bonus, {
        user,
        type: BonusType.DAILY,
        status: BonusStatus.COMPLETED,
        amount: bonusAmount,
        wageringRequirement: 1,
        wagered: bonusAmount,
      });
      await manager.save(bonus);

      await manager.save(user);

      return bonus;
    });
  }

  async processDepositBonus(userId: string, depositAmount: number): Promise<Bonus | null> {
    // Check for pending welcome bonus
    const pendingBonus = await this.bonusRepository.findOne({
      where: { user: { id: userId }, type: BonusType.WELCOME, status: BonusStatus.PENDING },
    });

    if (!pendingBonus) {
      return null;
    }

    // Calculate bonus amount (100% match, max $500)
    const bonusAmount = Math.min(depositAmount, 500);

    return this.dataSource.transaction(async (manager) => {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      // Update bonus
      pendingBonus.amount = bonusAmount;
      pendingBonus.status = BonusStatus.ACTIVE;
      pendingBonus.activatedAt = new Date();

      // Add bonus to balance
      const balanceBefore = user.balance;
      user.balance = Number(user.balance) + bonusAmount;

      // Create transaction
      const transaction = manager.create(Transaction, {
        user,
        type: TransactionType.BONUS,
        status: TransactionStatus.COMPLETED,
        amount: bonusAmount,
        balanceBefore,
        balanceAfter: user.balance,
        description: 'Welcome bonus',
      });

      await manager.save(pendingBonus);
      await manager.save(transaction);
      await manager.save(user);

      return pendingBonus;
    });
  }

  async getUserBonuses(userId: string): Promise<Bonus[]> {
    return this.bonusRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveBonus(userId: string): Promise<Bonus | null> {
    return this.bonusRepository.findOne({
      where: { user: { id: userId }, status: BonusStatus.ACTIVE },
    });
  }

  async updateWagering(userId: string, betAmount: number): Promise<void> {
    const activeBonus = await this.getActiveBonus(userId);
    if (!activeBonus) return;

    activeBonus.wagered = Number(activeBonus.wagered) + betAmount;

    // Check if wagering requirement is met
    const requiredWagering = activeBonus.amount * activeBonus.wageringRequirement;
    if (Number(activeBonus.wagered) >= requiredWagering) {
      activeBonus.status = BonusStatus.COMPLETED;
      activeBonus.completedAt = new Date();
    }

    await this.bonusRepository.save(activeBonus);
  }
}
