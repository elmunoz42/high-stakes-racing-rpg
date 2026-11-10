import type { Persona } from '../schema.ts';
import { DEE_DEE_VARGA } from './dee-dee-varga.ts';
import { LOCALS } from './locals.ts';
import { RACER_PERSONAS } from './racers.ts';
import { MAGS_OKAFOR } from './mags-okafor.ts';
import { STERLING_PRUITT } from './sterling-pruitt.ts';
import { TEO_BAPTISTA } from './teo-baptista.ts';

/** The travelling paddock plus one local per away location. All invented people. */
export const CHARACTERS: Persona[] = [
  MAGS_OKAFOR,
  TEO_BAPTISTA,
  DEE_DEE_VARGA,
  STERLING_PRUITT,
  ...LOCALS,
  ...RACER_PERSONAS,
];
