import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { RegistrationsController } from './registrations.controller';
import { EventsService } from './events.service';

@Module({ imports: [AuthModule], controllers: [EventsController, RegistrationsController], providers: [EventsService] })
export class EventsModule {}
