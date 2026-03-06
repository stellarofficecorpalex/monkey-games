import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async deposit(userId: string, amount: number, method: string): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      const balanceBefore = user.balance;
      user.balance = Number(user.balance) + amount;

      const transaction = manager.create(Transaction, {
        user,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        amount,
        balanceBefore,
        balanceAfter: user.balance,
        paymentMethod: method,
        description: `Deposit via ${method}`,
      });

      await manager.save(transaction);
      await manager.save(user);

      return transaction;
    });
  }

  async withdraw(userId: string, amount: number, walletAddress: string): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (user.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceBefore = user.balance;
      user.balance = Number(user.balance) - amount;

      const transaction = manager.create(Transaction, {
        user,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        amount,
        balanceBefore,
        balanceAfter: user.balance,
        paymentMethod: 'crypto',
        providerTxId: walletAddress,
        description: `Withdrawal to ${walletAddress.slice(0, 8)}...`,
      });

      await manager.save(transaction);
      await manager.save(user);

      return transaction;
    });
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { user: { id: userId } },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return Number(user.balance);
  }
}
