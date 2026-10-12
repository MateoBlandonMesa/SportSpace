import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  campus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  usageRules?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
