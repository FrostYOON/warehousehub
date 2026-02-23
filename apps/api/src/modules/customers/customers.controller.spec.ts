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
  };

  beforeEach(async () => {
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

  const req = {
    user: { companyId: 'company-1' },
  } as Request;

  it('create passes companyId and dto to service', async () => {
    const dto: CreateCustomerDto = {
      customerName: 'ACME',
      customerAddress: 'Seoul',
    };
    customersServiceMock.create.mockResolvedValueOnce({ id: 'c1' });

    await controller.create(req, dto);

    expect(customersServiceMock.create).toHaveBeenCalledWith('company-1', dto);
  });

  it('list passes companyId and q to service', async () => {
    customersServiceMock.list.mockResolvedValueOnce([]);

    await controller.list(req, 'kim');

    expect(customersServiceMock.list).toHaveBeenCalledWith('company-1', 'kim');
  });

  it('update passes companyId, id and dto to service', async () => {
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

  it('deactivate passes companyId and id to service', async () => {
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
