// Pre-deploy checks. No dependencies. Run: node scripts/check.mjs
// In CI, set BASE_SHA to the previous commit so the CACHE-bump rule can run.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const errors = [];
const fail = (m) => errors.push(m);
const read = (f) => readFileSync(f, 'utf8');

// 1. Every inline script in index.html parses.
const html = read('index.html');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!scripts.length) fail('index.html: no inline scripts found');
scripts.forEach((m, i) => {
  try { new vm.Script(m[1], { filename: `index.html script ${i}` }); } catch (e) { fail(`index.html script ${i}: ${e.message}`); }
});

// 2. Service worker parses and only precaches files that exist.
const sw = read('sw.js');
try { new vm.Script(sw, { filename: 'sw.js' }); } catch (e) { fail(`sw.js: ${e.message}`); }
const list = sw.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/);
if (!list) fail('sw.js: PRECACHE list not found');
else for (const [, u] of list[1].matchAll(/'([^']+)'/g)) {
  if (u !== './' && !existsSync(u)) fail(`sw.js precaches missing file: ${u}`);
}

// 3. Manifest is valid JSON and its icons exist with the declared size.
let manifest;
try { manifest = JSON.parse(read('manifest.webmanifest')); } catch (e) { fail(`manifest.webmanifest: ${e.message}`); }
for (const icon of manifest?.icons ?? []) {
  const file = icon.src.replace(/^\.\//, '');
  if (!existsSync(file)) { fail(`manifest icon missing: ${file}`); continue; }
  const b = readFileSync(file);
  const size = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  if (size !== icon.sizes) fail(`${file} is ${size}, manifest says ${icon.sizes}`);
}

// 4. If the app files changed since BASE_SHA, the service-worker CACHE name must change too.
const base = process.env.BASE_SHA;
if (base && !/^0+$/.test(base)) {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const changed = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
    const appFiles = changed.filter((f) => /^(index\.html|manifest\.webmanifest|icon-.*\.png)$/.test(f));
    const cacheOf = (t) => (t.match(/const CACHE = '([^']+)'/) || [])[1];
    if (appFiles.length && cacheOf(git('show', `${base}:sw.js`)) === cacheOf(sw)) {
      fail(`${appFiles.join(', ')} changed but CACHE in sw.js was not bumped`);
    }
  } catch (e) {
    console.warn(`skipping CACHE-bump check (cannot diff against ${base}): ${e.message.split('\n')[0]}`);
  }
}

if (errors.length) { console.error(errors.map((e) => `FAIL ${e}`).join('\n')); process.exit(1); }
console.log('All checks passed');
