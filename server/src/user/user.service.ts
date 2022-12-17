import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { compare, hash } from 'bcrypt';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private getPasswordHash(password: string) {
    return hash(password, 10);
  }

  private comparePassword(password: string, user: User) {
    return compare(password, user.password);
  }
  getUserList() {
    return this.usersRepository.find();
  }

  getUserByMobile(mobile: string) {
    return this.usersRepository.find({
      where: {
        mobile,
      },
    });
  }

  async createUser(signupDto: SignupDto) {
    const { password, mobile, name } = signupDto;
    const exitUser = await this.getUserByMobile(mobile);
    if (exitUser.length) {
      return '用户已存在';
    }
    const hash = await this.getPasswordHash(password);
    const res = await this.usersRepository.save({
      mobile,
      name,
      password: hash,
    });
    return res.id;
  }
}
