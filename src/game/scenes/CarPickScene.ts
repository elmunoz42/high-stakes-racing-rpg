import Phaser from 'phaser';
import { carName } from '../../data/catalogue.ts';
import type { Car } from '../../data/schema.ts';
import { performance } from '../../rpg/carStats.ts';
import { baseStats, msToKmh } from '../../rpg/carStats.ts';
import { CAREER_FUND_USD, usd } from '../../rpg/economy.ts';
import { store } from '../../save/store.ts';
import { resetConversations } from '../../ui/dialogue.ts';
import { h, mount } from '../../ui/dom.ts';
import { goto } from '../flow.ts';

export class CarPickScene extends Phaser.Scene {
  constructor() {
    super('CarPick');
  }

  create(): void {
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(384, 216);
    const cars = store.catalogue.cars;
    let chosen: Car | null = null;
    const buy = h('button', { class: 'primary', disabled: true }, 'Choose a car');
    const cash = h(
      'span',
      { class: 'muted', 'data-testid': 'starting-money' },
      `Career fund ${usd(CAREER_FUND_USD)}. The car comes out of it; the rest is your cash.`,
    );
    const cards = cars.map((car) => {
      const perf = performance(baseStats(car));
      const card = h(
        'button',
        {
          class: 'car-card',
          'aria-pressed': 'false',
          'data-car-id': car.id,
          onclick: () => select(car, card),
        },
        h('h2', {}, carName(car)),
        h('div', { class: 'muted' }, `${car.generation} · ${car.trim} · ${car.drivetrain}`),
        h(
          'dl',
          {},
          h('dt', {}, 'Engine'),
          h('dd', {}, car.engine),
          h('dt', {}, 'Power'),
          h('dd', {}, `${car.power_hp} hp`),
          h('dt', {}, 'Torque'),
          h('dd', {}, `${car.torque_nm} Nm`),
          h('dt', {}, 'Weight'),
          h('dd', {}, `${car.weight_kg.toLocaleString('en-US')} kg`),
          h('dt', {}, 'Top speed'),
          h('dd', {}, `~${Math.round(msToKmh(perf.topSpeed))} km/h (game)`),
          h('dt', {}, 'Price'),
          h('dd', { class: 'money' }, usd(car.price_usd)),
          h('dt', {}, 'Cash left'),
          h('dd', {}, usd(CAREER_FUND_USD - car.price_usd)),
        ),
        h('p', { class: 'blurb' }, car.blurb),
        h('span', { class: 'src' }, `${car.price_note}. Checked ${car.checked_on}.`),
      );
      return card;
    });
    const select = (car: Car, card: HTMLElement) => {
      chosen = car;
      for (const c of cards) c.setAttribute('aria-pressed', String(c === card));
      buy.disabled = false;
      buy.textContent = `Buy the ${car.make} ${car.model} and start`;
      cash.textContent = `You will start with ${usd(CAREER_FUND_USD - car.price_usd)} cash.`;
    };
    buy.addEventListener('click', () => {
      if (!chosen) return;
      resetConversations();
      store.newCareer(chosen.id, (Math.random() * 1e9) | 0);
      goto('Town');
    });
    mount(
      'carpick',
      h(
        'section',
        {
          class: 'layer car-pick interactive',
          role: 'dialog',
          'aria-label': 'Choose your starter car',
        },
        h('h1', {}, 'Choose your starter car'),
        h('div', { class: 'car-list' }, cards),
        h('footer', {}, cash, buy),
      ),
    );
    cards[0]?.focus();
  }
}
