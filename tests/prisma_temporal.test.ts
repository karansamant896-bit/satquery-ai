import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/prisma/db.ts';
import { PrismaStore, toTemporalInstant, toJsDate } from '../src/lib/analysisService.ts';

test('Temporal polyfill and Prisma 8 timestamptz codec verification', async () => {
  assert.ok(globalThis.Temporal, 'Global Temporal must be polyfilled');
  assert.ok(globalThis.Temporal.Instant, 'Temporal.Instant must exist');

  // Test toTemporalInstant with Date
  const now = new Date('2026-09-09T06:30:00.000Z');
  const instant = toTemporalInstant(now);
  assert.ok(instant instanceof Temporal.Instant);
  assert.equal(instant.toString(), '2026-09-09T06:30:00Z');

  // Test toJsDate with Temporal.Instant
  const backToDate = toJsDate(instant);
  assert.ok(backToDate instanceof Date);
  assert.equal(backToDate.toISOString(), '2026-09-09T06:30:00.000Z');

  // Test Prisma timestamptz codec directly
  const codec = db.context.contractCodecs.forCodecRef({ codecId: 'pg/timestamptz-temporal@1' });
  assert.ok(codec, 'Prisma timestamptz codec must exist');

  // The codec encode function should succeed with Temporal.Instant
  const encoded = await codec.encode(instant);
  assert.equal(typeof encoded, 'string');
  assert.ok(encoded.includes('2026-09-09'));

  // Test store instance
  const store = new PrismaStore();
  assert.ok(typeof store.createAnalysis === 'function');
  assert.ok(typeof store.updateAnalysis === 'function');
  assert.ok(typeof store.createInputImage === 'function');
  assert.ok(typeof store.createExecutionStep === 'function');
  assert.ok(typeof store.createEvidence === 'function');
});
