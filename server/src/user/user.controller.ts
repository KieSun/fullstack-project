import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { SignupDto } from './dto/signup.dto';

@Controller('user')
export class UserController {
  constructor(private usersService: UserService) {}

  @Get()
  getUserList() {
    return this.usersService.getUserList();
  }

  @Post('signup')
  signUp(@Body() signupDto: SignupDto) {
    return this.usersService.createUser(signupDto);
  }
}
