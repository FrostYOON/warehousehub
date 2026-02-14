import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto, MeResponseDto } from './dto/auth.response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOkResponse({ type: LoginResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
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
    const user = (req as any).user as { userId: string };
    return this.auth.withdraw(user.userId);
  }
}
