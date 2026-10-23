import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import sql from 'mssql';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { EventDto } from './dto';

@Injectable()
export class EventsService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async list(): Promise<unknown[]> {
    const result = await this.database.request().query(`
      SELECT e.id, e.organizerId, e.name, e.category, e.eventDate, e.eventTime, e.dates,
             e.location, e.capacity, e.seats, e.price, e.featured, e.description, e.url,
             u.name AS organizer
      FROM dbo.Events e
      JOIN dbo.Users u ON u.id=e.organizerId
      ORDER BY e.eventDate,e.eventTime
    `);
    return result.recordset.map((row) => this.mapEvent(row));
  }

  async create(input: EventDto, user: User): Promise<unknown> {
    const result = await this.database.request().input('organizerId', sql.Int, user.id).input('name', sql.NVarChar(200), input.name.trim())
      .input('category', sql.NVarChar(80), input.category.trim()).input('eventDate', sql.Date, input.date).input('eventTime', sql.NVarChar(20), input.time)
      .input('dates', sql.NVarChar(sql.MAX), JSON.stringify(input.dates || [])).input('location', sql.NVarChar(255), input.location.trim())
      .input('capacity', sql.Int, input.capacity).input('price', sql.Decimal(10, 2), input.price || 0).input('featured', sql.Bit, input.featured)
      .input('description', sql.NVarChar(sql.MAX), input.desc || '').input('url', sql.NVarChar(2048), input.url || null)
      .query('INSERT dbo.Events (organizerId,name,category,eventDate,eventTime,dates,location,capacity,seats,price,featured,description,url) OUTPUT INSERTED.* VALUES (@organizerId,@name,@category,@eventDate,@eventTime,@dates,@location,@capacity,@capacity,@price,@featured,@description,@url)');
    return this.mapEvent({ ...result.recordset[0], organizer: user.name });
  }

  async register(id: number, user: User): Promise<unknown> {
    const transaction = this.database.transaction();
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const eventResult = await new sql.Request(transaction).input('id', sql.Int, id).query('SELECT * FROM dbo.Events WITH (UPDLOCK, ROWLOCK) WHERE id=@id');
      const event = eventResult.recordset[0];
      if (!event) throw new NotFoundException('Event not found.');
      const duplicate = await new sql.Request(transaction).input('eventId', sql.Int, id).input('userId', sql.Int, user.id).query('SELECT id FROM dbo.Registrations WHERE eventId=@eventId AND userId=@userId');
      if (duplicate.recordset[0]) throw new ConflictException('You are already registered for this event.');
      if (event.seats <= 0) throw new ConflictException('This event is sold out.');
      const ticket = `EE-${Date.now().toString().slice(-6)}`;
      const result = await new sql.Request(transaction).input('eventId', sql.Int, id).input('userId', sql.Int, user.id).input('ticket', sql.NVarChar(40), ticket)
        .input('date', sql.Date, new Date()).input('status', sql.NVarChar(40), 'Confirmed')
        .query('INSERT dbo.Registrations (eventId,userId,ticket,registrationDate,status) OUTPUT INSERTED.* VALUES (@eventId,@userId,@ticket,@date,@status)');
      await new sql.Request(transaction).input('id', sql.Int, id).query('UPDATE dbo.Events SET seats=seats-1 WHERE id=@id');
      await transaction.commit();
      return this.mapRegistration(result.recordset[0]);
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  }

  async registrations(user: User): Promise<unknown[]> {
    const result = await this.database.request().input('userId', sql.Int, user.id).query('SELECT * FROM dbo.Registrations WHERE userId=@userId ORDER BY registrationDate DESC');
    return result.recordset.map((row) => this.mapRegistration(row));
  }

  async cancel(id: number, user: User): Promise<void> {
    const result = await this.database.request().input('eventId', sql.Int, id).input('userId', sql.Int, user.id).query('DELETE FROM dbo.Registrations OUTPUT DELETED.* WHERE eventId=@eventId AND userId=@userId');
    if (!result.recordset[0]) throw new NotFoundException('Registration not found.');
    await this.database.request().input('id', sql.Int, id).query('UPDATE dbo.Events SET seats=CASE WHEN seats < capacity THEN seats+1 ELSE capacity END WHERE id=@id');
  }

  private mapEvent(row: Record<string, unknown>): Record<string, unknown> {
    let dates: unknown;
    try { dates = row.dates ? JSON.parse(String(row.dates)) : undefined; } catch { dates = undefined; }
    return { id: row.id, organizerId: row.organizerId, organizer: row.organizer, name: row.name, category: row.category, date: this.date(row.eventDate), time: this.time(row.eventTime), dates, location: row.location, capacity: row.capacity, seats: row.seats, price: Number(row.price), featured: Boolean(row.featured), desc: row.description || '', url: row.url || '' };
  }

  private mapRegistration(row: Record<string, unknown>): Record<string, unknown> {
    return { id: row.id, eventId: row.eventId, userId: row.userId, ticket: row.ticket, date: this.date(row.registrationDate), status: row.status };
  }

  private date(value: unknown): string { return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || ''); }

  private time(value: unknown): string {
    if (value instanceof Date) {
      return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
    }
    return String(value || '').slice(0, 5);
  }
}
