import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './roles.guard';
import { Role } from './auth.types';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
