import { IsOptional, IsString, MinLength } from 'class-validator';

export class ListSpacesQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  campus?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  type?: string;
}
