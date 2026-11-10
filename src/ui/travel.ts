import { isUnlocked } from '../rpg/actions.ts';
import { UNLOCK_POSITION, prizeFor, usd } from '../rpg/economy.ts';
import { findTrack } from '../race/tracks.ts';
import { store } from '../save/store.ts';
import { clear, h, mount, toast } from './dom.ts';

/** The travel board: every location, what it costs to get there, what is locked. */
export function openTravel(onClose: () => void, onTravel: () => void): void {
  const close = () => {
    window.removeEventListener('keydown', onKey);
    clear('travel');
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const state = store.require();
  const cat = store.catalogue;
  const places = cat.locations.map((loc) => {
    const here = loc.id === state.location;
    const open = isUnlocked(cat, state, loc.id);
    const best = state.bestFinish[loc.id];
    const prev = cat.locations.find((l) => l.tier === loc.tier - 1);
    const go = h(
      'button',
      {
        class: 'primary',
        disabled: here || !open || state.money < loc.travelCostUsd,
        onclick: () => {
          const r = store.dispatch({ type: 'travel', locationId: loc.id });
          if (!r.ok) return toast(r.error.message);
          window.removeEventListener('keydown', onKey);
          clear('travel');
          toast(`Welcome to ${loc.name}`);
          onTravel();
        },
      },
      here
        ? 'You are here'
        : !open
          ? 'Locked'
          : state.money < loc.travelCostUsd
            ? 'Cannot afford'
            : `Travel (${usd(loc.travelCostUsd)})`,
    );
    return h(
      'div',
      {
        class: `place${here ? ' here' : ''}${open ? '' : ' locked'}`,
        role: 'group',
        'aria-label': loc.name,
        'data-location': loc.id,
      },
      h('h3', {}, `${loc.tier}. ${loc.name}`),
      h('div', { class: 'muted' }, findTrack(loc.trackId).name),
      h('div', {}, loc.blurb),
      h('div', {}, `Win pays ${usd(prizeFor(1, loc.prizeMult))}`),
      h(
        'div',
        { class: 'muted', 'data-testid': 'place-status' },
        best
          ? `Best finish: P${best}`
          : open
            ? 'Not raced yet'
            : `Locked: finish top ${UNLOCK_POSITION} at ${prev?.name ?? 'the previous location'}`,
      ),
      go,
    );
  });
  const leave = h('button', { onclick: close }, 'Stay here (Esc)');
  mount(
    'travel',
    h(
      'section',
      { class: 'travel panel interactive', role: 'dialog', 'aria-label': 'Travel board' },
      h('h2', {}, 'Where to?'),
      h('div', { class: 'places' }, places),
      h(
        'footer',
        {},
        h(
          'span',
          { class: 'muted' },
          `You have ${usd(state.money)}. A podium at one location opens the next.`,
        ),
        leave,
      ),
    ),
  );
  leave.focus();
}
