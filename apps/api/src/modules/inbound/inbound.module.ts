import { Module } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';

@Module({
  providers: [InboundService],
  controllers: [InboundController],
})
export class InboundModule {}
