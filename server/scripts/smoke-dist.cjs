#!/usr/bin/env node
/**
 * smoke-dist.cjs — loads every compiled CommonJS module in dist/.
 *
 * WHY THIS EXISTS: a dependency bump to uuid@14 (ESM-only) passed
 * `tsc --noEmit` and the entire Jest suite, then crashed the production boot
 * with ERR_REQUIRE_ESM. Neither check loads the emitted CJS output — ts-jest
 * applies its own module interop, and --noEmit never runs anything. This does.
 * If a dependency can't be require()d from the build we actually ship, it fails
 * here, during the build, instead of on the first boot after deploy.
 *
 * Runs with no DB, Redis or network: env vars are stubbed and the entrypoint
 * that calls connectDB()/listen() is skipped. This answers exactly one
 * question — does every compiled module load?
 */
const fs = require('fs');
const path = require('path');

// Node >= 22.12 permits require() of an ES module; Node 20 (what we deploy on,
// per .node-version) does not. Without this, an ESM-only dependency loads fine
// locally and only explodes in production — which is exactly how uuid@14 got
// through. Re-exec ourselves with require(esm) disabled so this check always
// reflects the stricter, deployed behaviour regardless of the local Node.
const STRICT_FLAG = '--no-experimental-require-module';
if (
  !process.env.__SMOKE_STRICT__ &&
  process.allowedNodeEnvironmentFlags &&
  process.allowedNodeEnvironmentFlags.has(STRICT_FLAG)
) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(
    process.execPath,
    [STRICT_FLAG, __filename],
    { stdio: 'inherit', env: { ...process.env, __SMOKE_STRICT__: '1' } },
  );
  process.exit(r.status === null ? 1 : r.status);
}

process.env.NODE_ENV ||= 'test';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/smoke';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.JWT_ACCESS_SECRET ||= 'smoke-access-secret-32-chars-minimum!';
process.env.JWT_REFRESH_SECRET ||= 'smoke-refresh-secret-32-chars-minimum';
process.env.GROQ_API_KEY ||= 'smoke-groq-api-key-placeholder-value';
process.env.CLOUDINARY_URL ||= 'cloudinary://key:secret@cloud';
process.env.CLIENT_URL ||= 'http://localhost:5173';
process.env.LOG_LEVEL ||= 'error';

const DIST = path.join(__dirname, '..', 'dist');
// index.js opens real connections and listens — loading it would hang.
// dist/scripts/* are one-off CLI entrypoints that self-execute and call
// process.exit() on require, which would abort this run before it finished
// (build:prod deletes that directory afterwards anyway).
const SKIP = new Set(['index.js']);
const SKIP_DIRS = ['scripts'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.isFile() && e.name.endsWith('.js') ? [full] : [];
  });
}

if (!fs.existsSync(DIST)) {
  console.error('[smoke] dist/ not found — run the build first.');
  process.exit(1);
}

const files = walk(DIST).filter((f) => {
  const rel = path.relative(DIST, f);
  if (SKIP.has(rel)) return false;
  return !SKIP_DIRS.some((d) => rel.split(path.sep)[0] === d);
});
const failures = [];

for (const f of files) {
  try {
    require(f);
  } catch (err) {
    failures.push({
      file: path.relative(DIST, f),
      message: String(err && err.message).split('\n')[0],
    });
  }
}

if (failures.length) {
  console.error(`\n[smoke] \u2717 ${failures.length}/${files.length} compiled modules failed to load:\n`);
  for (const { file, message } of failures) console.error(`  ${file}\n    ${message}\n`);
  process.exit(1);
}

console.log(`[smoke] \u2713 all ${files.length} compiled modules load cleanly under CommonJS`);
process.exit(0);
