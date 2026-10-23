import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EventDto } from './dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}
  @Get() list() { return this.events.list(); }
  @Post() @UseGuards(AuthGuard, RolesGuard) @Roles('organizer', 'admin') create(@Body() input: EventDto, @Req() request: AuthenticatedRequest) { return this.events.create(input, request.user); }
  @Post(':id/register') @UseGuards(AuthGuard, RolesGuard) @Roles('attendee') register(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) { return this.events.register(id, request.user); }
  @Delete(':id/register') @HttpCode(HttpStatus.NO_CONTENT) @UseGuards(AuthGuard, RolesGuard) @Roles('attendee') cancel(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) { return this.events.cancel(id, request.user); }
}
