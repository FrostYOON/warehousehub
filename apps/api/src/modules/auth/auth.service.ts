import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { getModuleLogger } from '../../common/logging/module-logger';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { RequestMeta } from './http/decorators/req-meta.decorator';

type AccessTokenPayload = {
  userId: string;
  companyId: string;
  role: string;
};

type DeviceSession = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
};

const logger = getModuleLogger('AuthService');
const DEFAULT_MAX_ACTIVE_DEVICES = 3;

function getMaxActiveDevices(): number {
  const raw = process.env.AUTH_MAX_ACTIVE_DEVICES;
  if (!raw) return DEFAULT_MAX_ACTIVE_DEVICES;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_ACTIVE_DEVICES;
  }
  return parsed;
}

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

    logger.info({
      event: 'auth.register.success',
      companyId: company.id,
      userId: user.id,
      deviceId: dto.deviceId ?? meta.deviceId,
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

    logger.info({
      event: 'auth.login.success',
      companyId: company.id,
      userId: user.id,
      deviceId: dto.deviceId ?? meta.deviceId,
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
      logger.warn({
        event: 'auth.refresh.reuse_detected',
        userId: stored.userId,
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

    logger.info({
      event: 'auth.refresh.success',
      userId: stored.userId,
      companyId: stored.user.companyId,
      deviceId: meta.deviceId ?? stored.deviceId ?? undefined,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info({ event: 'auth.logout.success' });

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
    logger.warn({ event: 'auth.withdraw.success', companyId, userId });
    return { ok: true };
  }

  async listDeviceSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<{ devices: DeviceSession[]; maxActiveDevices: number }> {
    const now = new Date();
    const currentTokenHash = currentRefreshToken
      ? hashToken(currentRefreshToken)
      : undefined;

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        tokenHash: true,
        deviceId: true,
        deviceName: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      devices: tokens
        .map((token) => ({
          id: token.id,
          deviceId: token.deviceId,
          deviceName: token.deviceName,
          userAgent: token.userAgent,
          ip: token.ip,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          isCurrent:
            currentTokenHash != null && token.tokenHash === currentTokenHash,
        }))
        .sort((a, b) => {
          if (a.isCurrent !== b.isCurrent) {
            return a.isCurrent ? -1 : 1;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        }),
      maxActiveDevices: getMaxActiveDevices(),
    };
  }

  async revokeDeviceSession(
    userId: string,
    sessionId: string,
  ): Promise<{ ok: true }> {
    const target = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('Device session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    logger.warn({ event: 'auth.device_session.revoked', userId, sessionId });

    return { ok: true };
  }

  async logoutOtherDevices(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<{ ok: true; revokedCount: number }> {
    if (!currentRefreshToken) {
      throw new UnauthorizedException('Refresh cookie missing');
    }

    const currentTokenHash = hashToken(currentRefreshToken);
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        tokenHash: { not: currentTokenHash },
      },
      data: { revokedAt: new Date() },
    });

    logger.warn({
      event: 'auth.device_session.logout_others',
      userId,
      revokedCount: result.count,
    });

    return { ok: true, revokedCount: result.count };
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
    const now = new Date();
    const deviceId = meta.deviceId?.trim() || undefined;
    const deviceName = meta.deviceName?.trim() || undefined;

    if (deviceId) {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: now },
          deviceId: { not: null },
        },
        select: { id: true, deviceId: true },
      });

      const isExistingDevice = activeTokens.some(
        (t) => t.deviceId === deviceId,
      );
      const activeDeviceCount = new Set(
        activeTokens
          .map((t) => t.deviceId)
          .filter((id): id is string => Boolean(id)),
      ).size;

      const maxActiveDevices = getMaxActiveDevices();
      if (!isExistingDevice && activeDeviceCount >= maxActiveDevices) {
        throw new UnauthorizedException(
          `Device limit exceeded (max ${maxActiveDevices})`,
        );
      }

      // Keep only one active refresh token per device.
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          deviceId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    } else {
      logger.warn({ event: 'auth.device_id.missing', userId });
    }

    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: addDays(30),
        deviceId,
        deviceName,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return refreshToken;
  }
}
