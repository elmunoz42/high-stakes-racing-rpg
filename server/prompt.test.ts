import { describe, expect, it } from 'vitest';
import { CATALOGUE, findCharacter } from '../src/data/catalogue.ts';
import { createCareer } from '../src/rpg/actions.ts';
import { buildContext, buildInstructions, toolsFor } from './prompt.ts';

const state = createCareer(CATALOGUE, 'mx5-na-1994', 1);
const persona = (id: string) => findCharacter(CATALOGUE, id)!;

describe('prompt builder (US-003 AC5)', () => {
  it('puts world rules and the persona card in the stable instructions', () => {
    const p = persona('mags-okafor');
    const text = buildInstructions(p, CATALOGUE);
    expect(text).toContain('Stay in character');
    expect(text).toContain('Never invent a part');
    expect(text).toContain('Mags Okafor');
    for (const v of p.voice) expect(text).toContain(v);
    expect(text).not.toContain('$'); // no per-request numbers in the cacheable prefix
  });

  it('puts the game snapshot in the per-request context', () => {
    const text = buildContext(persona('mags-okafor'), state, CATALOGUE);
    expect(text).toContain('1994 Mazda MX-5 Miata');
    expect(text).toContain('$7,540');
    expect(text).toContain('Last race: none yet');
  });

  it('gives each character only the actions it may propose', () => {
    const names = (id: string) =>
      toolsFor(persona(id))
        .map((t) => t.name)
        .sort();
    expect(names('mags-okafor')).toEqual(['adjust_relationship', 'give_tip']);
    expect(names('teo-baptista')).toEqual(['adjust_relationship', 'give_tip', 'install_part']);
    expect(names('dee-dee-varga')).toEqual([
      'adjust_relationship',
      'offer_discount',
      'quote_part',
      'sell_part',
    ]);
    expect(names('sterling-pruitt')).toEqual(['adjust_relationship', 'offer_sponsorship']);
  });

  it('shows the parts seller only parts that fit, with real prices and her floor', () => {
    const text = buildContext(persona('dee-dee-varga'), state, CATALOGUE);
    expect(text).toContain('HB149F.505');
    expect(text).toContain('$138.59');
    expect(text).not.toContain('HB235F.665'); // a 240SX part
  });

  it('reveals secrets only once the relationship is high enough', () => {
    const p = persona('teo-baptista');
    expect(buildContext(p, state, CATALOGUE)).not.toContain('10mm socket');
    const friend = { ...state, relationships: { ...state.relationships, 'teo-baptista': 3 } };
    expect(buildContext(p, friend, CATALOGUE)).toContain('10mm socket');
  });

  it('keeps tool parameter schemas strict-mode compatible', () => {
    for (const p of CATALOGUE.characters)
      for (const t of toolsFor(p)) {
        const params = t.parameters as {
          properties: Record<string, unknown>;
          required: string[];
          additionalProperties: boolean;
        };
        expect(params.additionalProperties).toBe(false);
        expect(params.required.sort()).toEqual(Object.keys(params.properties).sort());
      }
  });
});
