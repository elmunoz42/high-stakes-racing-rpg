import { z } from 'zod';
import { ObjectiveType, Slot } from '../data/schema.ts';

export const SAVE_VERSION = 3;

export const Objective = z.object({
  type: ObjectiveType,
  /** Threshold for topSpeed objectives, km/h. */
  value: z.number().optional(),
});
export type Objective = z.infer<typeof Objective>;

export const SponsorOffer = z.object({
  sponsorId: z.string(),
  characterId: z.string(),
  objective: Objective,
  payoutUsd: z.number().positive(),
  races: z.number().int().positive(),
});
export type SponsorOffer = z.infer<typeof SponsorOffer>;

export const SponsorDeal = SponsorOffer.extend({
  racesLeft: z.number().int().nonnegative(),
  earnedUsd: z.number().nonnegative(),
});
export type SponsorDeal = z.infer<typeof SponsorDeal>;

export const RaceEntryResult = z.object({
  name: z.string(),
  carName: z.string(),
  isPlayer: z.boolean(),
  position: z.number().int().positive(),
  timeMs: z.number().nonnegative(),
});

export const RaceResult = z.object({
  trackId: z.string(),
  laps: z.number().int().positive(),
  position: z.number().int().positive(),
  timeMs: z.number().nonnegative(),
  collisions: z.number().int().nonnegative(),
  ledALap: z.boolean(),
  topSpeedKmh: z.number().nonnegative(),
  order: z.array(RaceEntryResult),
  /** Nitrous shots fired during the race. */
  nitrousUsed: z.number().int().nonnegative().optional(),
});

export const RaceRecord = RaceResult.extend({
  prizeUsd: z.number().nonnegative(),
  sponsorPayoutUsd: z.number().nonnegative(),
  objectiveMet: z.boolean().nullable(),
  sponsorId: z.string().nullable().default(null),
  balanceAfter: z.number(),
  /** Location this race opened up, if it was the first podium at the one before. */
  unlocked: z.string().optional(),
});
export type RaceRecord = z.infer<typeof RaceRecord>;

export const DiscountOffer = z.object({
  characterId: z.string(),
  priceUsd: z.number().positive(),
});

export const GameState = z.object({
  version: z.literal(SAVE_VERSION),
  seed: z.number().int(),
  money: z.number(),
  carId: z.string(),
  inventory: z.array(z.string()),
  installed: z.partialRecord(Slot, z.string()),
  sponsor: SponsorDeal.nullable(),
  offers: z.object({
    discounts: z.record(z.string(), DiscountOffer),
    sponsor: SponsorOffer.nullable(),
  }),
  relationships: z.record(z.string(), z.number()),
  memories: z.record(z.string(), z.string()),
  lastRace: RaceRecord.nullable(),
  raceCount: z.number().int().nonnegative(),
  location: z.string(),
  /** Nitrous shots carried, 0 to 3. */
  nitrous: z.number().int().min(0).max(3),
  /** Best finishing position at each location raced so far. */
  bestFinish: z.record(z.string(), z.number().int().positive()),
  /** Night duel record against each racer. */
  duels: z.record(
    z.string(),
    z.object({ wins: z.number().int().nonnegative(), losses: z.number().int().nonnegative() }),
  ),
});
export type GameState = z.infer<typeof GameState>;
