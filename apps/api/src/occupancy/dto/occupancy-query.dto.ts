import { IsOptional, IsUUID, Matches } from 'class-validator';

export class OccupancyQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'weekStart must be YYYY-MM-DD' })
  weekStart!: string;

  @IsOptional()
  @IsUUID('4')
  spaceId?: string;
}
