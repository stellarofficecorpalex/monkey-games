import { IsNumber, IsOptional, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlayGameDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  betAmount: number;

  @ApiProperty({ example: 'my-client-seed', required: false })
  @IsOptional()
  @IsString()
  clientSeed?: string;

  @ApiProperty({ example: 2.5, required: false })
  @IsOptional()
  @IsNumber()
  autoCashout?: number;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  rows?: number;
}
