import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@udea\.edu\.co$/i, {
    message: 'Registration is limited to @udea.edu.co emails',
  })
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must include letters and numbers',
  })
  password!: string;
}
