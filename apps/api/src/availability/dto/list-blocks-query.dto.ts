import { IsISO8601 } from 'class-validator';

export class ListBlocksQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
