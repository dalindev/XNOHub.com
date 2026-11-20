#!/usr/bin/env python3
"""Builds the three small pictures the site ships. Needs Pillow.

  python3 scripts/build-small-maps.py                  # all three (downloads ~0.9 MB)
  python3 scripts/build-small-maps.py earth            # just one: earth, milkyway or clouds
  python3 scripts/build-small-maps.py milkyway file.jpg  # the Milky Way from a file already downloaded

1. public/earth/base-2k.jpg: the whole Earth in one small picture, put together
   from the same imagery as the 3D Earth's tiles seen from high up (NASA's Blue
   Marble with shaded relief and sea floor, public domain; 64 tiles, about
   0.8 MB to download). The 3D Earth's tiles arrive over the network; this
   picture sits just under them, so the planet is whole from the first frame,
   behind any tile still loading, and when the tile server can't be reached.

2. public/sky/milkyway-1k.jpg: the Milky Way, from NASA's Deep Star Maps 2020
   (https://svs.gsfc.nasa.gov/4851, the 1024x512 "print" preview, 71 KB). The
   preview's sky background is dark grey with JPEG noise, which shows as
   blotches once it is stretched over the sky, so it is smoothed a little and
   its black level is removed here.

3. public/earth/clouds-fill-1k.jpg: a small copy of the bundled cloud picture.
   NASA's daily cloud photo has no data where the Sun was low that day (the
   far north in winter, the far south in summer); the cloud layer fades to
   these typical clouds there.
"""
import io
import math
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
AGENT = {"User-Agent": "map-build/1.0"}

# NASA GIBS, Blue Marble as web-map tiles: level 3 is 8 x 8 tiles of 256 px, in Mercator.
BLUE_MARBLE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg"
EARTH_LEVEL = 3
EARTH_SIZE = (2048, 1024)

MILKYWAY_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k_print.jpg"
BLACK = 24  # the preview's sky background, out of 255
BLUR = 1.3  # pixels; one pixel is about a third of a degree
PAD = 16


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=60).read()


def report(out):
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1024:.0f} KB")


def earth():
    n = 1 << EARTH_LEVEL
    mercator = Image.new("RGB", (n * 256, n * 256))
    for y in range(n):
        for x in range(n):
            tile = Image.open(io.BytesIO(fetch(BLUE_MARBLE.format(z=EARTH_LEVEL, y=y, x=x)))).convert("RGB")
            mercator.paste(tile, (x * 256, y * 256))
    # Web-map tiles are in Mercator, which stretches toward the poles and stops at 85.05 degrees.
    # The sphere wants one row per equal step of latitude: take each row from where Mercator has it.
    # Past 84.6 degrees the last good row is carried on to the pole, smoothed more and more along
    # the row so it ends in one even colour (sea ice in the north, the ice sheet in the south).
    w, h = EARTH_SIZE
    limit = 84.6
    src = mercator.resize((w, mercator.height), Image.LANCZOS)
    out_im = Image.new("RGB", (w, h))
    for j in range(h):
        true_lat = 90 - (j + 0.5) * 180 / h
        lat = math.radians(max(-limit, min(limit, true_lat)))
        y = (1 - math.log(math.tan(math.pi / 4 + lat / 2)) / math.pi) / 2 * src.height - 0.5
        y0 = max(0, min(src.height - 2, int(math.floor(y))))
        row = Image.blend(src.crop((0, y0, w, y0 + 1)), src.crop((0, y0 + 1, w, y0 + 2)), max(0.0, min(1.0, y - y0)))
        beyond = (abs(true_lat) - limit) / (90 - limit)
        if beyond > 0:
            cells = max(1, round(w * (1 - beyond) ** 3 / 16))
            row = row.resize((cells, 1), Image.BOX).resize((w, 1), Image.BICUBIC if cells > 3 else Image.BOX)
            # ...and faded into the row's average, reached halfway to the pole, so no streak runs up to it.
            t = min(1.0, beyond * 2)
            row = Image.blend(row, row.resize((1, 1), Image.BOX).resize((w, 1), Image.BOX), t * t * (3 - 2 * t))
        out_im.paste(row, (0, j))
    out = ROOT / "public/earth/base-2k.jpg"
    out_im.save(out, quality=82, optimize=True, progressive=True)
    report(out)


def milkyway(source=None):
    data = Path(source).read_bytes() if source else fetch(MILKYWAY_URL)
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.size != (1024, 512):
        im = im.resize((1024, 512), Image.LANCZOS)
    w, h = im.size
    # Blur with the left and right edges joined, so the seam at RA 12h doesn't show.
    wide = Image.new("RGB", (w + 2 * PAD, h))
    wide.paste(im.crop((w - PAD, 0, w, h)), (0, 0))
    wide.paste(im, (PAD, 0))
    wide.paste(im.crop((0, 0, PAD, h)), (w + PAD, 0))
    im = wide.filter(ImageFilter.GaussianBlur(BLUR)).crop((PAD, 0, w + PAD, h))
    im = im.point(lambda v: max(0, v - BLACK) * 255 // (255 - BLACK))
    out = ROOT / "public/sky/milkyway-1k.jpg"
    im.save(out, quality=88, optimize=True)
    report(out)


def clouds():
    src = ROOT / "public/earth-assets-mini/fair_clouds_4k.png"
    # The cloud cover is the picture's transparency: white everywhere, opaque where cloudy.
    im = Image.open(src).convert("RGBA").getchannel("A").resize((1024, 512), Image.LANCZOS)
    out = ROOT / "public/earth/clouds-fill-1k.jpg"
    im.save(out, quality=55, optimize=True)
    report(out)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which not in ("all", "earth", "milkyway", "clouds"):
        sys.exit(__doc__)
    if which in ("all", "earth"):
        earth()
    if which in ("all", "milkyway"):
        milkyway(sys.argv[2] if len(sys.argv) > 2 else None)
    if which in ("all", "clouds"):
        clouds()
