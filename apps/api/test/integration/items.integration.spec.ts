/**
 * ItemsService 통합 테스트 (실제 DB 연동)
 * Prisma mocking 없이 PrismaService + PostgreSQL로 검증.
 * 실행 전: DATABASE_URL 설정, DB 마이그레이션 및 seed 완료
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ItemsModule } from '../../src/items/items.module';
import { ItemsService } from '../../src/items/items.service';

const runIntegration =
  !!process.env.DATABASE_URL && process.env.DATABASE_URL !== '';

(runIntegration ? describe : describe.skip)('ItemsService (integration)', () => {
  let prisma: PrismaService;
  let itemsService: ItemsService;
  let companyId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ItemsModule,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    itemsService = module.get<ItemsService>(ItemsService);

    const company = await prisma.company.findFirst();
    if (!company) {
      throw new Error(
        'No company in DB. Run prisma migrate & prisma db seed first.',
      );
    }
    companyId = company.id;
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('creates and lists items', async () => {
    if (!itemsService) return;

    const created = await itemsService.create(companyId, {
      itemCode: `IT-${Date.now()}`,
      itemName: 'Integration Test Item',
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.itemCode).toContain('IT-');
    expect(created.itemName).toBe('Integration Test Item');
    expect(created.isActive).toBe(true);

    const list = await itemsService.list(companyId, {
      q: 'Integration Test',
      isActive: true,
    });
    expect(list.items.some((i) => i.id === created.id)).toBe(true);

    await prisma.item.delete({ where: { id: created.id } }).catch(() => {});
  });

  it('updates and toggles active status', async () => {
    if (!itemsService) return;

    const created = await itemsService.create(companyId, {
      itemCode: `IT-UPD-${Date.now()}`,
      itemName: 'Update Test Item',
    });

    const updated = await itemsService.update(companyId, created.id, {
      itemName: 'Updated Item Name',
    });
    expect(updated.itemName).toBe('Updated Item Name');

    const deactivated = await itemsService.deactivate(companyId, created.id);
    expect(deactivated.isActive).toBe(false);

    const activated = await itemsService.activate(companyId, created.id);
    expect(activated.isActive).toBe(true);

    await prisma.item.delete({ where: { id: created.id } }).catch(() => {});
  });
});
