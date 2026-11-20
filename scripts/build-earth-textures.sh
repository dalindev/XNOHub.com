#!/usr/bin/env bash
# Re-encodes the Earth textures as KTX2 (Basis ETC1S, mipmapped, Y-flipped for
# three's KTX2Loader). GPU memory per 8K map drops from ~180 MB (RGBA + mips)
# to ~22 MB. Needs `basisu` (brew install basis_universal).
#   scripts/build-earth-textures.sh
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

enc earth_no_clouds_8k.jpg  color-8k.ktx2  8192 4096 srgb &
enc earth_no_clouds_8k.jpg  color-4k.ktx2  4096 2048 srgb &
enc earth_night_8k.jpg      night-8k.ktx2  8192 4096 srgb &
enc earth_night_8k.jpg      night-4k.ktx2  4096 2048 srgb &
enc earth_elev_bump_8k.jpg  bump-4k.ktx2   4096 2048 linear &
enc earth_water_8k.png      water-4k.ktx2  4096 2048 linear &
enc fair_clouds_4k.png      clouds-4k.ktx2 4096 2048 srgb &
wait
