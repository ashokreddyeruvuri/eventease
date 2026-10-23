import crypto from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './dto';
import { Role, User } from './auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async register(input: RegisterDto): Promise<{ user: Omit<User, 'passwordHash'> }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.database.request().input('email', sql.NVarChar(255), email).query('SELECT id FROM dbo.Users WHERE email=@email');
    if (existing.recordset[0]) throw new ConflictException('Email is already registered.');
    const result = await this.database.request()
      .input('name', sql.NVarChar(120), input.name.trim()).input('email', sql.NVarChar(255), email)
      .input('passwordHash', sql.NVarChar(300), this.hashPassword(input.password)).input('role', sql.NVarChar(20), input.role)
      .query('INSERT dbo.Users (name,email,passwordHash,role) OUTPUT INSERTED.* VALUES (@name,@email,@passwordHash,@role)');
    return { user: this.publicUser(this.mapUser(result.recordset[0])) };
  }

  async login(input: LoginDto): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await this.findAuthenticatedUser(input);
    return this.createSession(user);
  }

  async adminLogin(input: LoginDto): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await this.findAuthenticatedUser(input);
    if (user.role !== 'admin') throw new UnauthorizedException('Incorrect email or password.');
    return this.createSession(user);
  }

  async logout(token: string): Promise<void> {
    await this.database.request().input('tokenHash', sql.Char(64), this.hashToken(token)).query('DELETE FROM dbo.Sessions WHERE tokenHash=@tokenHash');
  }

  async getUser(token: string): Promise<User> {
    const result = await this.database.request()
      .input('tokenHash', sql.Char(64), this.hashToken(token))
      .query('SELECT u.* FROM dbo.Sessions s INNER JOIN dbo.Users u ON u.id=s.userId WHERE s.tokenHash=@tokenHash AND s.expiresAt > SYSUTCDATETIME()');
    if (!result.recordset[0]) throw new UnauthorizedException('Session is no longer valid.');
    return this.mapUser(result.recordset[0]);
  }

  async listUsers(): Promise<Array<Omit<User, 'passwordHash'>>> {
    const result = await this.database.request().query('SELECT * FROM dbo.Users ORDER BY id');
    return result.recordset.map((row) => this.publicUser(this.mapUser(row)));
  }

  private hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, expected] = String(stored).split(':');
    if (!salt || !expected || !/^[a-f0-9]+$/i.test(expected)) return false;
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(actual, 'hex');
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private mapUser(row: Record<string, unknown>): User {
    return { id: Number(row.id), name: String(row.name), email: String(row.email), role: row.role as Role, college: String(row.college || ''), address: String(row.address || ''), photo: String(row.photo || ''), passwordHash: String(row.passwordHash) };
  }

  publicUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private async findAuthenticatedUser(input: LoginDto): Promise<User> {
    const result = await this.database.request()
      .input('email', sql.NVarChar(255), input.email.trim().toLowerCase())
      .query('SELECT * FROM dbo.Users WHERE email=@email');
    const user = result.recordset[0] && this.mapUser(result.recordset[0]);
    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
    return user;
  }

  private async createSession(user: User): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionTtlHours() * 60 * 60 * 1000);
    await this.database.request()
      .input('tokenHash', sql.Char(64), this.hashToken(token))
      .input('userId', sql.Int, user.id)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query('DELETE FROM dbo.Sessions WHERE expiresAt <= SYSUTCDATETIME(); INSERT dbo.Sessions (tokenHash,userId,expiresAt) VALUES (@tokenHash,@userId,@expiresAt)');
    return { token, user: this.publicUser(user) };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private sessionTtlHours(): number {
    const configured = Number(process.env.AUTH_SESSION_TTL_HOURS || 8);
    return Number.isFinite(configured) && configured > 0 && configured <= 168 ? configured : 8;
  }
}
