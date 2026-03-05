import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { hashPassword } from '../../common/utils/password.util';

jest.mock('../../common/utils/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersController', () => {
  let controller: UsersController;
  const usersServiceMock = {
    listUsersByCompany: jest.fn(),
    createUser: jest.fn(),
    updateRole: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
    removeUnapprovedUser: jest.fn(),
    bulkDeactivate: jest.fn(),
    bulkRole: jest.fn(),
    listUserAuditLogs: jest.fn(),
  };

  const req = {
    user: { companyId: 'company-1', userId: 'actor-1' },
  } as Request & { user: { companyId: string; userId: string } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list (GET /users)', () => {
    it('calls listUsersByCompany with query params', async () => {
      const query = {
        role: Role.DELIVERY,
        isActive: true,
        page: 1,
        limit: 20,
        search: 'john',
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      };
      usersServiceMock.listUsersByCompany.mockResolvedValue({
        total: 10,
        page: 1,
        limit: 20,
        items: [],
      });

      const result = await controller.list(req, query);

      expect(usersServiceMock.listUsersByCompany).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          role: Role.DELIVERY,
          isActive: true,
          page: 1,
          limit: 20,
          search: 'john',
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      );
      expect(result).toEqual({ total: 10, page: 1, limit: 20, items: [] });
    });
  });

  describe('create (POST /users)', () => {
    it('creates user with hashed password', async () => {
      const dto = {
        email: 'staff@co.com',
        name: 'Staff Name',
        password: 'User1234!',
        role: Role.DELIVERY,
      };
      const created = {
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        role: dto.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersServiceMock.createUser.mockResolvedValue(created);

      const result = await controller.create(req, dto);

      expect(hashPassword).toHaveBeenCalledWith('User1234!');
      expect(usersServiceMock.createUser).toHaveBeenCalledWith({
        companyId: 'company-1',
        email: dto.email,
        name: dto.name,
        passwordHash: 'hashed-password',
        role: dto.role,
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateRole (PATCH /users/:id/role)', () => {
    it('updates user role', async () => {
      const dto = { role: Role.SALES };
      const updated = { id: 'user-1', role: Role.SALES };
      usersServiceMock.updateRole.mockResolvedValue(updated);

      const result = await controller.updateRole(req, 'user-1', dto);

      expect(usersServiceMock.updateRole).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        Role.SALES,
        'actor-1',
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deactivate (PATCH /users/:id/deactivate)', () => {
    it('deactivates user', async () => {
      const deactivated = { id: 'user-1', isActive: false };
      usersServiceMock.deactivate.mockResolvedValue(deactivated);

      const result = await controller.deactivate(req, 'user-1');

      expect(usersServiceMock.deactivate).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        'actor-1',
      );
      expect(result).toEqual(deactivated);
    });
  });

  describe('activate (PATCH /users/:id/activate)', () => {
    it('activates user', async () => {
      const activated = { id: 'user-1', isActive: true };
      usersServiceMock.activate.mockResolvedValue(activated);

      const result = await controller.activate(req, 'user-1');

      expect(usersServiceMock.activate).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        'actor-1',
      );
      expect(result).toEqual(activated);
    });
  });

  describe('remove (DELETE /users/:id)', () => {
    it('removes unapproved user', async () => {
      usersServiceMock.removeUnapprovedUser.mockResolvedValue({ deleted: true });

      const result = await controller.remove(req, 'user-1');

      expect(usersServiceMock.removeUnapprovedUser).toHaveBeenCalledWith(
        'company-1',
        'user-1',
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('bulkDeactivate (PATCH /users/bulk-deactivate)', () => {
    it('bulk deactivates users', async () => {
      const dto = { userIds: ['u1', 'u2', 'u3'] };
      usersServiceMock.bulkDeactivate.mockResolvedValue({
        deactivated: 3,
        skipped: 0,
      });

      const result = await controller.bulkDeactivate(req, dto);

      expect(usersServiceMock.bulkDeactivate).toHaveBeenCalledWith(
        'company-1',
        dto.userIds,
        'actor-1',
      );
      expect(result).toEqual({ deactivated: 3, skipped: 0 });
    });
  });

  describe('bulkRole (PATCH /users/bulk-role)', () => {
    it('bulk updates roles', async () => {
      const dto = { userIds: ['u1', 'u2'], role: Role.WH_MANAGER };
      usersServiceMock.bulkRole.mockResolvedValue({ updated: 2, skipped: 0 });

      const result = await controller.bulkRole(req, dto);

      expect(usersServiceMock.bulkRole).toHaveBeenCalledWith(
        'company-1',
        dto.userIds,
        Role.WH_MANAGER,
        'actor-1',
      );
      expect(result).toEqual({ updated: 2, skipped: 0 });
    });
  });

  describe('auditLogs (GET /users/:id/audit-logs)', () => {
    it('returns user audit logs', async () => {
      const logs = { items: [{ id: 'log-1', action: 'ROLE_CHANGED' }] };
      usersServiceMock.listUserAuditLogs.mockResolvedValue(logs);

      const result = await controller.auditLogs(req, 'user-1');

      expect(usersServiceMock.listUserAuditLogs).toHaveBeenCalledWith(
        'company-1',
        'user-1',
      );
      expect(result).toEqual(logs);
    });
  });
});
