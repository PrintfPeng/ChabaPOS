import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Pass the datasource URL explicitly to constructor to prevent validation errors on empty env vars
    // We use a valid-format placeholder if the real URL is missing
    const databaseUrl = process.env.DATABASE_URL?.startsWith('postgres') 
      ? process.env.DATABASE_URL 
      : 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    const logger = new Logger(PrismaService.name);
    try {
      const url = process.env.DATABASE_URL;
      if (!url || url.includes('placeholder')) {
        logger.warn('DATABASE_URL environment variable is missing or invalid. Database operations will fail.');
        return;
      }
      
      const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
      logger.log(`Attempting to connect to database at: ${maskedUrl}`);
      
      await this.$connect();
      logger.log('Successfully connected to the database');
    } catch (error) {
      logger.error('Failed to connect to the database. Error detail:', error);
      logger.error('Ensure DATABASE_URL is correct in Settings.');
    }
  }

  isConfigured(): boolean {
    const url = process.env.DATABASE_URL;
    return !!url && !url.includes('placeholder') && url.startsWith('postgres');
  }
}
