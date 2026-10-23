import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import sql, { ConnectionPool, config as SqlConfig } from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: ConnectionPool;

  async onModuleInit(): Promise<void> {
    const config: SqlConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_NAME || 'EventEase',
      port: Number(process.env.DB_PORT || 1433),
      options: {
        ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
        encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === 'true',
        trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERTIFICATE).toLowerCase() === 'true',
      },
    };
    this.pool = await sql.connect(config);
    await this.createSchema();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.close();
  }

  request(): sql.Request {
    return this.pool.request();
  }

  transaction(): sql.Transaction {
    return new sql.Transaction(this.pool);
  }

  private async createSchema(): Promise<void> {
    await this.request().query(`
      IF OBJECT_ID('dbo.Users', 'U') IS NULL CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(120) NOT NULL, email NVARCHAR(255) NOT NULL UNIQUE,
        passwordHash NVARCHAR(300) NOT NULL, role NVARCHAR(20) NOT NULL, college NVARCHAR(255) NULL,
        address NVARCHAR(500) NULL, photo NVARCHAR(MAX) NULL
      );
      IF OBJECT_ID('dbo.Sessions', 'U') IS NULL CREATE TABLE dbo.Sessions (
        tokenHash CHAR(64) PRIMARY KEY, userId INT NOT NULL REFERENCES dbo.Users(id),
        expiresAt DATETIME2 NOT NULL, createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_UserId' AND object_id = OBJECT_ID('dbo.Sessions'))
        CREATE INDEX IX_Sessions_UserId ON dbo.Sessions(userId);
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_ExpiresAt' AND object_id = OBJECT_ID('dbo.Sessions'))
        CREATE INDEX IX_Sessions_ExpiresAt ON dbo.Sessions(expiresAt);
      IF OBJECT_ID('dbo.Events', 'U') IS NULL CREATE TABLE dbo.Events (
        id INT IDENTITY(1,1) PRIMARY KEY, organizerId INT NOT NULL REFERENCES dbo.Users(id), name NVARCHAR(200) NOT NULL,
        category NVARCHAR(80) NOT NULL, eventDate DATE NOT NULL, eventTime NVARCHAR(20) NOT NULL, dates NVARCHAR(MAX) NULL,
        location NVARCHAR(255) NOT NULL, capacity INT NOT NULL, seats INT NOT NULL, price DECIMAL(10,2) NOT NULL DEFAULT 0,
        featured BIT NOT NULL DEFAULT 0, description NVARCHAR(MAX) NULL, url NVARCHAR(2048) NULL
      );
      IF COL_LENGTH('dbo.Events', 'organizer') IS NOT NULL
        ALTER TABLE dbo.Events ALTER COLUMN organizer NVARCHAR(200) NULL;
      IF COL_LENGTH('dbo.Events', 'dates') IS NULL
        ALTER TABLE dbo.Events ADD dates NVARCHAR(MAX) NULL;
      IF COL_LENGTH('dbo.Events', 'url') IS NULL
        ALTER TABLE dbo.Events ADD url NVARCHAR(2048) NULL;
      IF OBJECT_ID('dbo.Registrations', 'U') IS NULL CREATE TABLE dbo.Registrations (
        id INT IDENTITY(1,1) PRIMARY KEY, eventId INT NOT NULL REFERENCES dbo.Events(id),
        userId INT NOT NULL REFERENCES dbo.Users(id), ticket NVARCHAR(40) NOT NULL UNIQUE,
        registrationDate DATE NOT NULL, status NVARCHAR(40) NOT NULL,
        CONSTRAINT UQ_Registrations_Event_User UNIQUE (eventId, userId)
      );
    `);
  }
}
