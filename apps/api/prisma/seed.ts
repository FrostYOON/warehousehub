import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.upsert({
    where: { name: 'Sample Company' },
    update: {},
    create: {
      name: 'Sample Company',
    },
  });

  const defaultBranch = await prisma.branch.upsert({
    where: {
      companyId_code: { companyId: company.id, code: 'DEFAULT' },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Sample Company (본사)',
      code: 'DEFAULT',
    },
  });

  await prisma.branch.upsert({
    where: {
      companyId_code: { companyId: company.id, code: 'TOR' },
    },
    update: {},
    create: {
      companyId: company.id,
      name: '토론토',
      code: 'TOR',
    },
  });

  for (const [type, name] of [
    ['DRY', 'DRY'],
    ['COOL', 'COOL'],
    ['FRZ', 'FRZ'],
  ] as const) {
    await prisma.warehouse.upsert({
      where: {
        branchId_type_region: {
          branchId: defaultBranch.id,
          type,
          region: 'default',
        },
      },
      update: {},
      create: {
        companyId: company.id,
        branchId: defaultBranch.id,
        type,
        name,
        region: 'default',
      },
    });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const user = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'admin@sample.com',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@sample.com',
      name: 'Sample Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Seeded:', {
    companyId: company.id,
    branchId: defaultBranch.id,
    userId: user.id,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
