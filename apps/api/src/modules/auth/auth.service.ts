import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  hashPassword,
  comparePassword,
} from '../../common/utils/password.util';
import {
  addDays,
  addHours,
  generateRefreshToken,
  generateResetToken,
  hashToken,
} from '../../common/utils/token.util';
import { getModuleLogger } from '../../common/logging/module-logger';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { SignupRequestDto } from './dto/signup-request.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
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
    private readonly mail: MailService,
  ) {}

  async listLoginCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return { companies };
  }

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

  async signupRequest(dto: SignupRequestDto) {
    const company = await this.users.findCompanyByName(dto.companyName);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.users.createUser({
        companyId: company.id,
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
        isActive: false,
      });

      logger.info({
        event: 'auth.signup_request.created',
        companyId: company.id,
        userId: user.id,
        role: dto.role,
      });

      return {
        ok: true,
        message: 'Signup request submitted. Awaiting company admin approval.',
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const companyName = (dto.companyName ?? '').trim();
    const email = (dto.email ?? '').trim();
    const password = (dto.password ?? '').trim();

    const company = await this.users.findCompanyByName(companyName);
    if (!company) {
      logger.warn({ event: 'auth.login.fail', reason: 'company_not_found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.users.findActiveUserByEmail(company.id, email);
    if (!user) {
      logger.warn({ event: 'auth.login.fail', reason: 'user_not_found', companyId: company.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      logger.warn({ event: 'auth.login.fail', reason: 'password_mismatch', userId: user.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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

    const [company, branchUsers] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: user.companyId } }),
      this.prisma.branchUser.findMany({
        where: { userId },
        select: { branchId: true },
      }),
    ]);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: company?.name ?? null,
      branchIds:
        branchUsers.length > 0
          ? branchUsers.map((bu) => bu.branchId)
          : null,
      dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0] ?? null,
      phone: user.phone ?? null,
      addressLine1: user.addressLine1 ?? null,
      addressLine2: user.addressLine2 ?? null,
      city: user.city ?? null,
      stateProvince: user.stateProvince ?? null,
      postalCode: user.postalCode ?? null,
      countryCode: user.countryCode ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const data: Record<string, unknown> = {
      name: dto.name.trim(),
    };
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.stateProvince !== undefined) data.stateProvince = dto.stateProvince;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.countryCode !== undefined) data.countryCode = dto.countryCode;
    if (dto.profileImageUrl !== undefined)
      data.profileImageUrl = dto.profileImageUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        dateOfBirth: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
        countryCode: true,
        profileImageUrl: true,
      },
    });

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
    });

    logger.info({
      event: 'auth.profile_updated',
      userId,
      name: updated.name,
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      companyId: updated.companyId,
      companyName: company?.name ?? null,
      dateOfBirth: updated.dateOfBirth?.toISOString().split('T')[0] ?? null,
      phone: updated.phone ?? null,
      addressLine1: updated.addressLine1 ?? null,
      addressLine2: updated.addressLine2 ?? null,
      city: updated.city ?? null,
      stateProvince: updated.stateProvince ?? null,
      postalCode: updated.postalCode ?? null,
      countryCode: updated.countryCode ?? null,
      profileImageUrl: updated.profileImageUrl ?? null,
    };
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    companyName: string | null;
    profileImageUrl: string | null;
    [key: string]: unknown;
  }> {
    const user = await this.users.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const ext = path.extname(file.originalname) || '.png';
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExt.includes(ext.toLowerCase())) {
      throw new BadRequestException('이미지 파일만 업로드 가능합니다 (jpg, png, gif, webp)');
    }

    // __dirname = dist/modules/auth → ../../.. = apps/api, uploads/profiles = apps/api/uploads/profiles
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'profiles');
    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    } catch {
      throw new BadRequestException('업로드 디렉터리 생성 실패');
    }

    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filepath, file.buffer);

    const profileImageUrl = `/uploads/profiles/${filename}`;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        dateOfBirth: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
        countryCode: true,
        profileImageUrl: true,
      },
    });

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
    });

    logger.info({ event: 'auth.avatar_uploaded', userId });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      companyId: updated.companyId,
      companyName: company?.name ?? null,
      dateOfBirth: updated.dateOfBirth?.toISOString().split('T')[0] ?? null,
      phone: updated.phone ?? null,
      addressLine1: updated.addressLine1 ?? null,
      addressLine2: updated.addressLine2 ?? null,
      city: updated.city ?? null,
      stateProvince: updated.stateProvince ?? null,
      postalCode: updated.postalCode ?? null,
      countryCode: updated.countryCode ?? null,
      profileImageUrl: updated.profileImageUrl ?? null,
    };
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const company = await this.users.findCompanyByName(dto.companyName);
    if (!company) {
      return { ok: true };
    }

    const user = await this.users.findActiveUserByEmail(company.id, dto.email);
    if (!user) {
      return { ok: true };
    }

    const rawToken = generateResetToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addHours(1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    });

    const baseUrl =
      process.env.APP_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    if (process.env.NODE_ENV === 'production') {
      await this.mail.send({
        to: user.email,
        subject: '비밀번호 재설정 - WarehouseHub',
        text: `비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 새 비밀번호를 설정해 주세요.\n\n${resetLink}\n\n이 링크는 1시간 후 만료됩니다.\n\n이 요청을 하지 않았다면 이 이메일을 무시해 주세요.`,
        html: `<p>비밀번호 재설정을 요청하셨습니다.</p><p><a href="${resetLink}">비밀번호 재설정하기</a></p><p>이 링크는 1시간 후 만료됩니다.</p><p>이 요청을 하지 않았다면 이 이메일을 무시해 주세요.</p>`,
      });
    } else {
      logger.info({
        event: 'auth.forgot_password.token_created',
        userId: user.id,
        companyId: company.id,
        resetLink,
      });
      await this.mail.send({
        to: user.email,
        subject: '[DEV] 비밀번호 재설정 - WarehouseHub',
        text: `[DEV] Reset link: ${resetLink}`,
      });
    }

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    const tokenHash = hashToken(dto.token);
    const now = new Date();

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: now },
        isActive: true,
      },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다');
    }

    const passwordHash = await hashPassword((dto.newPassword ?? '').trim());

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    logger.info({
      event: 'auth.password_reset.success',
      userId: user.id,
    });

    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findUserById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const ok = await comparePassword(
      (dto.currentPassword ?? '').trim(),
      user.passwordHash,
    );
    if (!ok) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');
    }

    const passwordHash = await hashPassword((dto.newPassword ?? '').trim());

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info({
      event: 'auth.password_changed',
      userId,
    });

    return { ok: true };
  }

  async withdraw(companyId: string, userId: string) {
    await this.users.deactivate(companyId, userId, userId, {
      allowSelf: true,
    });
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
