import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest, Role } from './auth.types';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) || [];
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!roles.includes(user.role)) throw new ForbiddenException('You do not have permission for this action.');
    return true;
  }
}
