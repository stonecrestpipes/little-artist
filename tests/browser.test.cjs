// Browser regression tests. Not part of the app and not run in CI (needs a browser).
// Run: npm i --no-save playwright-core && node tests/browser.test.cjs
// Set CHROME_PATH if Chrome is not in a default location.
const { chromium } = require('playwright-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));

const server = http.createServer((req, res) => {
  const f = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.end(fs.readFileSync(f));
});

const box = (page, sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
const backingMatchesCss = (page) => page.$eval('#cv', (c) => {
  const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  return c.width === Math.round(r.width * d) && c.height === Math.round(r.height * d);
});

const tests = {
  async 'Trace one-board layout keeps a usable board'(page) {
    await page.click('#traceBtn');
    const side = await box(page, '#trace');
    await page.click('#tLay');
    const one = await box(page, '#trace'), board = await box(page, '#twrap');
    assert.ok(Math.abs(one.w - side.w) < 2 && Math.abs(one.h - side.h) < 2, `trace area shrank: ${JSON.stringify(one)}`);
    assert.ok(board.w > 200 && board.h > 200, `board too small: ${JSON.stringify(board)}`);
    await page.click('#tLay');
  },
  async 'Drawing canvas refits after resizing while tracing'(page) {
    await page.click('#traceBtn');
    await page.setViewportSize({ width: 1000, height: 650 });
    await page.click('#traceBtn');
    assert.ok(await backingMatchesCss(page), 'canvas backing store is stale after leaving Trace');
  },
  async 'Trace toolbar labels fit their buttons'(page) {
    await page.click('#traceBtn');
    const bad = await page.$$eval('.tb.tab', (bs) => bs.filter((b) => b.querySelector('span').getBoundingClientRect().width > b.getBoundingClientRect().width).map((b) => b.dataset.set));
    assert.deepEqual(bad, [], `labels wider than buttons: ${bad}`);
  },
  async 'Undo removes the last stroke and Clear can be undone'(page) {
    const r = await page.$eval('#cv', (c) => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top }; });
    await page.mouse.move(r.x + 100, r.y + 100); await page.mouse.down();
    await page.mouse.move(r.x + 300, r.y + 300, { steps: 5 }); await page.mouse.up();
    const inked = await page.$eval('#cv', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 750) return true; return false; });
    assert.ok(inked, 'stroke did not draw');
    await page.click('#clear'); await page.click('#yes');
    await page.click('#undo'); // undoes the Clear
    assert.ok(await page.$eval('#cv', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 750) return true; return false; }), 'Undo did not restore after Clear');
    await page.click('#undo');
    assert.ok(!(await page.$eval('#cv', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 750) return true; return false; })), 'Undo did not remove the stroke');
  },
};

(async () => {
  assert.ok(CHROME, 'Chrome not found; set CHROME_PATH');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: CHROME });
  let failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.75 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    try {
      await page.goto(url); await page.waitForTimeout(200);
      await fn(page);
      assert.deepEqual(errs, [], `page errors: ${errs}`);
      console.log('PASS', name);
    } catch (e) { failed++; console.log('FAIL', name, '-', e.message); }
    await ctx.close();
  }
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
})();
