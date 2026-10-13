import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsMilitaryTime, Max, Min } from 'class-validator';

export class SetWeeklyHoursDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek!: number[];

  @IsMilitaryTime()
  startTime!: string;

  @IsMilitaryTime()
  endTime!: string;
}
