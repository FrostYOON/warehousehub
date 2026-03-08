import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyBrandingDto } from './dto/update-company-branding.dto';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** 현재 로그인한 회사의 브랜딩 정보 조회 */
  @Get('me')
  getMyCompany(@Req() req: Request) {
    return this.companies.getCompanyBranding(req.user!.companyId);
  }

  /** 회사 브랜딩 수정 (ADMIN 전용) */
  @Patch('me')
  @Roles(Role.ADMIN)
  updateMyCompany(
    @Req() req: Request,
    @Body() dto: UpdateCompanyBrandingDto,
  ) {
    return this.companies.updateCompanyBranding(
      req.user!.companyId,
      req.user!.userId,
      req.user!.role,
      dto,
    );
  }
}
