// apps/api/src/modules/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
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
import { LoginResponseDto, MeResponseDto } from './dto/auth.response.dto';
import type { CurrentUserPayload } from './http/decorators/current-user.decorator';
import type { RequestMeta as RequestMetaType } from './http/decorators/req-meta.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(AuthCookiesInterceptor) // Auth 컨트롤러 전체에 적용
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
  @ApiOkResponse({ schema: { example: { ok: true } } })
  refresh(
    @RefreshToken() refreshToken: string,
    @RequestMeta() meta: RequestMetaType,
  ) {
    return this.auth.refresh(refreshToken, meta);
  }

  @Post('logout')
  @ClearAuthCookies()
  @ApiOkResponse({ schema: { example: { ok: true } } })
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
  @Post('withdraw')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  withdraw(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.withdraw(user.companyId, user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  adminOnly() {
    return { ok: true };
  }
}
