import { IsISO8601, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID('4')
  spaceId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;
}
