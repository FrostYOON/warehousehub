import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ItemsModule } from './modules/items/items.module';
import { OutboundOrdersModule } from './modules/outbound-orders/outbound-orders.module';
import { OutboundShippingModule } from './modules/outbound-shipping/outbound-shipping.module';
import { OutboundPickingModule } from './modules/outbound-picking/outbound-picking.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { LoggingModule } from './common/logging/logging.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TemperatureMonitorModule } from './modules/temperature-monitor/temperature-monitor.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { StocktakingModule } from './modules/stocktaking/stocktaking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 }, // 100 req/min 전역
    ]),
    LoggingModule,
    MailModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    WarehousesModule,
    InboundModule,
    StocksModule,
    CustomersModule,
    ItemsModule,
    OutboundOrdersModule,
    OutboundShippingModule,
    OutboundPickingModule,
    ReturnsModule,
    DashboardModule,
    TemperatureMonitorModule,
    TransfersModule,
    TraceabilityModule,
    StocktakingModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
