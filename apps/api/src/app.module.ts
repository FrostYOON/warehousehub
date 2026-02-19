import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OutboundOrdersModule } from './modules/outbound-orders/outbound-orders.module';
import { OutboundShippingModule } from './modules/outbound-shipping/outbound-shipping.module';
import { OutboundPickingModule } from './modules/outbound-picking/outbound-picking.module';
import { ReturnsModule } from './modules/returns/returns.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WarehousesModule,
    InboundModule,
    StocksModule,
    CustomersModule,
    OutboundOrdersModule,
    OutboundShippingModule,
    OutboundPickingModule,
    ReturnsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
