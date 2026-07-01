#!/bin/bash
# Double-click to render reel/index.html into a smooth 1080x1920 MP4 for Instagram.
# Captures every frame deterministically (no lag) and encodes high quality.
cd "$(dirname "$0")/reel/export" || exit 1

if [ ! -d node_modules/playwright ]; then
  echo "First run: installing the capture tool (one-time, ~30s)…"
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install >/dev/null 2>&1
fi

echo "Recording the reel frame by frame (~1 min — don't close this window)…"
FRAMES=$(node capture.js)

if [ -z "$FRAMES" ] || [ ! -d "$FRAMES" ]; then
  echo "Recording failed. Make sure Google Chrome is installed."
  exit 1
fi

echo "Encoding MP4…"
OUT="../../nature-of-sound-reel.mp4"
ffmpeg -y -framerate 30 -i "$FRAMES/f-%04d.png" \
  -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -movflags +faststart \
  "$OUT" >/dev/null 2>&1
rm -rf "$FRAMES"

echo "Done → nature-of-sound-reel.mp4"
open "$(cd ../.. && pwd)"
