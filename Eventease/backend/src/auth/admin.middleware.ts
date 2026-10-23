 import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  constructor(private readonly auth: AuthService) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const header = request.get('authorization') || '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw new UnauthorizedException('Authentication required.');

    const token = match[1];
    const user = await this.auth.getUser(token);
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required.');

    const authenticatedRequest = request as Request & Pick<AuthenticatedRequest, 'user' | 'token'>;
    authenticatedRequest.user = user;
    authenticatedRequest.token = token;
    next();
  }
}
