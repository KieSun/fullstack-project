import {
  IsString,
  IsNotEmpty,
  IsMobilePhone,
  MinLength,
} from 'class-validator';
import { Match } from '../../decorator/match.decorator';

export class SignupDto {
  @IsMobilePhone('zh-CN')
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Match('password', { message: 'rePassword not equal password' })
  rePassword: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
