import { Type } from 'class-transformer';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  type!: string;

  @IsString()
  @MinLength(2)
  campus!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsString()
  @MinLength(1)
  usageRules!: string;
}
