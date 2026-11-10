import { z } from 'zod';

/**
 * Catalogue schemas. Sourced fields (make, model, specs, prices, part numbers)
 * must be traceable to `source_url` and `checked_on`. Game-design fields live
 * under `game` (cars) or are derived from `tier` by rules in src/rpg/carStats.ts.
 * See agent-os/standards/data/real-world-catalogue.md.
 */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export const httpsUrl = z.string().regex(/^https:\/\/\S+$/, 'expected an https URL');
const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case');

export const SLOTS = ['tyres', 'suspension', 'brakes', 'intake', 'exhaust'] as const;
export const Slot = z.enum(SLOTS);
export type Slot = z.infer<typeof Slot>;

export const Tier = z.enum(['street', 'sport', 'track']);
export type Tier = z.infer<typeof Tier>;

export const Source = z.object({ what: z.string().min(1), url: httpsUrl });

export const CarSchema = z
  .object({
    id,
    make: z.string().min(1),
    model: z.string().min(1),
    generation: z.string().min(1),
    year: z.number().int().min(1950).max(2030),
    trim: z.string().min(1),
    drivetrain: z.enum(['FWD', 'RWD', 'AWD']),
    engine: z.string().min(1),
    power_hp: z.number().positive(),
    torque_nm: z.number().positive(),
    weight_kg: z.number().positive(),
    /** Typical used-market price for the game economy. */
    price_usd: z.number().positive(),
    price_basis: z.literal('used-market'),
    price_note: z.string().min(1),
    source_url: httpsUrl,
    /** Extra sources when one page does not cover every figure. */
    sources: z.array(Source).default([]),
    checked_on: isoDate,
    blurb: z.string().min(1),
    game: z.object({
      /** Sprite body colour, hex. */
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
      body: z.enum(['roadster', 'coupe', 'hatch']),
    }),
  })
  .strict();
export type Car = z.infer<typeof CarSchema>;

export const PartSchema = z
  .object({
    id,
    brand: z.string().min(1),
    name: z.string().min(1),
    part_number: z.string().min(1),
    category: Slot,
    fits: z.array(id).min(1),
    /** Price for the quantity sold (for tyres, a set of four). */
    price_usd: z.number().positive(),
    unit_price_usd: z.number().positive(),
    quantity: z.number().int().positive(),
    price_basis: z.enum(['msrp', 'retailer']),
    retailer: z.string().min(1).optional(),
    source_url: httpsUrl,
    checked_on: isoDate,
    blurb: z.string().min(1),
    /** Game-design rating; effects are derived from it, not sourced. */
    tier: Tier,
  })
  .strict()
  .refine((p) => Math.abs(p.price_usd - p.unit_price_usd * p.quantity) < 0.01, {
    message: 'price_usd must equal unit_price_usd x quantity',
  })
  .refine((p) => p.price_basis !== 'retailer' || p.retailer, {
    message: 'retailer prices must name the retailer',
  });
export type Part = z.infer<typeof PartSchema>;

export const ObjectiveType = z.enum(['win', 'top3', 'clean', 'topSpeed']);
export type ObjectiveType = z.infer<typeof ObjectiveType>;

export const SponsorSchema = z.object({
  id,
  name: z.string(),
  tagline: z.string(),
  minPayoutUsd: z.number().positive(),
  maxPayoutUsd: z.number().positive(),
  objectives: z.array(ObjectiveType).min(1),
  races: z.number().int().positive(),
});
export type Sponsor = z.infer<typeof SponsorSchema>;

export const Role = z.enum(['coach', 'mechanic', 'parts', 'sponsor']);
export type Role = z.infer<typeof Role>;

export const ToolName = z.enum([
  'give_tip',
  'quote_part',
  'offer_discount',
  'sell_part',
  'install_part',
  'offer_sponsorship',
  'adjust_relationship',
]);
export type ToolName = z.infer<typeof ToolName>;

export const PersonaSchema = z.object({
  id,
  name: z.string(),
  role: Role,
  roleTitle: z.string(),
  age: z.number().int(),
  from: z.string(),
  pitch: z.string(),
  portraitColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  voice: z.array(z.string()).min(1),
  neverSays: z.array(z.string()),
  wants: z.array(z.string()).min(1),
  fears: z.array(z.string()),
  opinions: z.array(z.string()),
  secrets: z.array(z.object({ minRelationship: z.number(), text: z.string() })),
  runningJokes: z.array(z.string()),
  aboutOthers: z.record(z.string(), z.string()),
  leverage: z.array(z.string()),
  tools: z.array(ToolName),
  greeting: z.string(),
  suggestions: z.array(z.string()).min(2),
  fallbackLine: z.string(),
  sponsorId: z.string().optional(),
  /** Lowest price as a fraction of list this character will agree to (parts sellers). */
  discountFloor: z.number().min(0).max(1).optional(),
});
export type Persona = z.infer<typeof PersonaSchema>;
