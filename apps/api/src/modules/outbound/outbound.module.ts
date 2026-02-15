import { Module } from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';

@Module({
  providers: [OutboundService],
  controllers: [OutboundController]
})
export class OutboundModule {}
