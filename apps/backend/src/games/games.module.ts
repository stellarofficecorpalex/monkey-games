import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { GameRound } from './entities/game-round.entity';
import { GameEngineService } from './services/game-engine.service';
import { CrashGateway } from './gateways/crash.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameRound])],
  controllers: [GamesController],
  providers: [GamesService, GameEngineService, CrashGateway],
  exports: [GamesService, GameEngineService],
})
export class GamesModule {}
