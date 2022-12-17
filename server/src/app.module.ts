import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 55004,
      username: 'root',
      password: 'mysqlpw',
      database: 'fullstack',
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: true,
      charset: 'utf8mb4',
    }),
    UserModule,
  ],
})
export class AppModule {}
