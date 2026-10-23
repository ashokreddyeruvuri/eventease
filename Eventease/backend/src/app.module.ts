import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DatabaseModule, AuthModule, EventsModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
