import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  const prismaMock = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('trims required/optional strings and creates customer', async () => {
      const dto: CreateCustomerDto = {
        customerName: '  ACME  ',
        customerAddress: '  Seoul  ',
        postalCode: '  12345  ',
        city: '  Seoul  ',
        state: '  KR-11  ',
        country: '  KR  ',
        lat: 37.5,
        lng: 127.0,
      };

      prismaMock.customer.create.mockResolvedValueOnce({ id: 'c1' });

      await service.create('company-1', dto);

      expect(prismaMock.customer.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          customerName: 'ACME',
          customerAddress: 'Seoul',
          postalCode: '12345',
          city: 'Seoul',
          state: 'KR-11',
          country: 'KR',
          lat: 37.5,
          lng: 127.0,
        },
      });
    });

    it('converts blank optional strings to null', async () => {
      const dto: CreateCustomerDto = {
        customerName: 'Name',
        customerAddress: 'Address',
        postalCode: '   ',
        city: '',
      };

      prismaMock.customer.create.mockResolvedValueOnce({ id: 'c2' });
      await service.create('company-1', dto);

      const [createArg] = prismaMock.customer.create.mock.calls as [
        [
          {
            data: {
              postalCode: unknown;
              city: unknown;
              state: unknown;
              country: unknown;
            };
          },
        ],
      ];
      expect(createArg[0].data.postalCode).toBeNull();
      expect(createArg[0].data.city).toBeNull();
      expect(createArg[0].data.state).toBeNull();
      expect(createArg[0].data.country).toBeNull();
    });

    it('throws when required fields are blank', () => {
      const dto: CreateCustomerDto = {
        customerName: '   ',
        customerAddress: 'Address',
      };

      expect(() => service.create('company-1', dto)).toThrow(
        BadRequestException,
      );
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('filters by company and active status', async () => {
      prismaMock.customer.findMany.mockResolvedValueOnce([]);

      await service.list('company-1');

      expect(prismaMock.customer.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        orderBy: { customerName: 'asc' },
      });
    });

    it('applies search query on expected fields', async () => {
      prismaMock.customer.findMany.mockResolvedValueOnce([]);
      await service.list('company-1', 'kim');

      const [findManyArg] = prismaMock.customer.findMany.mock.calls as [
        [{ where: { companyId: string; isActive: boolean; OR?: unknown[] } }],
      ];
      expect(findManyArg[0].where.companyId).toBe('company-1');
      expect(findManyArg[0].where.isActive).toBe(true);
      expect(Array.isArray(findManyArg[0].where.OR)).toBe(true);
      expect(findManyArg[0].where.OR).toHaveLength(6);
    });
  });

  describe('update', () => {
    it('throws not found when customer is out of tenant', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('company-1', 'customer-1', {}),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });

    it('trims required fields and clears optional blanks to null', async () => {
      const dto: UpdateCustomerDto = {
        customerName: '  New Name ',
        customerAddress: '  New Address ',
        postalCode: '   ',
        city: '  Busan  ',
      };

      prismaMock.customer.findFirst.mockResolvedValueOnce({ id: 'customer-1' });
      prismaMock.customer.update.mockResolvedValueOnce({ id: 'customer-1' });

      await service.update('company-1', 'customer-1', dto);

      const [updateArg] = prismaMock.customer.update.mock.calls as [
        [
          {
            where: { id: string };
            data: {
              customerName?: string;
              customerAddress?: string;
              postalCode?: string | null;
              city?: string | null;
              state?: string | null;
              country?: string | null;
            };
          },
        ],
      ];
      expect(updateArg[0].where.id).toBe('customer-1');
      expect(updateArg[0].data.customerName).toBe('New Name');
      expect(updateArg[0].data.customerAddress).toBe('New Address');
      expect(updateArg[0].data.postalCode).toBeNull();
      expect(updateArg[0].data.city).toBe('Busan');
      expect(updateArg[0].data.state).toBeUndefined();
      expect(updateArg[0].data.country).toBeUndefined();
    });

    it('throws bad request when required update field is blank', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({ id: 'customer-1' });
      await expect(
        service.update('company-1', 'customer-1', {
          customerName: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('throws not found when customer does not exist', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.deactivate('company-1', 'customer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets isActive=false for matched customer', async () => {
      prismaMock.customer.findFirst.mockResolvedValueOnce({ id: 'customer-1' });
      prismaMock.customer.update.mockResolvedValueOnce({
        id: 'customer-1',
        isActive: false,
      });

      await service.deactivate('company-1', 'customer-1');

      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: { isActive: false },
      });
    });
  });
});
