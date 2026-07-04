// Deterministic capture of the reel at exactly 1080x1920.
// The reel is driven by a single JS clock (window.__renderAt), so for each
// frame we just set the clock to the exact time and screenshot. Nothing
// depends on browser animation timing, so every frame is perfectly placed and
// full quality. Prints the frames dir on stdout (logs go to stderr).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const FRAME_MS = 1000 / FPS;

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

  console.error('Loading page…');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}

  // Hide the on-screen controls/hint so they aren't baked into the frames.
  await page.evaluate(() => {
    var c = document.getElementById('controls'); if (c) c.style.display = 'none';
    var h = document.getElementById('hint'); if (h) h.style.display = 'none';
  });

  const L = await page.evaluate(() => window.__reelLength);
  const OFF = await page.evaluate(() => window.__reelOffset);
  const N = Math.round(L / FRAME_MS);

  console.error(`Capturing ${N} frames…`);
  for (let i = 0; i < N; i++) {
    const T = i * FRAME_MS + OFF; // start on slide 1; blank seam lands at the end
    await page.evaluate((t) => window.__renderAt(t), T);
    await page.screenshot({
      path: path.join(framesDir, 'f-' + String(i).padStart(4, '0') + '.png'),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    if (i % 30 === 0) console.error(`  ${i}/${N}`);
  }

  await browser.close();
  console.log(framesDir);
})().catch((err) => { console.error(err); process.exit(1); });
