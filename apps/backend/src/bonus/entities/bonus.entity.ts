import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BonusType {
  WELCOME = 'welcome',
  DEPOSIT = 'deposit',
  REFERRAL = 'referral',
  DAILY = 'daily',
  VIP = 'vip',
}

export enum BonusStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('bonuses')
export class Bonus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.bonuses)
  user: User;

  @Column({
    type: 'enum',
    enum: BonusType,
  })
  type: BonusType;

  @Column({
    type: 'enum',
    enum: BonusStatus,
    default: BonusStatus.PENDING,
  })
  status: BonusStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  wagered: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  wageringRequirement: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  maxBetPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxWithdrawal: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
