import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
export class UsersController {
  constructor(private readonly auth: AuthService) {}
  @Get('users') @UseGuards(AuthGuard, RolesGuard) @Roles('admin') users() { return this.auth.listUsers(); }
}
