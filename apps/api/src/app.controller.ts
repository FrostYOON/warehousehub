import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('health/db')
  async healthDb() {
    try {
      await this.prisma.$executeRawUnsafe(`SELECT 1`);
      return { ok: true, db: 'connected' };
    } catch {
      return { ok: false, db: 'disconnected' };
    }
  }
}
