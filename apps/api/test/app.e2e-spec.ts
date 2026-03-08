import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { SuperTest, Test as AgentTest } from 'supertest';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('GET /health/db returns db status', () => {
    return request(app.getHttpServer())
      .get('/health/db')
      .expect(200)
      .expect((res) => {
        const body = res.body as { ok: boolean; db?: string };
        expect(body).toHaveProperty('ok');
        expect(body).toHaveProperty('db');
        expect(['connected', 'disconnected']).toContain(body.db);
      });
  });
});

/**
 * 인증 후 재고 조회 E2E
 * Seed 데이터 (Sample Company, admin@sample.com / Admin123!) 사용
 */
describe('Auth -> Stocks flow (e2e)', () => {
  let app: INestApplication<App>;
  let agent: SuperTest<AgentTest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    agent = request.agent(app.getHttpServer());
  });

  it('로그인 후 /stocks 조회 성공', async () => {
    const loginRes = await agent
      .post('/auth/login')
      .send({
        companyName: 'Sample Company',
        email: 'admin@sample.com',
        password: 'Admin123!',
      })
      .expect(201);

    expect(loginRes.body).toHaveProperty('user');
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const stocksRes = await agent.get('/stocks').expect(200);
    expect(stocksRes.body).toHaveProperty('items');
    expect(stocksRes.body).toHaveProperty('total');
    expect(Array.isArray(stocksRes.body.items)).toBe(true);
  });
});

/**
 * 입고/출고/반품 핵심 플로우 E2E (인증 선행)
 */
describe('Inbound/Outbound/Returns flow (e2e)', () => {
  let app: INestApplication<App>;
  let agent: SuperTest<AgentTest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    agent = request.agent(app.getHttpServer());
  });

  it('로그인 후 입고·출고·반품 목록 API 호출 성공', async () => {
    await agent
      .post('/auth/login')
      .send({
        companyName: 'Sample Company',
        email: 'admin@sample.com',
        password: 'Admin123!',
      })
      .expect(201);

    const [inboundRes, outboundRes, returnsRes] = await Promise.all([
      agent.get('/inbound/uploads'),
      agent.get('/outbound/orders'),
      agent.get('/returns'),
    ]);

    expect(inboundRes.status).toBe(200);
    expect(outboundRes.status).toBe(200);
    expect(returnsRes.status).toBe(200);
  });
});
