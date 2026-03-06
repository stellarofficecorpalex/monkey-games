import { Controller, Get, Post, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BonusService } from './bonus.service';

@ApiTags('bonus')
@Controller('bonus')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Post('welcome')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim welcome bonus' })
  @ApiResponse({ status: 200, description: 'Welcome bonus claimed' })
  @ApiResponse({ status: 400, description: 'Already claimed' })
  async claimWelcome(@Request() req) {
    return this.bonusService.claimWelcomeBonus(req.user.id);
  }

  @Post('daily')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim daily bonus' })
  @ApiResponse({ status: 200, description: 'Daily bonus claimed' })
  @ApiResponse({ status: 400, description: 'Already claimed today' })
  async claimDaily(@Request() req) {
    return this.bonusService.claimDailyBonus(req.user.id);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bonuses' })
  @ApiResponse({ status: 200, description: 'List of bonuses' })
  async getBonuses(@Request() req) {
    return this.bonusService.getUserBonuses(req.user.id);
  }

  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active bonus' })
  @ApiResponse({ status: 200, description: 'Active bonus' })
  async getActiveBonus(@Request() req) {
    return this.bonusService.getActiveBonus(req.user.id);
  }
}
