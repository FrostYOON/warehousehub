import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import type { Request } from 'express';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  const customersServiceMock = {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  const req = {
    user: { companyId: 'company-1' },
  } as Request;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: customersServiceMock },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list (GET /customers)', () => {
    it('passes companyId and opts to service with q', async () => {
      customersServiceMock.list.mockResolvedValueOnce([]);

      await controller.list(req, 'kim');

      expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', {
        q: 'kim',
      });
    });

    it('passes includeInactive when query is true', async () => {
      customersServiceMock.list.mockResolvedValueOnce([]);

      await controller.list(req, undefined, 'true', undefined);

      expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', {
        includeInactive: true,
      });
    });

    it('passes isActive when query is true or false', async () => {
      customersServiceMock.list.mockResolvedValueOnce([]);
      await controller.list(req, undefined, undefined, 'true');
      expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', {
        isActive: true,
      });

      customersServiceMock.list.mockResolvedValueOnce([]);
      await controller.list(req, undefined, undefined, 'false');
      expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', {
        isActive: false,
      });
    });

    it('passes empty opts when no query params', async () => {
      customersServiceMock.list.mockResolvedValueOnce([]);

      await controller.list(req);

      expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', {});
    });
  });

  describe('create (POST /customers)', () => {
    it('passes companyId and dto to service', async () => {
      const dto: CreateCustomerDto = {
        customerName: 'ACME',
        customerAddress: 'Seoul',
      };
      customersServiceMock.create.mockResolvedValueOnce({ id: 'c1' });

      await controller.create(req, dto);

      expect(customersServiceMock.create).toHaveBeenCalledWith(
        'company-1',
        dto,
      );
    });
  });

  describe('update (PATCH /customers/:id)', () => {
    it('passes companyId, id and dto to service', async () => {
      const dto: UpdateCustomerDto = {
        city: 'Busan',
      };
      customersServiceMock.update.mockResolvedValueOnce({ id: 'c1' });

      await controller.update(req, 'c1', dto);

      expect(customersServiceMock.update).toHaveBeenCalledWith(
        'company-1',
        'c1',
        dto,
      );
    });
  });

  describe('deactivate (PATCH /customers/:id/deactivate)', () => {
    it('passes companyId and id to service', async () => {
      customersServiceMock.deactivate.mockResolvedValueOnce({
        id: 'c1',
        isActive: false,
      });

      await controller.deactivate(req, 'c1');

      expect(customersServiceMock.deactivate).toHaveBeenCalledWith(
        'company-1',
        'c1',
      );
    });
  });

  describe('activate (PATCH /customers/:id/activate)', () => {
    it('passes companyId and id to service', async () => {
      customersServiceMock.activate.mockResolvedValueOnce({
        id: 'c1',
        isActive: true,
      });

      await controller.activate(req, 'c1');

      expect(customersServiceMock.activate).toHaveBeenCalledWith(
        'company-1',
        'c1',
      );
    });
  });
});
