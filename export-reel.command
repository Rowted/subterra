#!/bin/bash
# Double-click to render reel/index.html into a 1080x1920 MP4 for Instagram.
cd "$(dirname "$0")/reel/export" || exit 1

if [ ! -d node_modules/playwright ]; then
  echo "First run: installing the capture tool (one-time, ~30s)…"
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install >/dev/null 2>&1
  # Video recording needs Playwright's own small ffmpeg helper (uses system Chrome for the rest)
  npx playwright install ffmpeg >/dev/null 2>&1
fi

echo "Recording the reel (~20s — don't close this window)…"
RAW=$(PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node capture.js)

if [ -z "$RAW" ] || [ ! -f "$RAW" ]; then
  echo "Recording failed. Make sure Google Chrome is installed."
  exit 1
fi

echo "Encoding MP4…"
OUT="../../nature-of-sound-reel.mp4"
ffmpeg -y -i "$RAW" -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart -r 30 "$OUT" >/dev/null 2>&1
rm -f "$RAW"

echo "Done → nature-of-sound-reel.mp4"
open "$(cd ../.. && pwd)"
