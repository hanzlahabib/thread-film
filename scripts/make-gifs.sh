#!/usr/bin/env bash
# Cuts the README sample GIFs from the three rendered films. Render them first, once each:
#   pnpm run render:demo        # out/demo-dark.mp4 and out/demo-light.mp4 (16:9)
#   pnpm run render:9x16        # out/film-9x16.mp4 (dark, 9:16)
# Then: pnpm run gif   ->   docs/demo.gif, themes.gif, vertical.gif, pullback.gif
# Needs ffmpeg on the PATH.
set -euo pipefail
cd "$(dirname "$0")/.."

DARK=out/demo-dark.mp4
LIGHT=out/demo-light.mp4
PORTRAIT=out/film-9x16.mp4
FPS=15 # GIF frame rate: smooth enough for a line moving across a screen, and small.
mkdir -p docs
for f in "$DARK" "$LIGHT" "$PORTRAIT"; do
  [ -f "$f" ] || { echo "missing $f: render it first (see the header of this script)" >&2; exit 1; }
done

# Quality: a palette of its own per GIF (palettegen, stats_mode=diff) applied with fine ordered dithering
# (bayer_scale=3), lanczos scaling, 15 fps. The accent colour is a flat fill and the backgrounds are flat, so
# the palette spends its colours on text edges and the line instead of banding.
PALETTE='palettegen=stats_mode=diff:max_colors=128'
# The hero is the longest cut; 96 colours keeps it under 8 MB.
PALETTE_HERO='palettegen=stats_mode=diff:max_colors=96'
USE='paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle'

# gif <out> <start-seconds> <duration-seconds> <filter graph> <input> [<input> ...]
gif() {
  local out=$1 ss=$2 t=$3 vf=$4
  shift 4
  local inputs=() i
  for i in "$@"; do inputs+=(-ss "$ss" -t "$t" -i "$i"); done
  flock /tmp/claude-render.lock ffmpeg -v error -y "${inputs[@]}" -filter_complex "$vf" -map '[g]' -loop 0 "$out"
  printf '%s  %s bytes\n' "$out" "$(stat -c %s "$out")"
}
SCALE='flags=lanczos'

# Hero (1.0 s to 8.5 s of the dark film): the hook line, the wide shot of the first screen, the line starting and
# the camera pushing in, the draft becoming an order with the chip landing on Order #1042 and its ring and label.
# It ends on that held frame, with the label up.
gif docs/demo.gif 1.0 7.5 "[0:v]fps=$FPS,scale=960:-2:$SCALE,split[a][b];[a]$PALETTE_HERO[p];[b][p]$USE[g]" "$DARK"

# Themes: the same flight into the order screen in dark (left) and light (right), 1200 wide in total (5.6 s to 8.5 s).
gif docs/themes.gif 5.6 2.9 "[0:v]fps=$FPS,scale=600:-2:$SCALE[d];[1:v]fps=$FPS,scale=600:-2:$SCALE[l];[d][l]hstack,split[a][b];[a]$PALETTE[p];[b][p]$USE[g]" "$DARK" "$LIGHT"

# Vertical: the 9:16 render at 360x640 (5.6 s to 10.7 s): the chip flight into the order and the Take payment stop.
gif docs/vertical.gif 5.6 5.1 "[0:v]fps=$FPS,scale=360:640:$SCALE,split[a][b];[a]$PALETTE[p];[b][p]$USE[g]" "$PORTRAIT"

# Pull-back (22.0 s to 25.5 s): the last landing, the camera pulling back to the whole line, the closing words,
# and a 0.8 s hold at the end.
gif docs/pullback.gif 22.0 3.5 "[0:v]fps=$FPS,scale=960:-2:$SCALE,split[a][b];[a]$PALETTE[p];[b][p]$USE[g]" "$DARK"

du -ch docs/*.gif | tail -1
