import { Module } from '@nestjs/common';
import { StocktakingController } from './stocktaking.controller';
import { StocktakingService } from './stocktaking.service';

@Module({
  controllers: [StocktakingController],
  providers: [StocktakingService],
  exports: [StocktakingService],
})
export class StocktakingModule {}
