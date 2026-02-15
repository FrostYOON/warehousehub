import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: [
        { id: 'uuid', type: 'DRY', name: 'DRY' },
        { id: 'uuid', type: 'COOL', name: 'COOL' },
        { id: 'uuid', type: 'FRZ', name: 'FRZ' },
      ],
    },
  })
  list(@Req() req: Request) {
    const { companyId } = req.user!;
    return this.warehouses.list(companyId);
  }
}
