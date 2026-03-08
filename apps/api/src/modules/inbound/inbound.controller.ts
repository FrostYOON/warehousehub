import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InboundService } from './inbound.service';
import { InboundUploadResponse } from './dto/inbound-upload.response.dto';
import {
  InboundUploadDetailQueryDto,
  InboundUploadsQueryDto,
} from './dto/inbound-query.dto';

@ApiTags('Inbound')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER)
@Controller('inbound')
export class InboundController {
  constructor(private readonly inbound: InboundService) {}

  @Post('uploads')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOkResponse({
    schema: { example: { id: 'uuid', invalidCount: 0 } },
  })
  async upload(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.inbound.createUpload({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      fileName: file.originalname,
      buffer: file.buffer,
    });
  }

  @Get('uploads')
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'uuid',
          fileName: 'inbound.xlsx',
          status: 'UPLOADED',
          createdAt: '2026-03-01T00:00:00.000Z',
          confirmedAt: null,
          invalidCount: 0,
          rowCount: 12,
        },
      ],
    },
  })
  list(@Req() req: Request, @Query() query: InboundUploadsQueryDto) {
    return this.inbound.listUploads(req.user!.companyId, query);
  }

  @Get('uploads/:id')
  @ApiOkResponse({ type: InboundUploadResponse })
  get(
    @Req() req: Request,
    @Param('id') id: string,
    @Query() query: InboundUploadDetailQueryDto,
  ) {
    return this.inbound.getUpload(req.user!.companyId, id, query);
  }

  @Post('uploads/:id/confirm')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  confirm(@Req() req: Request, @Param('id') id: string) {
    return this.inbound.confirmUpload({
      companyId: req.user!.companyId,
      uploadId: id,
      actorUserId: req.user!.userId,
    });
  }

  @Post('uploads/:id/cancel')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.inbound.cancelUpload({
      companyId: req.user!.companyId,
      uploadId: id,
    });
  }
}
