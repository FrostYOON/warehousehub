// apps/api/src/modules/auth/auth.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';

import { AuthCookiesInterceptor } from './http/interceptors/auth-cookies.interceptor';
import {
  SetAuthCookies,
  ClearAuthCookies,
} from './http/decorators/auth-cookies.decorator';
import { RefreshCookieGuard } from './http/guards/refresh-cookie.guard';
import { RefreshToken } from './http/decorators/refresh-token.decorator';
import { CurrentUser } from './http/decorators/current-user.decorator';
import { RequestMeta } from './http/decorators/req-meta.decorator';
import {
  DeviceSessionsResponseDto,
  LoginCompaniesResponseDto,
  LoginResponseDto,
  LogoutOthersResponseDto,
  MeResponseDto,
  OkResponseDto,
} from './dto/auth.response.dto';
import type { CurrentUserPayload } from './http/decorators/current-user.decorator';
import type { RequestMeta as RequestMetaType } from './http/decorators/req-meta.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(AuthCookiesInterceptor) // Auth 컨트롤러 전체에 적용
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('companies')
  @ApiOkResponse({ type: LoginCompaniesResponseDto })
  companies() {
    return this.auth.listLoginCompanies();
  }

  @Post('register')
  @SetAuthCookies()
  @ApiOkResponse({ type: LoginResponseDto })
  register(@Body() dto: RegisterDto, @RequestMeta() meta: RequestMetaType) {
    return this.auth.register(dto, meta);
  }

  @Post('login')
  @SetAuthCookies()
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto, @RequestMeta() meta: RequestMetaType) {
    return this.auth.login(dto, meta);
  }

  @Post('refresh')
  @UseGuards(RefreshCookieGuard)
  @SetAuthCookies()
  @ApiOkResponse({ type: OkResponseDto })
  refresh(
    @RefreshToken() refreshToken: string,
    @RequestMeta() meta: RequestMetaType,
  ) {
    return this.auth.refresh(refreshToken, meta);
  }

  @Post('logout')
  @ClearAuthCookies()
  @ApiOkResponse({ type: OkResponseDto })
  logout(@RefreshToken() refreshToken?: string) {
    return this.auth.logout(refreshToken ?? '');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth('access-token') // Swagger용(실제는 쿠키)
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.me(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('devices')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: DeviceSessionsResponseDto })
  devices(
    @CurrentUser() user: CurrentUserPayload,
    @RefreshToken() refreshToken?: string,
  ) {
    return this.auth.listDeviceSessions(user.userId, refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('devices/:sessionId')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: OkResponseDto })
  revokeDeviceSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.auth.revokeDeviceSession(user.userId, sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('devices/logout-others')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: LogoutOthersResponseDto })
  logoutOtherDevices(
    @CurrentUser() user: CurrentUserPayload,
    @RefreshToken() refreshToken?: string,
  ) {
    return this.auth.logoutOtherDevices(user.userId, refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('withdraw')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: OkResponseDto })
  withdraw(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.withdraw(user.companyId, user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: OkResponseDto })
  adminOnly() {
    return { ok: true };
  }
}
