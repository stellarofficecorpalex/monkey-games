import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Game } from './game.entity';

@Entity('game_rounds')
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.gameRounds)
  user: User;

  @Index()
  @ManyToOne(() => Game, (game) => game.rounds)
  game: Game;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  betAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  winAmount: number;

  // Provably Fair fields
  @Column({ length: 64 })
  serverSeed: string;

  @Column({ length: 64 })
  serverSeedHash: string;

  @Column({ length: 64, nullable: true })
  clientSeed: string;

  @Column({ type: 'int', default: 0 })
  nonce: number;

  @Column({ length: 64 })
  hash: string;

  @Column({ type: 'json' })
  result: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rtp: number;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
