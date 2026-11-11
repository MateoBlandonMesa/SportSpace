import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMilitaryTime,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WeeklyHourRuleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsMilitaryTime()
  startTime!: string;

  @IsMilitaryTime()
  endTime!: string;
}

export class SetWeeklyHoursDto {
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WeeklyHourRuleDto)
  rules!: WeeklyHourRuleDto[];
}
