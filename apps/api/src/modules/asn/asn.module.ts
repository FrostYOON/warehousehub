import { Module } from '@nestjs/common';
import { AsnController } from './asn.controller';
import { AsnService } from './asn.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AsnController],
  providers: [AsnService],
  exports: [AsnService],
})
export class AsnModule {}
