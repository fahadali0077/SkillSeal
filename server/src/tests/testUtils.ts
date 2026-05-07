// testUtils.ts — MongoDB test helpers
// Uses mongodb-memory-server when available, gracefully degrades otherwise.

import mongoose from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mongoServer: any = null;
let connected = false;

export async function connectTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) { connected = true; return; }
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: 'SkillSeal_test' },
      binary: { downloadDir: '/home/claude/.cache/mongodb-memory-server' },
    });
    await mongoose.connect((mongoServer as { getUri(): string }).getUri(), {
      dbName: 'SkillSeal_test',
      serverSelectionTimeoutMS: 10_000,
    });
    connected = true;
  } catch (err) {
    // Fallback: try a local MongoDB on standard port
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/SkillSeal_test', {
        serverSelectionTimeoutMS: 2_000,
      });
      connected = true;
    } catch {
      console.warn(
        '[testUtils] MongoDB unavailable — DB-dependent tests will be skipped.',
        (err as Error).message
      );
      connected = false;
    }
  }
}

export async function disconnectTestDB(): Promise<void> {
  if (!connected) return;
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } catch { /* ignore */ }
  if (mongoServer) { await mongoServer.stop().catch(() => { }); mongoServer = null; }
  connected = false;
}

export async function clearCollections(...names: string[]): Promise<void> {
  if (!connected || mongoose.connection.readyState === 0) return;
  const db = mongoose.connection.db;
  if (!db) return;
  await Promise.all(names.map(n => db.collection(n).deleteMany({}).catch(() => { })));
}

export function isDbConnected(): boolean { return connected; }
