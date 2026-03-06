import { Controller, Get, Param, Query, Request, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { GameEngineService } from './services/game-engine.service';
import { PlayGameDto } from './dto/play-game.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly gameEngineService: GameEngineService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active games' })
  @ApiResponse({ status: 200, description: 'List of games' })
  async findAll() {
    return this.gamesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiResponse({ status: 200, description: 'Game details' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @Post(':id/play')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Play a game round' })
  @ApiResponse({ status: 200, description: 'Game result' })
  @ApiResponse({ status: 400, description: 'Invalid bet or insufficient balance' })
  async play(@Param('id') id: string, @Body() playDto: PlayGameDto, @Request() req) {
    return this.gameEngineService.playGame(id, req.user.id, playDto);
  }

  @Get(':id/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user game history' })
  @ApiResponse({ status: 200, description: 'Game history' })
  async getHistory(@Param('id') id: string, @Request() req, @Query('limit') limit?: number) {
    return this.gamesService.getUserHistory(req.user.id, limit);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get game statistics' })
  @ApiResponse({ status: 200, description: 'Game stats' })
  async getStats(@Param('id') id: string) {
    return this.gamesService.getGameStats(id);
  }

  @Post(':id/verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify game round fairness' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyRound(@Param('id') id: string, @Body() body: { roundId: string }) {
    return this.gameEngineService.verifyRound(body.roundId);
  }
}
