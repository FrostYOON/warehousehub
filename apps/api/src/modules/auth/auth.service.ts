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

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 30;

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

  private async issueRefreshToken(userId: string) {
    const raw = generateRefreshToken();
    const tokenHash = hashToken(raw);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: addDays(REFRESH_EXPIRES_DAYS),
      },
    });

    return raw;
  }

  async register(dto: {
    companyName: string;
    email: string;
    name: string;
    password: string;
  }) {
    const passwordHash = await hashPassword(dto.password);

    const { user } = await this.users.createCompanyWithAdmin({
      companyName: dto.companyName,
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    const accessToken = await this.issueAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findActiveUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.issueAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expired');

    // Rotation: 기존 토큰 revoke 후 새 refresh 발급
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.users.findUserById(stored.userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const newAccessToken = await this.issueAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });
    const newRefreshToken = await this.issueRefreshToken(user.id);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });

    if (!stored) return { ok: true }; // idempotent

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.users.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
    };
  }

  async withdraw(userId: string) {
    // MVP: 회원 탈퇴 = 비활성화(soft delete) + refresh 전부 revoke
    await this.users.deactivateUser(userId);

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }
}
