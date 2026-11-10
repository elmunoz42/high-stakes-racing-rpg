import Phaser from 'phaser';
import { RIVALS } from '../../data/rivals.ts';
import { findSponsor } from '../../data/catalogue.ts';
import { usd } from '../../rpg/economy.ts';
import { store } from '../../save/store.ts';
import { h, mount } from '../../ui/dom.ts';
import { goto } from '../flow.ts';
import { formatTime } from '../../ui/format.ts';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(): void {
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
          `Harbour Loop, ${r.laps} laps. Your time ${formatTime(r.timeMs)}. Top speed ${r.topSpeedKmh} km/h.`,
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
}

function pickBanter(position: number, names: string[]): string | null {
  const rivalAhead = RIVALS.find((rv) => names.indexOf(rv.name) === 0);
  const kenji = RIVALS[0]!;
  if (position === 1) return kenji.banter.lostToYou;
  if (rivalAhead) return rivalAhead.banter.beatYou;
  return null;
}
