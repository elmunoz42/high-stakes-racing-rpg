import type { Sponsor } from './schema.ts';

/** Sponsors are invented brands. */
export const SPONSORS: Sponsor[] = [
  {
    id: 'voltkat',
    name: 'VOLTKAT',
    tagline: 'Energy drink. Unlicensed enthusiasm. Grape-Lightning flavour.',
    minPayoutUsd: 300,
    maxPayoutUsd: 1_200,
    objectives: ['win', 'top3', 'clean', 'topSpeed'],
    races: 3,
  },
];
