import { carName, findCar, findSponsor } from '../data/catalogue.ts';
import { usd } from '../rpg/economy.ts';
import { store } from '../save/store.ts';
import { h, mount } from './dom.ts';

/** Top bar shown in town and interiors: place, money, car, sponsor. */
export function mountTownHud(place: string): () => void {
  const money = h('span', { class: 'chip money', 'data-testid': 'money', 'aria-label': 'Money' });
  const car = h('span', { class: 'chip', 'data-testid': 'my-car', 'aria-label': 'Your car' });
  const sponsor = h('span', {
    class: 'chip',
    'data-testid': 'my-sponsor',
    'aria-label': 'Sponsor',
  });
  const render = () => {
    const s = store.get();
    if (!s) return;
    const c = findCar(store.catalogue, s.carId);
    money.textContent = usd(s.money);
    car.textContent = c ? carName(c) : s.carId;
    const sp = s.sponsor ? findSponsor(store.catalogue, s.sponsor.sponsorId) : null;
    sponsor.textContent = sp ? `${sp.name} (${s.sponsor!.racesLeft} races left)` : 'No sponsor';
  };
  render();
  mount(
    'hud',
    h(
      'div',
      { class: 'hud' },
      h('span', { class: 'chip', 'data-testid': 'place' }, place),
      h('span', { style: 'display:flex;gap:0.5em' }, car, sponsor, money),
    ),
    h(
      'div',
      {
        class: 'chip',
        style: 'position:absolute;bottom:0.6em;left:0.6em;font-size:0.75em;opacity:0.8',
      },
      '← → walk · E interact · Esc leave',
    ),
  );
  return store.subscribe(render);
}
