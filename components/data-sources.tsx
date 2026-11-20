'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Where everything on screen comes from. The imagery credit stays visible;
// the full list opens from "Data sources".

const SOURCES: { what: string; who: string; href: string; note?: string }[] = [
  { what: 'Nano nodes', who: 'nano.community', href: 'https://nano.community', note: 'places are approximate, from each node’s IP address' },
  {
    what: 'Earth from high up',
    who: 'NASA Blue Marble, served by NASA GIBS',
    href: 'https://visibleearth.nasa.gov/collection/1484/blue-marble',
    note: 'one picture of the whole planet with shaded relief and sea floor; public domain'
  },
  {
    what: 'Earth close up',
    who: 'Sentinel-2 cloudless 2016 by EOX',
    href: 'https://s2maps.eu',
    note: 'below about 900 km; CC BY 4.0, contains modified Copernicus Sentinel data 2016'
  },
  { what: 'Terrain', who: 'Terrain Tiles on AWS', href: 'https://registry.opendata.aws/terrain-tiles/' },
  {
    what: 'Clouds',
    who: 'NASA GIBS, VIIRS on NOAA-21',
    href: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',
    note: 'the newest complete day, so about a day old'
  },
  {
    what: 'City lights',
    who: 'GeoNames',
    href: 'https://www.geonames.org',
    note: 'CC BY 4.0; 31,810 real cities and their sizes, the individual lights are generated'
  },
  {
    what: 'Aurora',
    who: 'NOAA Space Weather Prediction Center',
    href: 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast',
    note: 'where it is and how bright are real; the curtains are generated, moving with the live solar wind speed and coloured by how disturbed the magnetic field is'
  },
  { what: 'Stars', who: 'Yale Bright Star Catalogue', href: 'http://tdc-www.harvard.edu/catalogs/bsc5.html', note: '9,096 stars' },
  {
    what: 'Milky Way',
    who: 'NASA Scientific Visualization Studio, from ESA Gaia',
    href: 'https://svs.gsfc.nasa.gov/4851',
    note: 'shape and colour are real, the fine star grain is generated'
  },
  { what: 'Sun, Moon, planets', who: 'Astronomy Engine', href: 'https://github.com/cosinekitty/astronomy' },
  { what: 'Starlink orbits', who: 'CelesTrak', href: 'https://celestrak.org' },
  { what: 'Submarine cables', who: 'TeleGeography', href: 'https://www.submarinecablemap.com' }
];

export const DataSources: React.FC = () => (
  <div className="select-none whitespace-nowrap text-[10px] text-gray-500">
    <span className="hidden sm:inline">Imagery: NASA Blue Marble, Sentinel-2 cloudless by EOX · </span>
    <Popover>
      <PopoverTrigger className="underline decoration-dotted underline-offset-2 hover:text-gray-300">Data sources</PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border-white/10 bg-black/80 p-3 text-[11px] text-gray-300 shadow-2xl backdrop-blur-md"
      >
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">Everything here is real, public data</div>
        <ul className="flex flex-col gap-1.5">
          {SOURCES.map((s) => (
            <li key={s.what} className="leading-snug">
              <span className="text-gray-500">{s.what}: </span>
              <a className="text-gray-200 underline decoration-white/20 underline-offset-2 hover:text-[#4db8ff]" href={s.href} target="_blank" rel="noreferrer">
                {s.who}
              </a>
              {s.note && <span className="text-gray-500"> ({s.note})</span>}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  </div>
);
