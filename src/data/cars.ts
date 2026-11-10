import type { Car } from './schema.ts';

/**
 * Starter cars. Every figure was looked up on `checked_on` from the listed
 * sources. Prices are CLASSIC.COM Market Benchmark (CMB) values: a typical
 * used-market price, not a quote for any specific car.
 */
export const CARS: Car[] = [
  {
    id: 'mx5-na-1994',
    make: 'Mazda',
    model: 'MX-5 Miata',
    generation: 'NA',
    year: 1994,
    trim: 'Base',
    drivetrain: 'RWD',
    engine: '1.8 L BP-ZE inline-4',
    power_hp: 129,
    torque_nm: 149,
    weight_kg: 990,
    price_usd: 10_960,
    price_basis: 'used-market',
    price_note: 'CLASSIC.COM Market Benchmark for the 1994 MX-5 Miata base model',
    source_url: 'https://en.wikipedia.org/wiki/Mazda_MX-5_(NA)',
    sources: [
      {
        what: 'price',
        url: 'https://www.classic.com/m/mazda/mx-5-miata/na-1st-gen/base-model/year-1994/',
      },
    ],
    checked_on: '2026-11-09',
    blurb:
      'Light, honest, rear-drive. Not much power, so you carry speed through corners or you go nowhere. Leaves the most money in the bank.',
    game: { color: '#d4202c', body: 'roadster' },
  },
  {
    id: 'gti-mk2-1991',
    make: 'Volkswagen',
    model: 'GTI 16V',
    generation: 'Mk2',
    year: 1991,
    trim: '16V',
    drivetrain: 'FWD',
    engine: '2.0 L 9A 16-valve inline-4',
    power_hp: 134,
    torque_nm: 180,
    weight_kg: 1_109,
    price_usd: 15_936,
    price_basis: 'used-market',
    price_note: 'CLASSIC.COM Market Benchmark for the 1991 Golf GTI (Mk2)',
    source_url: 'https://en.wikipedia.org/wiki/Volkswagen_Golf_Mk2',
    sources: [
      {
        what: 'curb weight (16V 2dr hatchback)',
        url: 'https://www.iseecars.com/car/1991-volkswagen-gti-specs',
      },
      { what: 'price', url: 'https://www.classic.com/m/volkswagen/golf/mk2/golf-gti/year-1991/' },
      {
        what: 'stock tyre size 195/50R15',
        url: 'https://tiresize.com/tires/Volkswagen/GTI/1991/16V/',
      },
    ],
    checked_on: '2026-11-09',
    blurb:
      'The original hot hatch recipe: a torquey sixteen-valve four pulling the front wheels. Forgiving, quick out of slow corners.',
    game: { color: '#e8e4d8', body: 'hatch' },
  },
  {
    id: '240sx-s13-1991',
    make: 'Nissan',
    model: '240SX',
    generation: 'S13',
    year: 1991,
    trim: 'SE',
    drivetrain: 'RWD',
    engine: '2.4 L KA24DE inline-4',
    power_hp: 155,
    torque_nm: 217,
    weight_kg: 1_224,
    price_usd: 15_721,
    price_basis: 'used-market',
    price_note: 'CLASSIC.COM Market Benchmark for the 1991 240SX (S13)',
    source_url: 'https://en.wikipedia.org/wiki/Nissan_240SX',
    sources: [
      { what: 'price', url: 'https://www.classic.com/m/nissan/silvia/s13/240sx/year-1991/' },
      {
        what: 'stock tyre size 205/60R15',
        url: 'https://www.sizemytires.com/vehicle/1991/nissan/240sx',
      },
    ],
    checked_on: '2026-11-09',
    blurb:
      'The most power of the three and rear-drive to go with it. Heavier, and it will eat most of your budget before you buy a single part.',
    game: { color: '#2f6fd6', body: 'coupe' },
  },
];
