import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Role, StorageType } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StocksService } from './stocks.service';
import { StocksQueryDto } from './dto/query-validation.dto';

@ApiTags('Stocks')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER, Role.DELIVERY, Role.ACCOUNTING, Role.SALES)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

  @Get()
  @ApiQuery({ name: 'storageType', enum: StorageType, required: false })
  @ApiQuery({
    name: 'itemCode',
    example: 'A001',
    type: String,
    required: false,
  })
  @ApiOkResponse({
    schema: {
      example: [
        {
          warehouse: { type: 'DRY' },
          lot: {
            expiryDate: '2026-09-05T00:00:00.000Z',
            item: { itemCode: 'A001' },
          },
          onHand: 10,
          reserved: 0,
        },
      ],
    },
  })
  list(@Req() req: Request, @Query() query: StocksQueryDto) {
    const { storageType, itemCode } = query;
    return this.stocks.list({
      companyId: req.user!.companyId,
      storageType,
      itemCode,
    });
  }
}
