import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEGMENTS = [
  { name: '1-2 MSP', description: '1-2 MSP business segment' },
  { name: '3-5 MSP', description: '3-5 MSP business segment' },
  { name: 'IT', description: 'IT business segment' },
  { name: 'MidMarket', description: 'MidMarket business segment' },
];

const REGIONS = [
  { name: 'North America', description: 'North America region' },
  { name: 'South America', description: 'South America region' },
  { name: 'Europe', description: 'Europe region' },
  { name: 'Australia', description: 'Australia region' },
  { name: 'MENA', description: 'MENA region' },
];

async function main() {
  console.log('Seeding database...');

  for (const segment of SEGMENTS) {
    await prisma.segment.upsert({
      where: { name: segment.name },
      update: {},
      create: segment,
    });
  }

  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { name: region.name },
      update: {},
      create: region,
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
