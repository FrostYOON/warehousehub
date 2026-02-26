import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { comparePassword } from '../../common/utils/password.util';

jest.mock('../../common/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    refreshToken: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  };
  const usersMock = {
    createCompanyWithAdmin: jest.fn(),
    findCompanyByName: jest.fn(),
    findActiveUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    deactivate: jest.fn(),
  };
  const jwtMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.refreshToken.findMany.mockResolvedValue([]);
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: UsersService, useValue: usersMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('throws unauthorized when company does not exist', async () => {
      usersMock.findCompanyByName.mockResolvedValueOnce(null);

      await expect(
        service.login({
          companyName: 'acme',
          email: 'a@a.com',
          password: 'pw',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws unauthorized when password mismatch', async () => {
      usersMock.findCompanyByName.mockResolvedValueOnce({ id: 'company-1' });
      usersMock.findActiveUserByEmail.mockResolvedValueOnce({
        id: 'user-1',
        role: 'ADMIN',
        passwordHash: 'hashed',
      });
      (comparePassword as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({
          companyName: 'acme',
          email: 'a@a.com',
          password: 'pw',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues access and refresh token on valid credentials', async () => {
      usersMock.findCompanyByName.mockResolvedValueOnce({
        id: 'company-1',
        name: 'ACME',
      });
      usersMock.findActiveUserByEmail.mockResolvedValueOnce({
        id: 'user-1',
        email: 'a@a.com',
        name: 'Alice',
        role: 'ADMIN',
        passwordHash: 'hashed',
      });
      (comparePassword as jest.Mock).mockResolvedValueOnce(true);
      jwtMock.signAsync.mockResolvedValueOnce('access-token');
      prismaMock.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.login(
        { companyName: 'acme', email: 'a@a.com', password: 'pw' },
        { deviceId: 'dev-1', deviceName: 'Mac', ip: '127.0.0.1' },
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      const createCalls = prismaMock.refreshToken.create.mock
        .calls as unknown as [
        [
          {
            data: {
              userId: string;
              deviceId?: string;
              deviceName?: string;
              ip?: string;
              tokenHash: string;
              expiresAt: Date;
            };
          },
        ]?,
      ];
      const createCall = createCalls[0]?.[0] as {
        data: {
          userId: string;
          deviceId?: string;
          deviceName?: string;
          ip?: string;
          tokenHash: string;
          expiresAt: Date;
        };
      };
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data.deviceId).toBe('dev-1');
      expect(createCall.data.deviceName).toBe('Mac');
      expect(createCall.data.ip).toBe('127.0.0.1');
      expect(typeof createCall.data.tokenHash).toBe('string');
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('refresh', () => {
    it('throws on revoked token reuse and revokes remaining active tokens', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        user: { isActive: true, companyId: 'company-1', role: 'ADMIN' },
      });

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        'Refresh token reuse detected',
      );
      const updateManyCalls = prismaMock.refreshToken.updateMany.mock
        .calls as unknown as [
        [
          {
            where: { userId: string; revokedAt: null };
            data: { revokedAt: Date };
          },
        ]?,
      ];
      const updateManyCall = updateManyCalls[0]?.[0] as {
        where: { userId: string; revokedAt: null };
        data: { revokedAt: Date };
      };
      expect(updateManyCall.where).toEqual({
        userId: 'user-1',
        revokedAt: null,
      });
      expect(updateManyCall.data.revokedAt).toBeInstanceOf(Date);
    });

    it('rotates refresh token and returns new token pair', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        deviceId: 'stored-device',
        deviceName: 'stored-name',
        userAgent: 'stored-agent',
        ip: '1.1.1.1',
        user: { isActive: true, companyId: 'company-1', role: 'ADMIN' },
      });
      prismaMock.refreshToken.update.mockResolvedValueOnce({});
      jwtMock.signAsync.mockResolvedValueOnce('new-access');
      prismaMock.refreshToken.create.mockResolvedValueOnce({});

      const result = await service.refresh('old-refresh', {
        deviceName: 'override-device-name',
      });

      const updateCalls = prismaMock.refreshToken.update.mock
        .calls as unknown as [
        [{ where: { id: string }; data: { revokedAt: Date } }]?,
      ];
      const updateCall = updateCalls[0]?.[0] as {
        where: { id: string };
        data: { revokedAt: Date };
      };
      expect(updateCall.where).toEqual({ id: 'rt-1' });
      expect(updateCall.data.revokedAt).toBeInstanceOf(Date);

      const rotatedCreateCalls = prismaMock.refreshToken.create.mock
        .calls as unknown as [
        [
          {
            data: {
              userId: string;
              deviceId?: string;
              deviceName?: string;
              userAgent?: string;
              ip?: string;
            };
          },
        ]?,
      ];
      const rotatedCreateCall = rotatedCreateCalls[0]?.[0] as {
        data: {
          userId: string;
          deviceId?: string;
          deviceName?: string;
          userAgent?: string;
          ip?: string;
        };
      };
      expect(rotatedCreateCall.data.userId).toBe('user-1');
      expect(rotatedCreateCall.data.deviceId).toBe('stored-device');
      expect(rotatedCreateCall.data.deviceName).toBe('override-device-name');
      expect(rotatedCreateCall.data.userAgent).toBe('stored-agent');
      expect(rotatedCreateCall.data.ip).toBe('1.1.1.1');
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('logout', () => {
    it('revokes active matching token by hash', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.logout('refresh-token');

      const updateManyCalls = prismaMock.refreshToken.updateMany.mock
        .calls as unknown as [
        [
          {
            where: { tokenHash: string; revokedAt: null };
            data: { revokedAt: Date };
          },
        ]?,
      ];
      const updateManyCall = updateManyCalls[0]?.[0] as {
        where: {
          tokenHash: string;
          revokedAt: null;
        };
        data: { revokedAt: Date };
      };
      expect(typeof updateManyCall.where.tokenHash).toBe('string');
      expect(updateManyCall.where.revokedAt).toBeNull();
      expect(updateManyCall.data.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('listDeviceSessions', () => {
    it('returns active device sessions with current session marker', async () => {
      const now = new Date();
      prismaMock.refreshToken.findMany.mockResolvedValueOnce([
        {
          id: 'session-1',
          tokenHash:
            '8f7f7eeb8f7ca0841f05dfc9f0f338910f85e9f3f74f8c012f26e176f2eb8f10',
          deviceId: 'device-1',
          deviceName: 'Web (MacIntel)',
          userAgent: 'Mozilla',
          ip: '127.0.0.1',
          createdAt: now,
          expiresAt: now,
        },
      ]);

      const result = await service.listDeviceSessions('user-1', 'refresh-token');

      const calls = prismaMock.refreshToken.findMany.mock.calls as unknown as [
        [
          {
            where: {
              userId: string;
              revokedAt: null;
              expiresAt: { gt: Date };
            };
          },
        ]?,
      ];
      const call = calls[0]?.[0] as {
        where: {
          userId: string;
          revokedAt: null;
          expiresAt: { gt: Date };
        };
      };
      expect(call.where.userId).toBe('user-1');
      expect(call.where.revokedAt).toBeNull();
      expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(result.maxActiveDevices).toBeGreaterThan(0);
      expect(result.devices).toHaveLength(1);
      expect(result.devices[0]?.id).toBe('session-1');
      expect(result.devices[0]?.isCurrent).toBe(false);
    });
  });

  describe('revokeDeviceSession', () => {
    it('throws not found when session does not belong to user', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.revokeDeviceSession('user-1', 'session-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('revokes matched active session', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValueOnce({ id: 'session-1' });
      prismaMock.refreshToken.update.mockResolvedValueOnce({});

      const result = await service.revokeDeviceSession('user-1', 'session-1');

      const updateCalls = prismaMock.refreshToken.update.mock
        .calls as unknown as [
        [{ where: { id: string }; data: { revokedAt: Date } }]?,
      ];
      const updateCall = updateCalls[0]?.[0] as {
        where: { id: string };
        data: { revokedAt: Date };
      };
      expect(updateCall.where.id).toBe('session-1');
      expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
      expect(result.ok).toBe(true);
    });
  });

  describe('logoutOtherDevices', () => {
    it('throws when refresh token is missing', async () => {
      await expect(service.logoutOtherDevices('user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes all active sessions except current one', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.logoutOtherDevices('user-1', 'refresh-token');

      const updateManyCalls = prismaMock.refreshToken.updateMany.mock
        .calls as unknown as [
        [
          {
            where: {
              userId: string;
              revokedAt: null;
              tokenHash: { not: string };
            };
            data: { revokedAt: Date };
          },
        ]?,
      ];
      const updateManyCall = updateManyCalls[0]?.[0] as {
        where: {
          userId: string;
          revokedAt: null;
          tokenHash: { not: string };
        };
        data: { revokedAt: Date };
      };
      expect(updateManyCall.where.userId).toBe('user-1');
      expect(updateManyCall.where.revokedAt).toBeNull();
      expect(typeof updateManyCall.where.tokenHash.not).toBe('string');
      expect(updateManyCall.data.revokedAt).toBeInstanceOf(Date);
      expect(result).toEqual({ ok: true, revokedCount: 2 });
    });
  });
});
