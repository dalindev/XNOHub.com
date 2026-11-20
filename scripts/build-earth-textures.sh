#!/usr/bin/env bash
# Re-encodes the bundled cloud picture as KTX2 (Basis ETC1S, mipmapped,
# Y-flipped for three's KTX2Loader), so it stays compressed on the GPU. It is
# the cloud layer's fallback for when NASA's daily photo can't be reached.
# Needs `basisu` (brew install basis_universal).
#   scripts/build-earth-textures.sh
#
# The Earth's surface needs no build step any more: it is streamed as 3D tiles
# (components/tiled-earth), over one small picture from scripts/build-small-maps.py.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/earth-assets-mini
OUT=public/earth
mkdir -p "$OUT"

enc() { # src out width height colorspace(srgb|linear)
  basisu -file "$SRC/$1" -output_file "$OUT/$2" -resample "$3" "$4" \
    -mipmap -y_flip -"$5" -quality 90 -effort 4 > /dev/null
  echo "$OUT/$2 $(du -h "$OUT/$2" | cut -f1)"
}

enc fair_clouds_4k.png clouds-4k.ktx2 4096 2048 srgb
