import { z } from 'zod';
import { Objective, RaceResult } from '../src/save/schema.ts';

/**
 * Every change to the career goes through one of these actions.
 * Dialogue tool calls are translated into actions and validated by the same
 * rules on the server (dry run) and on the client (before the save changes).
 */
export const GameAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('buyPart'), partId: z.string(), priceUsd: z.number().positive() }),
  z.object({ type: z.literal('installPart'), partId: z.string() }),
  z.object({
    type: z.literal('offerDiscount'),
    characterId: z.string(),
    partId: z.string(),
    priceUsd: z.number().positive(),
  }),
  z.object({
    type: z.literal('offerSponsorship'),
    characterId: z.string(),
    objective: Objective,
    payoutUsd: z.number().positive(),
  }),
  z.object({ type: z.literal('acceptSponsorship') }),
  z.object({ type: z.literal('declineSponsorship') }),
  z.object({
    type: z.literal('adjustRelationship'),
    characterId: z.string(),
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal('setMemory'),
    characterId: z.string(),
    summary: z.string().max(1200),
  }),
  z.object({ type: z.literal('recordRace'), result: RaceResult }),
]);
export type GameAction = z.infer<typeof GameAction>;

export type ActionErrorCode =
  | 'unknown_part'
  | 'does_not_fit'
  | 'already_owned'
  | 'not_owned'
  | 'insufficient_funds'
  | 'price_mismatch'
  | 'below_floor'
  | 'not_allowed'
  | 'unknown_character'
  | 'payout_out_of_range'
  | 'objective_not_offered'
  | 'no_offer'
  | 'already_sponsored'
  | 'invalid';

export interface ActionError {
  code: ActionErrorCode;
  message: string;
}
