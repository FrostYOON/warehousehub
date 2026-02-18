import { Module } from '@nestjs/common';
import { OutboundPickingService } from './outbound-picking.service';
import { OutboundPickingController } from './outbound-picking.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OutboundPickingService],
  controllers: [OutboundPickingController],
  exports: [OutboundPickingService],
})
export class OutboundPickingModule {}
