import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  hashPassword,
  comparePassword,
} from '../../common/utils/password.util';
import {
  addDays,
  generateRefreshToken,
  hashToken,
} from '../../common/utils/token.util';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { RequestMeta } from './http/decorators/req-meta.decorator';

type AccessTokenPayload = {
  userId: string;
  companyId: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta) {
    const passwordHash = await hashPassword(dto.password);

    const { company, user } = await this.users.createCompanyWithAdmin({
      companyName: dto.companyName,
      adminEmail: dto.email,
      adminName: dto.name,
      passwordHash,
    });

    const accessToken = await this.issueAccessToken({
      userId: user.id,
      companyId: company.id,
      role: user.role,
    });

    const refreshToken = await this.issueRefreshToken(user.id, {
      deviceId: dto.deviceId ?? meta.deviceId,
      deviceName: dto.deviceName ?? meta.deviceName,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
      },
    };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const company = await this.users.findCompanyByName(dto.companyName);
    if (!company) throw new UnauthorizedException('Invalid credentials');

    const user = await this.users.findActiveUserByEmail(company.id, dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await comparePassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.issueAccessToken({
      userId: user.id,
      companyId: company.id,
      role: user.role,
    });

    const refreshToken = await this.issueRefreshToken(user.id, {
      deviceId: dto.deviceId ?? meta.deviceId,
      deviceName: dto.deviceName ?? meta.deviceName,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
      },
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}) {
    const tokenHash = hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (!stored.user.isActive) throw new UnauthorizedException();

    // 🔒 reuse detection: already revoked token used again
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expired');

    // revoke old (rotate)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await this.issueAccessToken({
      userId: stored.userId,
      companyId: stored.user.companyId,
      role: stored.user.role,
    });

    const newRefreshToken = await this.issueRefreshToken(stored.userId, {
      deviceId: meta.deviceId ?? stored.deviceId ?? undefined,
      deviceName: meta.deviceName ?? stored.deviceName ?? undefined,
      userAgent: meta.userAgent ?? stored.userAgent ?? undefined,
      ip: meta.ip ?? stored.ip ?? undefined,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.users.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: company?.name ?? null,
    };
  }

  async withdraw(companyId: string, userId: string) {
    await this.users.deactivate(companyId, userId);
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync({
      sub: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
    });
  }

  private async issueRefreshToken(
    userId: string,
    meta: RequestMeta = {},
  ): Promise<string> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: addDays(30),
        deviceId: meta.deviceId,
        deviceName: meta.deviceName,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return refreshToken;
  }
}
