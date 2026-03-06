import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GameRound } from './game-round.entity';

export enum GameType {
  CRASH = 'crash',
  PLINKO = 'plinko',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  type: GameType;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 96.0 })
  rtp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 70.0 })
  minRtp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 99.0 })
  maxRtp: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => GameRound, (round) => round.game)
  rounds: GameRound[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
