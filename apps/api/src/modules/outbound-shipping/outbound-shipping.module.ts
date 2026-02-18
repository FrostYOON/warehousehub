import { Module } from '@nestjs/common';
import { OutboundShippingController } from './outbound-shipping.controller';
import { OutboundShippingService } from './outbound-shipping.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OutboundShippingController],
  providers: [OutboundShippingService],
  exports: [OutboundShippingService],
})
export class OutboundShippingModule {}
