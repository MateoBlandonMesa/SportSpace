import { IsISO8601, IsString, MinLength } from 'class-validator';

export class CreateBlockDto {
  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}
