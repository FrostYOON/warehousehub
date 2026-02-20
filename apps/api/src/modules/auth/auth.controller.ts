import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto, MeResponseDto } from './dto/auth.response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private getRequestMeta(req: Request) {
    const xff = req.headers['x-forwarded-for'];
    const ip = Array.isArray(xff)
      ? xff[0]
      : typeof xff === 'string'
        ? xff.split(',')[0].trim()
        : req.ip;

    const userAgent = req.headers['user-agent'] ?? undefined;

    return {
      ip: ip ?? undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  }

  @Post('register')
  @ApiOkResponse({ type: LoginResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.auth.login(dto, this.getRequestMeta(req));
  }

  @Post('refresh')
  @ApiOkResponse({
    schema: { example: { accessToken: 'jwt', refreshToken: 'refresh' } },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MeResponseDto })
  me(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    return this.auth.me(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('withdraw')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  withdraw(@Req() req: Request) {
    const user = (req as any).user as { companyId: string; userId: string };
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
