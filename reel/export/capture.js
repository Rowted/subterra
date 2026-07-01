// Records the reel at exactly 1080x1920 using the system Chrome.
// Prints ONLY the raw video path on stdout (logs go to stderr).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// One full loop of the timeline in reel/index.html:
//   holds 2800+1800+1700+1700+1700+2000+2400 = 14100
//   + 7 scene exits * 280ms                   =  1960
//   ~= 16060ms. Add a small tail so the last frame settles.
const LOOP_MS = 16100;
const TAIL_MS = 400;

(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const outDir = __dirname;

  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  const video = page.video();

  console.error('Loading page…');
  await page.goto(url, { waitUntil: 'load' });

  // Let Typekit fonts and images settle before playing.
  await page.waitForTimeout(2000);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}

  console.error('Playing reel…');
  await page.click('#play');
  await page.waitForTimeout(LOOP_MS + TAIL_MS);

  await context.close(); // finalizes the .webm
  await browser.close();

  const vpath = await video.path();
  const raw = path.join(outDir, 'raw.webm');
  if (fs.existsSync(raw)) fs.unlinkSync(raw);
  fs.renameSync(vpath, raw);
  console.log(raw); // stdout: the only thing the shell script reads
})().catch((err) => { console.error(err); process.exit(1); });
