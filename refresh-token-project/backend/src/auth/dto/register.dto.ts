import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Username phải là chuỗi' })
  @MinLength(3, { message: 'Username tối thiểu 3 ký tự' })
  @MaxLength(20, { message: 'Username tối đa 20 ký tự' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username chỉ được chứa chữ, số và dấu _' })
  username: string;

  @IsString({ message: 'Password phải là chuỗi' })
  @MinLength(6, { message: 'Password tối thiểu 6 ký tự' })
  @MaxLength(32, { message: 'Password tối đa 32 ký tự' })
  password: string;

  @IsString({ message: 'Name phải là chuỗi' })
  @MinLength(2, { message: 'Name tối thiểu 2 ký tự' })
  @MaxLength(50, { message: 'Name tối đa 50 ký tự' })
  name: string;
}
