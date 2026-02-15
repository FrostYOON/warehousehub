import {
  Controller,
  Get,
  Param,
  Post,
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({
    schema: { example: { id: 'uuid', invalidCount: 0 } },
  })
  async upload(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new Error('file is required');
    return this.inbound.createUpload({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      fileName: file.originalname,
      buffer: file.buffer,
    });
  }

  @Get('uploads/:id')
  @ApiOkResponse({ type: InboundUploadResponse })
  get(@Req() req: Request, @Param('id') id: string) {
    return this.inbound.getUpload(req.user!.companyId, id);
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
}
