import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Game } from '../games/entities/game.entity';
import { GameRound } from '../games/entities/game-round.entity';
import { Transaction } from '../wallet/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Game, GameRound, Transaction])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
