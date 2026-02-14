import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
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
    const existingCompany = await this.users.findCompanyByName(dto.companyName);
    if (existingCompany)
      throw new BadRequestException('Company name already exists');

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

    const refreshToken = await this.issueRefreshToken(user.id);

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

  async login(dto: { companyName: string; email: string; password: string }) {
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

    const refreshToken = await this.issueRefreshToken(user.id);

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
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expired');
    if (!stored.user.isActive) throw new UnauthorizedException();

    // revoke old
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await this.issueAccessToken({
      userId: stored.userId,
      companyId: stored.user.companyId,
      role: stored.user.role,
    });

    const newRefreshToken = await this.issueRefreshToken(stored.userId);

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

  async withdraw(userId: string) {
    await this.users.deactivateUser(userId);
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
