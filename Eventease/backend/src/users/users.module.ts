import { Module } from '@nestjs/common';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminMiddleware } from '../auth/admin.middleware';
import { UsersController } from './users.controller';

@Module({ imports: [AuthModule], controllers: [UsersController] })
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AdminMiddleware).forRoutes(UsersController);
  }
}
