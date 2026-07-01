// Deterministic frame-by-frame capture of the reel.
// Freezes Chrome's clock (CDP virtual time), advances it exactly 1/FPS per
// frame, and screenshots each frame as a lossless PNG. Render speed is
// irrelevant, so the output is perfectly smooth regardless of how heavy the
// animated background is. Prints the frames dir on stdout (logs to stderr).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const LOOP_MS = 16100;   // one full timeline loop (see reel/index.html)
const TAIL_MS = 300;
const FRAME_MS = 1000 / FPS;
const N = Math.round((LOOP_MS + TAIL_MS) / FRAME_MS);

(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const framesDir = path.join(__dirname, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir);

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--force-color-profile=srgb', '--hide-scrollbars'],
  });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const client = await page.context().newCDPSession(page);

  console.error('Loading page…');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}

  // Advance virtual time by `ms`, resolving when that budget is spent.
  function advance(ms) {
    return new Promise((resolve) => {
      client.once('Emulation.virtualTimeBudgetExpired', resolve);
      client.send('Emulation.setVirtualTimePolicy', {
        policy: 'advance',
        budget: ms,
        maxVirtualTimeTaskStarvationCount: 100000,
      });
    });
  }

  // Freeze the clock, then start the reel timeline under frozen time.
  await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  await page.click('#play');

  console.error(`Capturing ${N} frames…`);
  for (let i = 0; i < N; i++) {
    await advance(FRAME_MS);
    await page.screenshot({
      path: path.join(framesDir, 'f-' + String(i).padStart(4, '0') + '.png'),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
      animations: 'allow',
    });
    if (i % 30 === 0) console.error(`  ${i}/${N}`);
  }

  await browser.close();
  console.log(framesDir);
})().catch((err) => { console.error(err); process.exit(1); });
