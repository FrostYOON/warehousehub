import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboundOrdersController } from './outbound-orders.controller';
import { OutboundOrdersService } from './outbound-orders.service';
import { OutboundPickingModule } from '../outbound-picking/outbound-picking.module';

@Module({
  imports: [PrismaModule, OutboundPickingModule],
  controllers: [OutboundOrdersController],
  providers: [OutboundOrdersService],
  exports: [OutboundOrdersService],
})
export class OutboundOrdersModule {}
