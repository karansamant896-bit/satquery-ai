if (typeof window !== 'undefined') {
  throw new Error('src/prisma/db.ts cannot be imported from browser/client code.');
}

import 'temporal-polyfill/full/global';
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/satquery',
});

