// apps/api/src/modules/auth/auth.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  @SetAuthCookies()
  @ApiOkResponse({ type: LoginResponseDto })
  register(@Body() dto: RegisterDto, @RequestMeta() meta: RequestMetaType) {
    return this.auth.register(dto, meta);
  }

  @Post('signup-request')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  @ApiOkResponse({ type: OkResponseDto })
  signupRequest(@Body() dto: SignupRequestDto) {
    return this.auth.signupRequest(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  @SetAuthCookies()
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto, @RequestMeta() meta: RequestMetaType) {
    return this.auth.login(dto, meta);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
  @ApiOkResponse({ type: OkResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @ApiOkResponse({ type: OkResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
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
  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MeResponseDto })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (_, file, cb) => {
        const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
        cb(null, allowed);
      },
    }),
  )
  @ApiOkResponse({ type: MeResponseDto })
  uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.auth.uploadProfileImage(user.userId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: OkResponseDto })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.userId, dto);
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
