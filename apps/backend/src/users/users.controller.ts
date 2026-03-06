import { Controller, Get, Request, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user balance' })
  @ApiResponse({ status: 200, description: 'User balance' })
  async getBalance(@Request() req) {
    const balance = await this.usersService.getBalance(req.user.id);
    return { balance };
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  async updateProfile(@Request() req, @Body() updateData: Partial<{ username: string; email: string }>) {
    return this.usersService.findOne(req.user.id);
  }
}
