import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { CurrentUserPayload } from './http/decorators/current-user.decorator';
import type { RequestMeta } from './http/decorators/req-meta.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    withdraw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register passes dto and meta to service', async () => {
    const dto = {
      companyName: 'acme',
      email: 'a@a.com',
      name: 'Alice',
      password: 'pw',
    };
    const meta: RequestMeta = { ip: '127.0.0.1', deviceId: 'dev-1' };
    authServiceMock.register.mockResolvedValueOnce({ ok: true });

    await controller.register(dto, meta);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto, meta);
  });

  it('login passes dto and meta to service', async () => {
    const dto = { companyName: 'acme', email: 'a@a.com', password: 'pw' };
    const meta: RequestMeta = { deviceName: 'Mac' };
    authServiceMock.login.mockResolvedValueOnce({ ok: true });

    await controller.login(dto, meta);

    expect(authServiceMock.login).toHaveBeenCalledWith(dto, meta);
  });

  it('refresh passes refreshToken and meta to service', async () => {
    const meta: RequestMeta = { ip: '127.0.0.1' };
    authServiceMock.refresh.mockResolvedValueOnce({ ok: true });

    await controller.refresh('refresh-token', meta);

    expect(authServiceMock.refresh).toHaveBeenCalledWith('refresh-token', meta);
  });

  it('logout passes empty string when refresh token missing', async () => {
    authServiceMock.logout.mockResolvedValueOnce({ ok: true });

    await controller.logout(undefined);

    expect(authServiceMock.logout).toHaveBeenCalledWith('');
  });

  it('me forwards current user id', async () => {
    const user = { userId: 'user-1', companyId: 'company-1', role: 'ADMIN' };
    authServiceMock.me.mockResolvedValueOnce({ id: 'user-1' });

    await controller.me(user as CurrentUserPayload);

    expect(authServiceMock.me).toHaveBeenCalledWith('user-1');
  });

  it('withdraw forwards companyId and userId', async () => {
    const user = { userId: 'user-1', companyId: 'company-1', role: 'ADMIN' };
    authServiceMock.withdraw.mockResolvedValueOnce({ ok: true });

    await controller.withdraw(user as CurrentUserPayload);

    expect(authServiceMock.withdraw).toHaveBeenCalledWith(
      'company-1',
      'user-1',
    );
  });
});
