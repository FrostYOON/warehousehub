import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  const prismaMock: Record<string, jest.Mock | Record<string, jest.Mock>> = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listUsersByCompany', () => {
    it('returns paginated users with default filters', async () => {
      prismaMock.user.count.mockResolvedValue(5);
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'a@b.com', name: 'Alice', role: Role.DELIVERY, isActive: true },
      ]);

      const result = await service.listUsersByCompany('company-1');

      expect(result).toEqual({
        total: 5,
        page: 1,
        limit: 20,
        items: expect.any(Array),
      });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1' },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('applies role and isActive filters', async () => {
      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listUsersByCompany('company-1', {
        role: Role.WH_MANAGER,
        isActive: true,
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            role: Role.WH_MANAGER,
            isActive: true,
          },
        }),
      );
    });

    it('applies search filter with OR on name and email', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listUsersByCompany('company-1', { search: 'john' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('applies pagination and sort params', async () => {
      prismaMock.user.count.mockResolvedValue(50);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listUsersByCompany('company-1', {
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      const created = {
        id: 'user-1',
        email: 'staff@co.com',
        name: 'Staff',
        role: Role.DELIVERY,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.user.create.mockResolvedValue(created);

      const result = await service.createUser({
        companyId: 'company-1',
        email: 'staff@co.com',
        name: 'Staff',
        passwordHash: 'hash',
        role: Role.DELIVERY,
      });

      expect(result).toEqual(created);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            email: 'staff@co.com',
            name: 'Staff',
            role: Role.DELIVERY,
            isActive: true,
          }),
        }),
      );
    });

    it('uses isActive false when provided', async () => {
      prismaMock.user.create.mockResolvedValue({ id: 'u1', isActive: false });

      await service.createUser({
        companyId: 'c1',
        email: 'e@e.com',
        name: 'N',
        passwordHash: 'h',
        role: Role.SALES,
        isActive: false,
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('throws ConflictException on duplicate email (P2002)', async () => {
      const err = new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '1.0',
      });
      prismaMock.user.create.mockRejectedValue(err);

      await expect(
        service.createUser({
          companyId: 'c1',
          email: 'dup@co.com',
          name: 'Dup',
          passwordHash: 'h',
          role: Role.DELIVERY,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('updates role successfully', async () => {
      const updated = { id: 'u1', email: 'a@b.com', name: 'A', role: Role.SALES, isActive: true };
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', role: Role.DELIVERY })
        .mockResolvedValueOnce(updated);
      prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateRole('company-1', 'u1', Role.SALES, 'actor-1');

      expect(result).toEqual(updated);
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', companyId: 'company-1' },
        data: { role: Role.SALES },
      });
      expect(prismaMock.userAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            actorUserId: 'actor-1',
            action: 'ROLE_CHANGED',
            beforeValue: JSON.stringify({ role: Role.DELIVERY }),
            afterValue: JSON.stringify({ role: Role.SALES }),
          }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('company-1', 'unknown', Role.SALES, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when self-demoting from ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN });

      await expect(
        service.updateRole('company-1', 'admin-1', Role.WH_MANAGER, 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivate', () => {
    it('deactivates user successfully', async () => {
      const deactivated = { id: 'u1', email: 'a@b.com', name: 'A', role: Role.DELIVERY, isActive: false };
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', role: Role.DELIVERY })
        .mockResolvedValueOnce(deactivated);
      prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.deactivate('company-1', 'u1', 'actor-1');

      expect(result.isActive).toBe(false);
      expect(prismaMock.userAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'DEACTIVATED' }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('company-1', 'unknown', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when self-deactivating (without allowSelf)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'me', role: Role.DELIVERY });

      await expect(service.deactivate('company-1', 'me', 'me')).rejects.toThrow(ForbiddenException);
    });

    it('allows self-deactivate when allowSelf is true', async () => {
      const deactivated = { id: 'me', isActive: false };
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'me', role: Role.DELIVERY })
        .mockResolvedValueOnce(deactivated);
      prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.deactivate('company-1', 'me', 'me', { allowSelf: true });

      expect(result.isActive).toBe(false);
    });

    it('throws ForbiddenException when deactivating ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN });

      await expect(
        service.deactivate('company-1', 'admin-1', 'actor-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('activate', () => {
    it('activates user successfully', async () => {
      const activated = { id: 'u1', email: 'a@b.com', name: 'A', role: Role.DELIVERY, isActive: true };
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce(activated);
      prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.activate('company-1', 'u1', 'actor-1');

      expect(result.isActive).toBe(true);
      expect(prismaMock.userAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ACTIVATED' }),
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.activate('company-1', 'unknown', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeUnapprovedUser', () => {
    it('deletes inactive user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        companyId: 'company-1',
        isActive: false,
      });
      prismaMock.user.delete.mockResolvedValue({});

      const result = await service.removeUnapprovedUser('company-1', 'u1');

      expect(result).toEqual({ deleted: true });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUnapprovedUser('company-1', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user belongs to different company', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        companyId: 'other-company',
        isActive: false,
      });

      await expect(
        service.removeUnapprovedUser('company-1', 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when user is active', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        companyId: 'company-1',
        isActive: true,
      });

      await expect(
        service.removeUnapprovedUser('company-1', 'u1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkDeactivate', () => {
    it('deactivates allowed users and skips self and ADMIN', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u1', role: Role.DELIVERY },
        { id: 'actor-1', role: Role.ADMIN },
        { id: 'u2', role: Role.SALES },
      ]);
      prismaMock.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkDeactivate('company-1', ['u1', 'actor-1', 'u2'], 'actor-1');

      expect(result).toEqual({ deactivated: 2, skipped: 1 });
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'u2'] }, companyId: 'company-1' },
        data: { isActive: false },
      });
    });

    it('throws BadRequestException when no allowed targets', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'actor-1', role: Role.ADMIN },
      ]);

      await expect(
        service.bulkDeactivate('company-1', ['actor-1'], 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkRole', () => {
    it('updates role for allowed users and skips excludable', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u1', role: Role.DELIVERY },
        { id: 'admin-1', role: Role.ADMIN },
        { id: 'u2', role: Role.SALES },
      ]);
      prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkRole('company-1', ['u1', 'admin-1', 'u2'], Role.WH_MANAGER, 'actor-1');

      expect(result).toEqual({ updated: 2, skipped: 1 });
      expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException when no allowed targets', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'admin-1', role: Role.ADMIN },
      ]);

      await expect(
        service.bulkRole('company-1', ['admin-1'], Role.WH_MANAGER, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listUserAuditLogs', () => {
    it('returns audit logs for user', async () => {
      const logs = [
        {
          id: 'log-1',
          userId: 'u1',
          action: 'ROLE_CHANGED',
          actorUser: { id: 'a1', name: 'Admin', email: 'a@b.com' },
        },
      ];
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.userAuditLog.findMany.mockResolvedValue(logs);

      const result = await service.listUserAuditLogs('company-1', 'u1');

      expect(result).toEqual({ items: logs });
      expect(prismaMock.userAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.listUserAuditLogs('company-1', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('respects limit option', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.userAuditLog.findMany.mockResolvedValue([]);

      await service.listUserAuditLogs('company-1', 'u1', { limit: 50 });

      expect(prismaMock.userAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });
});
