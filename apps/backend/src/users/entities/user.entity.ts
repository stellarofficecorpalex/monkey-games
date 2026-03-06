import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GameRound } from '../../games/entities/game-round.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';
import { Bonus } from '../../bonus/entities/bonus.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  username: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 255, nullable: true })
  telegramId: string;

  @Column({ length: 255, nullable: true })
  refreshToken: string;

  @OneToMany(() => GameRound, (round) => round.user)
  gameRounds: GameRound[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Bonus, (bonus) => bonus.user)
  bonuses: Bonus[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
