# 用户系统文档

基本上每个项目都需要一个用户系统来管理，本项目也不例外。本文档主要介绍用户系统的设计到的技术栈及实现过程中需要注意的点，方便大家在写项目之前也有大概的轮廓。

## 后端

### 数据库及连接相关

首先我们需要在本地启动 Mysql，目前一般都是直接通过 docker 玩的，[docker 安装文档](https://docs.docker.com/engine/install/)。

安装完成后在 Docker Desktop 中的首页找到 Mysql 安装即可，然后大家找到数据库可视化工具连接下就行。

接下来我们需要一张用户表，表结构如下：

- id: 用户 id，uuid 类型
- mobile，手机号，string 类型
- password，密码，string 类型
- name，用户名，string 类型
- address，用户钱包地址，string 类型
- created_at，创建时间，timestamp 类型
- updated_at，更新时间，timestamp 类型
- 索引相关：mobile 和 address

数据库操作我们使用 [typeorm](https://typeorm.bootcss.com/)，这是一个非常好用的 ORM 库，可以让我们不用写 SQL 语句就可以操作数据库。

Nest.js 连接数据库的代码如下：

```bash
$ npm install --save @nestjs/typeorm typeorm mysql2
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test', 
      entities : ["dist/modules/**/*. entity {.ts,.js}"],
      synchronize: true,
      charset: 'utf8mb4',
    }),
  ],
})
export class AppModule {}
```

接下来我们根据刚才的表结构创建 ORM 中的[实体](https://typeorm.bootcss.com/entities)。

然后在 user controller 中写一个获取用户列表的接口，查看是否有效。

### 接口相关

这几个接口写起来都没啥困难的，主要是要注意一些细节。

#### 注册接口
首先注册接口需要对密码进行加密，毕竟肯定不能明文存用户密码。

```typescript
import bcrypt from 'bcrypt';

// 加密
await bcrypt.hash(password, 10);

// 对比
await bcrypt.compare(password, user.password);
```

这边注册接口我们没有使用类似手机验证码的方式，当然大家也可以自己去加，[短信验证码购买](https://market.aliyun.com/products/56956004/?spm=5176.product-detail.102.3.37d5591339vg7L)。

验证码这块需要注意一些安全问题，在前端我们可以通过图形验证码或者计时器的方式防止用户一直获取验证码，毕竟一条短信成本要几分钱，积累起来的成本还是很可观的。另外前端做了限制不等于后端就不需要做了，照样需要对单个 IP、手机号做请求限制，单个手机号每日可获取验证码次数限制、黑名单等安全防范工作。

#### 登录接口

登录接口我们需要给用户生成一个 token，这个 token 用于后续用户的身份验证。生成的方式有很多，这里我们使用 JWT 的方式。

JWT 策略：
```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport ';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: 'secretOrKey',
        });
    }

    async validate(payload: any) {
        return {
            id: payload.id,
            mobile: payload.mobile,
        };
    }
}
````

在 Module 中使用：
```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: 'secretOrKey',
        signOptions: { 
          expiresIn: '24h'
        },
      }),
    }),
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy]
})
export class UserModule {}
```

在 Service 中生成 token：
```typescript
const certificate = (user: User) => {
    const payload = { 
      id: user.id,
      mobile: user.mobile,
    };
    const token = this.jwtService.sign(payload);
    return token
}
```

在需要验证的接口中使用：
```typescript
@UseGuards(AuthGuard('jwt'))
```

#### 接口通用注意点

入参需要做校验，可以使用 Nest.js [自带的中间件](https://docs.nestjs.com/techniques/validation#auto-validation)，然后通过定义 DTO 的方式自动校验入参。

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
```

返回值拦截器，可以在拦截器中对返回值进行统一处理，比如加上 code、msg 等字段。

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({ data })));
  }
}

app.useGlobalInterceptors(new TransformInterceptor())
```

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { execPath } from 'process';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message

    const exceptionResponse: any = exception.getResponse()
    let validatorMessage = exceptionResponse
    if (typeof validatorMessage === ' object ') {

      validatorMessage = exceptionResponse.message

      if (validatorMessage instanceof Array) {
        validatorMessage = validatorMessage[0]
      }

    }

    Logger.log({ exception })

    response
      .status(status)
      .json({
        code: status,
        message: validatorMessage || message,
      });
  }
}
app.useGlobalInterceptors(new HttpExceptionFilter())
```

#### 接口文档

使用 Swagger 来生成接口文档，这样前端开发人员就可以直接看到接口文档，不用再去问后端接口的参数是什么，[文档](https://docs.nestjs.com/openapi/introduction)。

## 前端

## Web3