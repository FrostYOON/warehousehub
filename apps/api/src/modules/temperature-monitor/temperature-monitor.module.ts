import { Module } from '@nestjs/common';
import { TemperatureMonitorController } from './temperature-monitor.controller';
import { TemperatureMonitorService } from './temperature-monitor.service';

@Module({
  controllers: [TemperatureMonitorController],
  providers: [TemperatureMonitorService],
  exports: [TemperatureMonitorService],
})
export class TemperatureMonitorModule {}
