import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EventsService } from './events.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly events: EventsService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  mine(@Req() request: AuthenticatedRequest) {
    return this.events.registrations(request.user);
  }
}
