import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
