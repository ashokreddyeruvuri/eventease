import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { LoginDto, RegisterDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() input: RegisterDto) { return this.auth.register(input); }
  @Post('login') login(@Body() input: LoginDto) { return this.auth.login(input); }
  @Post('admin-login') adminLogin(@Body() input: LoginDto) { return this.auth.adminLogin(input); }
  @Post('logout') @HttpCode(HttpStatus.NO_CONTENT) @UseGuards(AuthGuard) logout(@Req() request: AuthenticatedRequest) { return this.auth.logout(request.token); }
}
