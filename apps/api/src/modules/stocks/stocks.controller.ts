import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { Response } from 'express';
import { Role, StorageType } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserBranchAccessService } from '../users/user-branch-access.service';
import { StocksService } from './stocks.service';
import { StocksQueryDto } from './dto/query-validation.dto';
import {
  ItemAnalyticsRange,
  ItemTrendQueryDto,
  StockItemsQueryDto,
} from './dto/item-analytics-query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('Stocks')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER, Role.DELIVERY, Role.ACCOUNTING, Role.SALES)
@Controller('stocks')
export class StocksController {
  constructor(
    private readonly stocks: StocksService,
    private readonly userBranchAccess: UserBranchAccessService,
  ) {}

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
  async list(@Req() req: Request, @Query() query: StocksQueryDto) {
    const { storageType, warehouseId, itemCode, expirySoon, page, pageSize } =
      query;
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.stocks.list({
      companyId: req.user!.companyId,
      branchIds,
      storageType,
      warehouseId,
      itemCode,
      expirySoon,
      page,
      pageSize,
    });
  }

  @Get('export')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async export(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: StocksQueryDto,
  ) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    const file = await this.stocks.exportStocks({
      companyId: req.user!.companyId,
      branchIds,
      storageType: query.storageType,
      itemCode: query.itemCode,
      expirySoon: query.expirySoon,
    });
    const fileName = `stocks-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(file);
  }

  @Get('items')
  @ApiQuery({ name: 'keyword', required: false, type: String, example: 'A001' })
  listItems(@Req() req: Request, @Query() query: StockItemsQueryDto) {
    return this.stocks.listItems(req.user!.companyId, query.keyword);
  }

  @Get('analytics/:itemId')
  @ApiParam({ name: 'itemId', type: String })
  @ApiQuery({ name: 'range', required: false, enum: ItemAnalyticsRange })
  itemTrend(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Query() query: ItemTrendQueryDto,
  ) {
    return this.stocks.itemTrend({
      companyId: req.user!.companyId,
      itemId,
      range: query.range,
    });
  }

  @Patch(':stockId')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'stockId', type: String })
  async updateStock(
    @Req() req: Request,
    @Param('stockId') stockId: string,
    @Body() dto: UpdateStockDto,
  ) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.stocks.updateStock({
      companyId: req.user!.companyId,
      actorUserId: req.user!.userId,
      stockId,
      onHand: dto.onHand,
      reserved: dto.reserved,
      memo: dto.memo,
      branchIds,
    });
  }
}
