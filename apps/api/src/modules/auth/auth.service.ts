import {
  Injectable,
  BadRequestException,
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

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 30;
const MAX_ACTIVE_REFRESH_TOKENS = 5;

type RefreshMeta = {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ip?: string;
};

type RegisterDto = {
  companyName: string;
  email: string;
  name: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
};

type LoginDto = {
  companyName: string;
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private issueAccessToken(params: {
    userId: string;
    companyId: string;
    role: string;
  }) {
    return this.jwt.signAsync(
      { sub: params.userId, companyId: params.companyId, role: params.role },
      { expiresIn: ACCESS_EXPIRES_IN },
    );
  }

  private async revokeActiveTokensForDevice(userId: string, deviceId?: string) {
    if (!deviceId) return;

    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueRefreshToken(userId: string, meta: RefreshMeta = {}) {
    // ✅ deviceId가 있으면 같은 기기에서는 항상 1개만 활성 토큰 유지
    await this.revokeActiveTokensForDevice(userId, meta.deviceId);

    const raw = generateRefreshToken();
    const tokenHash = hashToken(raw);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: addDays(REFRESH_EXPIRES_DAYS),
        deviceId: meta.deviceId,
        deviceName: meta.deviceName,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    // ✅ 유저당 활성 refresh token 상한 유지
    const active = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const toRevoke = active.slice(MAX_ACTIVE_REFRESH_TOKENS).map((t) => t.id);
    if (toRevoke.length) {
      await this.prisma.refreshToken.updateMany({
        where: { id: { in: toRevoke } },
        data: { revokedAt: new Date() },
      });
    }

    return raw;
  }

  async register(dto: RegisterDto, meta: RefreshMeta = {}) {
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

  async login(dto: LoginDto, meta: RefreshMeta = {}) {
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

  async refresh(refreshToken: string) {
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
      deviceId: stored.deviceId ?? undefined,
      deviceName: stored.deviceName ?? undefined,
      userAgent: stored.userAgent ?? undefined,
      ip: stored.ip ?? undefined,
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
}
