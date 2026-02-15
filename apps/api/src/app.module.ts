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
import { OutboundModule } from './modules/outbound/outbound.module';

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
    OutboundModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
