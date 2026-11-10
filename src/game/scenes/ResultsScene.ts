import Phaser from 'phaser';
import { findRacer, RIVALS } from '../../data/rivals.ts';
import { findSponsor } from '../../data/catalogue.ts';
import { findTrack } from '../../race/tracks.ts';
import { usd } from '../../rpg/economy.ts';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { goto } from '../flow.ts';
import { formatTime } from '../../ui/format.ts';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(
    data: {
      duel?: { rivalId: string; wagerUsd: number; won: boolean; timeMs: number; trackName: string };
    } = {},
  ): void {
    if (data.duel) {
      this.duelResult(data.duel);
      return;
    }
    this.add.image(0, 0, 'bg-sky').setOrigin(0, 0).setDisplaySize(384, 216).setAlpha(0.6);
    const state = store.require();
    const r = state.lastRace;
    if (!r) {
      goto('Town');
      return;
    }
    const lastSponsorDeal = r.objectiveMet !== null;
    const sponsorName =
      lastSponsorDeal && state.sponsor
        ? findSponsor(store.catalogue, state.sponsor.sponsorId)?.name
        : 'VOLTKAT';
    const banter = pickBanter(
      r.position,
      r.order.map((o) => o.name),
    );
    const back = h(
      'button',
      { class: 'primary', onclick: () => goto('Town', { from: 'race' }) },
      'Back to town',
    );

    mount(
      'results',
      h(
        'section',
        { class: 'results panel interactive', role: 'dialog', 'aria-label': 'Race results' },
        h('h1', {}, r.position === 1 ? 'You won!' : `You finished P${r.position}`),
        h(
          'p',
          { class: 'muted' },
          `${findTrack(r.trackId).name}, ${r.laps} laps. Your time ${formatTime(r.timeMs)}. Top speed ${r.topSpeedKmh} km/h.`,
        ),
        h(
          'table',
          { 'aria-label': 'Finishing order' },
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              h('th', {}, 'Pos'),
              h('th', {}, 'Driver'),
              h('th', {}, 'Car'),
              h('th', {}, 'Time'),
            ),
          ),
          h(
            'tbody',
            {},
            r.order.map((o) =>
              h(
                'tr',
                { class: o.isPlayer ? 'me' : '' },
                h('td', {}, o.position),
                h('td', {}, o.name),
                h('td', {}, o.carName),
                h('td', {}, formatTime(o.timeMs)),
              ),
            ),
          ),
        ),
        h(
          'div',
          { class: 'earnings', 'aria-label': 'Earnings' },
          h('span', {}, `Prize money (P${r.position})`),
          h('span', { class: 'money', 'data-testid': 'prize' }, usd(r.prizeUsd)),
          lastSponsorDeal && [
            h('span', {}, `${sponsorName ?? 'Sponsor'} payout`),
            h(
              'span',
              { class: r.objectiveMet ? 'money' : 'muted', 'data-testid': 'sponsor-payout' },
              r.objectiveMet ? usd(r.sponsorPayoutUsd) : 'Objective missed: $0',
            ),
          ],
          h('strong', {}, 'New balance'),
          h('strong', { class: 'money', 'data-testid': 'balance' }, usd(r.balanceAfter)),
        ),
        banter && h('p', { class: 'muted' }, banter),
        h('footer', {}, back),
      ),
    );
    back.focus();
  }

  private duelResult(d: {
    rivalId: string;
    wagerUsd: number;
    won: boolean;
    timeMs: number;
    trackName: string;
  }): void {
    this.add.image(0, 0, 'bg-sky').setOrigin(0, 0).setDisplaySize(384, 216).setAlpha(0.25);
    const state = store.require();
    const racer = findRacer(d.rivalId);
    const rec = state.duels[d.rivalId] ?? { wins: 0, losses: 0 };
    const back = h(
      'button',
      { class: 'primary', onclick: () => goto('Interior', { buildingId: 'bar' }) },
      'Back to the bar',
    );
    mount(
      'results',
      h(
        'section',
        {
          class: 'results duel-result panel interactive',
          role: 'dialog',
          'aria-label': 'Duel result',
        },
        h(
          'h1',
          {},
          d.won ? `You beat ${racer?.name ?? 'them'}!` : `${racer?.name ?? 'They'} beat you`,
        ),
        h(
          'p',
          { class: 'muted' },
          `Night duel, ${d.trackName}, two laps. Your time ${formatTime(d.timeMs)}.`,
        ),
        h(
          'div',
          { class: 'earnings', 'aria-label': 'Wager' },
          h('span', {}, d.won ? 'You win the wager' : 'You lose the wager'),
          h(
            'span',
            {
              class: d.won ? 'money' : '',
              'data-testid': 'duel-money',
              style: d.won ? '' : 'color:var(--bad)',
            },
            `${d.won ? '+' : '-'}${usd(d.wagerUsd)}`,
          ),
          h('strong', {}, 'New balance'),
          h('strong', { class: 'money', 'data-testid': 'balance' }, usd(state.money)),
          h('span', {}, `Record against ${racer?.short ?? 'them'}`),
          h('span', { 'data-testid': 'duel-record' }, `${rec.wins} won, ${rec.losses} lost`),
        ),
        racer && h('p', { class: 'muted' }, d.won ? racer.banter.lostToYou : racer.banter.beatYou),
        h('footer', {}, back),
      ),
    );
    back.focus();
  }
}

function pickBanter(position: number, names: string[]): string | null {
  const rivalAhead = RIVALS.find((rv) => names.indexOf(rv.name) === 0);
  const kenji = RIVALS[0]!;
  if (position === 1) return kenji.banter.lostToYou;
  if (rivalAhead) return rivalAhead.banter.beatYou;
  return null;
}
