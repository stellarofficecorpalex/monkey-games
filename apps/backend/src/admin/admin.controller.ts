import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(user: any) {
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getStats(@Request() req) {
    this.checkAdmin(req.user);
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(@Request() req, @Query('page') page?: number, @Query('limit') limit?: number) {
    this.checkAdmin(req.user);
    return this.adminService.getUsers(page, limit);
  }

  @Patch('users/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUserStatus(@Request() req, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    this.checkAdmin(req.user);
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Patch('games/:id/rtp')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update game RTP' })
  @ApiResponse({ status: 200, description: 'RTP updated' })
  @ApiResponse({ status: 400, description: 'Invalid RTP value' })
  async updateGameRtp(@Request() req, @Param('id') id: string, @Body('rtp') rtp: number) {
    this.checkAdmin(req.user);
    return this.adminService.updateGameRtp(id, rtp);
  }

  @Get('games/:id/rounds')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get game rounds' })
  @ApiResponse({ status: 200, description: 'Game rounds' })
  async getGameRounds(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    this.checkAdmin(req.user);
    return this.adminService.getGameRounds(id, page, limit);
  }
}
