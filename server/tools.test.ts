import { describe, expect, it } from 'vitest';
import { CATALOGUE, findCharacter } from '../src/data/catalogue.ts';
import { createCareer } from '../src/rpg/actions.ts';
import { handleToolCall } from './tools.ts';

const state = createCareer(CATALOGUE, 'mx5-na-1994', 1);
const call = (who: string, name: string, args: object, s = state) =>
  handleToolCall(findCharacter(CATALOGUE, who)!, name, JSON.stringify(args), s, CATALOGUE);

describe('server action validator', () => {
  it('accepts a discount within the floor and updates the working state', () => {
    const o = call('dee-dee-varga', 'offer_discount', {
      part_id: 'blox-ss2-bxss-02905',
      price_usd: 650,
    });
    expect(o.output.accepted).toBe(true);
    expect(o.state.offers.discounts['blox-ss2-bxss-02905']?.priceUsd).toBe(650);
    expect(o.events[0]?.type).toBe('applied');
  });

  it('rejects a discount below the floor (US-004 AC4)', () => {
    const o = call('dee-dee-varga', 'offer_discount', {
      part_id: 'blox-ss2-bxss-02905',
      price_usd: 100,
    });
    expect(o.output.accepted).toBe(false);
    expect(o.events[0]).toMatchObject({ type: 'rejected' });
  });

  it('rejects parts that are not in the catalogue (US-004 AC4)', () => {
    expect(call('dee-dee-varga', 'sell_part', { part_id: 'turbo-kit-9000' }).output.accepted).toBe(
      false,
    );
  });

  it('rejects a sale the player cannot afford (US-004 AC4)', () => {
    const broke = { ...state, money: 10 };
    expect(
      call('dee-dee-varga', 'sell_part', { part_id: 'blox-ss2-bxss-02905' }, broke).output.accepted,
    ).toBe(false);
  });

  it('turns a sale into a proposal at the current price, without spending money', () => {
    const o = call('dee-dee-varga', 'sell_part', { part_id: 'hawk-hps-hb149f-505' });
    expect(o.events[0]).toMatchObject({
      type: 'proposal',
      action: { type: 'buyPart', partId: 'hawk-hps-hb149f-505', priceUsd: 138.59 },
    });
    expect(o.state.money).toBe(state.money);
  });

  it('rejects sponsorship payouts outside the sponsor range (US-006 AC3)', () => {
    expect(
      call('sterling-pruitt', 'offer_sponsorship', {
        objective: 'top3',
        top_speed_kmh: null,
        payout_usd: 50_000,
      }).output.accepted,
    ).toBe(false);
    expect(
      call('sterling-pruitt', 'offer_sponsorship', {
        objective: 'top3',
        top_speed_kmh: null,
        payout_usd: 600,
      }).output.accepted,
    ).toBe(true);
  });

  it('refuses tools a character is not allowed to use', () => {
    expect(
      call('mags-okafor', 'offer_discount', { part_id: 'blox-ss2-bxss-02905', price_usd: 650 })
        .output.accepted,
    ).toBe(false);
    expect(
      call('teo-baptista', 'offer_sponsorship', {
        objective: 'win',
        top_speed_kmh: null,
        payout_usd: 900,
      }).output.accepted,
    ).toBe(false);
  });

  it('survives malformed arguments', () => {
    const o = handleToolCall(
      findCharacter(CATALOGUE, 'dee-dee-varga')!,
      'sell_part',
      '{nope',
      state,
      CATALOGUE,
    );
    expect(o.output.accepted).toBe(false);
  });
});
