import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user balance' })
  @ApiResponse({ status: 200, description: 'User balance' })
  async getBalance(@Request() req) {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @Post('deposit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create deposit' })
  @ApiResponse({ status: 200, description: 'Deposit created' })
  async deposit(@Request() req, @Body() body: { amount: number; method: string }) {
    return this.walletService.deposit(req.user.id, body.amount, body.method);
  }

  @Post('withdraw')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create withdrawal' })
  @ApiResponse({ status: 200, description: 'Withdrawal created' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  async withdraw(@Request() req, @Body() body: { amount: number; walletAddress: string }) {
    return this.walletService.withdraw(req.user.id, body.amount, body.walletAddress);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getTransactions(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.walletService.getTransactions(req.user.id, page, limit);
  }
}
