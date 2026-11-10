import {
  ARRIVAL_MESSAGE,
  MAX_HISTORY_TURNS,
  type ChatEvent,
  type Turn,
} from '../../shared/dialogue.ts';
import type { GameAction } from '../../shared/actions.ts';
import {
  carName,
  findCar,
  findCharacter,
  findPart,
  findSponsor,
  partName,
  partsFor,
} from '../data/catalogue.ts';
import type { Part, Persona } from '../data/schema.ts';
import { streamChat, summariseConversation } from '../dialogue/client.ts';
import { registerHook } from '../game/testHooks.ts';
import { formatTime } from './format.ts';
import { currentPrice, installedParts, labourQuote, owns, tradeInValue } from '../rpg/actions.ts';
import { findLocation } from '../data/locations.ts';
import { type CarStats, carStats, msToKmh, performance } from '../rpg/carStats.ts';
import { describeObjective, NITROUS_MAX_SHOTS, NITROUS_SHOT_USD, usd } from '../rpg/economy.ts';
import { store } from '../save/store.ts';
import { clear, h, mount, toast } from './dom.ts';
import { portraitUrl } from './portrait.ts';

/**
 * The dialogue overlay: portrait, streamed replies, free text and suggested
 * lines, with the character's shop, garage, deal or notes panel beside it.
 * Every action from the model is re-validated by the store before it applies.
 */

/** Conversation history per character for this session. */
const sessions = new Map<string, Turn[]>();

interface Pending {
  action: GameAction;
  label: string;
}

class DialogueView {
  private log!: HTMLElement;
  private input!: HTMLInputElement;
  private send!: HTMLButtonElement;
  private side!: HTMLElement;
  private rapport!: HTMLElement;
  private streaming = false;
  private pending: Pending | null = null;
  private tips: { topic: string; tip: string }[] = [];
  private highlight: string | null = null;
  private lastInstall: { part: string; before: CarStats; after: CarStats } | null = null;
  private unsub: () => void = () => {};
  private abort = new AbortController();
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  };

  constructor(
    private persona: Persona,
    private onClose: () => void,
  ) {}

  get history(): Turn[] {
    let h = sessions.get(this.persona.id);
    if (!h) sessions.set(this.persona.id, (h = []));
    return h;
  }

  open(): void {
    const p = this.persona;
    this.input = h('input', {
      type: 'text',
      'aria-label': `Say something to ${p.name}`,
      placeholder: `Say something to ${p.name}...`,
      maxlength: 600,
      autocomplete: 'off',
    });
    this.send = h('button', { class: 'primary', type: 'submit' }, 'Send');
    const form = h('form', { class: 'composer' }, this.input, this.send);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.say(this.input.value);
    });
    this.log = h('div', {
      class: 'log',
      role: 'log',
      'aria-label': 'Conversation',
      'aria-live': 'polite',
    });
    this.rapport = h('span', { class: 'role', 'data-testid': 'rapport' });
    const suggestions = h(
      'div',
      { class: 'suggestions', 'aria-label': 'Suggested lines' },
      p.suggestions.map((s) => h('button', { type: 'button', onclick: () => void this.say(s) }, s)),
    );
    this.side = h('aside', { class: 'side panel', 'aria-label': sideLabel(p) });
    mount(
      'dialogue',
      h(
        'section',
        {
          class: 'dialogue interactive',
          role: 'dialog',
          'aria-label': `Talking to ${p.name}`,
          'data-character': p.id,
        },
        h(
          'div',
          { class: 'talk panel' },
          h(
            'header',
            {},
            h('img', {
              class: 'portrait',
              alt: `Portrait of ${p.name}`,
              src: portraitUrl(p.id, p.look, p.role, p.portraitColor),
            }),
            h(
              'div',
              {},
              h('h2', {}, p.name),
              h('div', { class: 'role' }, p.roleTitle),
              this.rapport,
            ),
            h(
              'button',
              {
                class: 'close',
                type: 'button',
                onclick: () => this.close(),
                'aria-label': 'Close conversation',
              },
              'Leave (Esc)',
            ),
          ),
          this.log,
          suggestions,
          form,
        ),
        this.side,
      ),
    );
    for (const t of this.history.filter((t) => t.text !== ARRIVAL_MESSAGE))
      this.addMessage(t.role, t.text);
    this.unsub = store.subscribe(() => this.renderSide());
    this.renderSide();
    window.addEventListener('keydown', this.onKey);
    registerHook('dialogue', {
      snapshot: () => ({
        open: true,
        characterId: p.id,
        streaming: this.streaming,
        messages: [...this.log.querySelectorAll('.msg')].map((m) => ({
          who: (m as HTMLElement).dataset.who,
          text: m.textContent,
        })),
        pending: this.pending,
      }),
      say: (text: string) => this.say(text),
      close: () => this.close(),
    });
    this.input.focus();
    void this.say(ARRIVAL_MESSAGE, { hidden: true });
  }

  close(): void {
    this.abort.abort();
    window.removeEventListener('keydown', this.onKey);
    this.unsub();
    clear('dialogue');
    registerHook('dialogue', { snapshot: () => ({ open: false }) });
    void this.remember();
    this.onClose();
  }

  /** Compress what was said into the character's memory of the player. */
  private async remember(): Promise<void> {
    const real = this.history.filter((t) => t.text !== ARRIVAL_MESSAGE);
    if (!real.some((t) => t.role === 'player')) return;
    const state = store.get();
    if (!state) return;
    const summary = await summariseConversation(
      this.persona.id,
      real.slice(-MAX_HISTORY_TURNS * 2),
      state,
    );
    if (summary && store.get())
      store.dispatch({ type: 'setMemory', characterId: this.persona.id, summary });
  }

  private addMessage(who: 'player' | 'npc' | 'system', text: string): HTMLElement {
    const el = h('div', { class: `msg ${who}`, 'data-who': who }, text);
    this.log.append(el);
    this.log.scrollTop = this.log.scrollHeight;
    return el;
  }

  private async say(raw: string, opts: { hidden?: boolean } = {}): Promise<void> {
    const text = raw.trim().slice(0, 600);
    if (!text || this.streaming) return;
    const state = store.get();
    if (!state) return;
    this.streaming = true;
    this.send.disabled = true;
    this.input.value = '';
    if (!opts.hidden) this.addMessage('player', text);
    const npcEl = this.addMessage('npc', '…');
    npcEl.classList.add('typing');
    let reply = '';
    let failed = false;
    const history = this.history.slice(-MAX_HISTORY_TURNS * 2);
    try {
      await streamChat(
        { characterId: this.persona.id, message: text, history, state },
        (e) => {
          if (e.type === 'error') {
            failed = true;
            reply = opts.hidden ? this.persona.greeting : e.fallback;
            return;
          }
          if (e.type === 'text') {
            reply += e.delta;
            npcEl.textContent = reply;
            this.log.scrollTop = this.log.scrollHeight;
          } else this.handle(e);
        },
        this.abort.signal,
      );
    } catch (err) {
      if (this.abort.signal.aborted) return;
      console.warn('[dialogue]', err);
      failed = true;
      reply = opts.hidden ? this.persona.greeting : this.persona.fallbackLine;
    }
    npcEl.classList.remove('typing');
    npcEl.textContent = reply.trim() || this.persona.fallbackLine;
    if (!failed || opts.hidden) {
      this.history.push({ role: 'player', text }, { role: 'npc', text: npcEl.textContent });
    }
    this.streaming = false;
    this.send.disabled = false;
    this.input.focus();
  }

  private handle(e: ChatEvent): void {
    switch (e.type) {
      case 'proposal':
        // Validate now so we never show an offer the player cannot take.
        if (store.validate(e.action).ok) this.pending = { action: e.action, label: e.label };
        break;
      case 'applied': {
        const r = store.dispatch(e.action);
        if (!r.ok) console.warn('[dialogue] client rejected', e.action, r.error);
        else if (e.action.type === 'offerDiscount') this.highlight = e.action.partId;
        break;
      }
      case 'rejected':
        console.info('[dialogue] model action rejected:', e.tool, e.reason);
        break;
      case 'tip':
        this.tips.unshift({ topic: e.topic, tip: e.tip });
        this.addMessage('system', `Tip: ${e.topic}. ${e.tip}`);
        break;
      case 'quote':
        this.highlight = e.partId;
        break;
    }
    this.renderSide();
  }

  private confirm(p: Pending): void {
    const state = store.require();
    const car = findCar(store.catalogue, state.carId)!;
    const before = carStats(car, installedParts(store.catalogue, state));
    const r = store.dispatch(p.action);
    this.pending = null;
    if (!r.ok) {
      this.addMessage('system', `Could not do that: ${r.error.message}`);
      this.renderSide();
      return;
    }
    if (p.action.type === 'installPart') {
      const after = carStats(car, installedParts(store.catalogue, store.require()));
      this.lastInstall = { part: p.action.partId, before, after };
    }
    this.addMessage('system', `Done: ${p.label}.`);
    toast(p.label);
    this.renderSide();
  }

  private renderSide(): void {
    const state = store.get();
    if (!state || !this.side) return;
    const rel = state.relationships[this.persona.id] ?? 0;
    this.rapport.textContent = `Rapport: ${rapportLabel(rel)}`;
    const parts: (HTMLElement | null)[] = [];
    if (this.pending) {
      const p = this.pending;
      parts.push(
        h(
          'div',
          { class: 'panel confirm', role: 'alertdialog', 'aria-label': 'Confirm' },
          h('p', {}, `${p.label}?`),
          h(
            'div',
            { class: 'row' },
            h(
              'button',
              {
                type: 'button',
                onclick: () => {
                  this.pending = null;
                  this.renderSide();
                },
              },
              'Not now',
            ),
            h(
              'button',
              { type: 'button', class: 'primary', onclick: () => this.confirm(p) },
              'Confirm',
            ),
          ),
        ),
      );
    }
    switch (this.persona.role) {
      case 'parts':
        parts.push(this.shopPanel());
        break;
      case 'mechanic':
        parts.push(this.garagePanel());
        break;
      case 'sponsor':
        parts.push(this.sponsorPanel());
        break;
      case 'coach':
        parts.push(this.coachPanel());
        break;
      case 'dealer':
        parts.push(this.lotPanel());
        break;
      case 'local':
        parts.push(this.localPanel());
        break;
    }
    this.side.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    const hl = this.highlight && this.side.querySelector(`[data-part-id="${this.highlight}"]`);
    if (hl) (hl as HTMLElement).scrollIntoView({ block: 'nearest' });
  }

  private shopPanel(): HTMLElement {
    const state = store.require();
    const cat = store.catalogue;
    const car = findCar(cat, state.carId)!;
    const rows = partsFor(cat, state.carId).map((part) => {
      const price = currentPrice(state, part);
      const deal = price < part.price_usd;
      const owned = owns(state, part.id);
      const fitted = Object.values(state.installed).includes(part.id);
      const buy = h(
        'button',
        {
          type: 'button',
          class: 'primary',
          disabled: owned || state.money < price,
          onclick: () => {
            this.pending = {
              action: { type: 'buyPart', partId: part.id, priceUsd: price },
              label: `Buy ${partName(part)} for ${usd(price)}`,
            };
            this.renderSide();
          },
        },
        owned ? (fitted ? 'Fitted' : 'Owned') : state.money < price ? 'Too pricey' : 'Buy',
      );
      return h(
        'div',
        {
          class: `part${this.highlight === part.id ? ' highlight' : ''}`,
          'data-part-id': part.id,
          role: 'group',
          'aria-label': partName(part),
        },
        h('span', { class: 'name' }, partName(part)),
        h(
          'span',
          { class: 'price', 'data-testid': 'price' },
          deal
            ? [h('s', {}, usd(part.price_usd)), h('span', { class: 'deal' }, usd(price))]
            : usd(price),
        ),
        h(
          'span',
          { class: 'meta' },
          `Part no. ${part.part_number} · ${part.category} · ${part.quantity > 1 ? `${part.quantity} x ${usd(part.unit_price_usd)} · ` : ''}price checked ${part.checked_on} at ${part.retailer ?? 'MSRP'} · `,
          h('a', { href: part.source_url, target: '_blank', rel: 'noopener noreferrer' }, 'source'),
        ),
        h('span', { class: 'actions' }, buy),
      );
    });
    return h(
      'div',
      {},
      h('h3', {}, `Parts for your ${carName(car)}`),
      h(
        'p',
        { class: 'muted', style: 'margin:0 0 0.5em;font-size:0.8em' },
        `You have ${usd(state.money)}. Ask Dee Dee for a better price.`,
      ),
      h('div', { class: 'part-list', 'aria-label': 'Catalogue' }, rows),
      this.nitrousRow(),
    );
  }

  private garagePanel(): HTMLElement {
    const state = store.require();
    const cat = store.catalogue;
    const car = findCar(cat, state.carId)!;
    const waiting = state.inventory.map((id) => findPart(cat, id)).filter((p): p is Part => !!p);
    const items = waiting.map((part) => {
      const labour = labourQuote(cat, state, part);
      return h(
        'div',
        { class: 'part', 'data-part-id': part.id, role: 'group', 'aria-label': partName(part) },
        h('span', { class: 'name' }, partName(part)),
        h('span', { class: 'price' }, `labour ${usd(labour)}`),
        h(
          'span',
          { class: 'meta' },
          `${part.category}${state.installed[part.category] ? ` · replaces ${partName(findPart(cat, state.installed[part.category]!)!)}` : ''}`,
        ),
        h(
          'span',
          { class: 'actions' },
          h(
            'button',
            {
              type: 'button',
              class: 'primary',
              disabled: state.money < labour,
              onclick: () => {
                this.pending = {
                  action: { type: 'installPart', partId: part.id },
                  label: `Fit ${partName(part)} (labour ${usd(labour)})`,
                };
                this.renderSide();
              },
            },
            'Fit',
          ),
        ),
      );
    });
    const stats = carStats(car, installedParts(cat, state));
    return h(
      'div',
      {},
      h('h3', {}, 'Waiting to be fitted'),
      items.length
        ? h('div', { class: 'part-list' }, items)
        : h('p', { class: 'muted' }, 'Nothing yet. Buy parts at Varga Performance Parts.'),
      h('h3', { style: 'margin-top:0.8em' }, `Car sheet: ${carName(car)}`),
      this.lastInstall
        ? statsTable(
            this.lastInstall.before,
            this.lastInstall.after,
            `After fitting ${partName(findPart(cat, this.lastInstall.part)!)}`,
          )
        : statsTable(stats, stats),
      h(
        'p',
        { class: 'muted', style: 'font-size:0.8em' },
        `Fitted: ${installedParts(cat, state).map(partName).join(', ') || 'nothing, stock car'}`,
      ),
    );
  }

  private sponsorPanel(): HTMLElement {
    const state = store.require();
    const cat = store.catalogue;
    if (state.sponsor) {
      const sp = findSponsor(cat, state.sponsor.sponsorId);
      return h(
        'div',
        { class: 'deal-card', 'data-testid': 'active-deal' },
        h('h3', {}, `Active sponsor: ${sp?.name ?? state.sponsor.sponsorId}`),
        h(
          'dl',
          {},
          h('dt', {}, 'Objective'),
          h('dd', {}, describeObjective(state.sponsor.objective)),
          h('dt', {}, 'Payout'),
          h('dd', { class: 'money' }, `${usd(state.sponsor.payoutUsd)} per race`),
          h('dt', {}, 'Races left'),
          h('dd', {}, String(state.sponsor.racesLeft)),
          h('dt', {}, 'Earned'),
          h('dd', {}, usd(state.sponsor.earnedUsd)),
        ),
      );
    }
    const offer = state.offers.sponsor;
    if (!offer)
      return h(
        'div',
        {},
        h('h3', {}, 'Sponsorship'),
        h('p', { class: 'muted' }, 'No offer on the table. Ask Sterling about backing you.'),
      );
    const sp = findSponsor(cat, offer.sponsorId);
    return h(
      'div',
      {
        class: 'deal-card',
        'data-testid': 'deal-offer',
        role: 'group',
        'aria-label': 'Sponsorship offer',
      },
      h('h3', {}, `${sp?.name ?? offer.sponsorId} offer`),
      h(
        'dl',
        {},
        h('dt', {}, 'Objective'),
        h('dd', { 'data-testid': 'deal-objective' }, describeObjective(offer.objective)),
        h('dt', {}, 'Payout'),
        h(
          'dd',
          { class: 'money', 'data-testid': 'deal-payout' },
          `${usd(offer.payoutUsd)} per race`,
        ),
        h('dt', {}, 'Length'),
        h('dd', {}, `${offer.races} races`),
      ),
      h(
        'div',
        { class: 'row', style: 'display:flex;gap:0.5em;justify-content:flex-end' },
        h(
          'button',
          {
            type: 'button',
            onclick: () => this.dealAction({ type: 'declineSponsorship' }, 'Declined the offer'),
          },
          'Decline',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'primary',
            onclick: () =>
              this.dealAction(
                { type: 'acceptSponsorship' },
                `Signed with ${sp?.name ?? 'the sponsor'}`,
              ),
          },
          'Accept deal',
        ),
      ),
    );
  }

  private dealAction(action: GameAction, label: string): void {
    const r = store.dispatch(action);
    if (r.ok) {
      this.addMessage('system', `${label}.`);
      toast(label);
    } else this.addMessage('system', r.error.message);
  }

  /** Nitrous shots at the counter: a house price, three at most. */
  private nitrousRow(): HTMLElement {
    const state = store.require();
    const full = state.nitrous >= NITROUS_MAX_SHOTS;
    const poor = state.money < NITROUS_SHOT_USD;
    return h(
      'div',
      {
        class: 'part',
        role: 'group',
        'aria-label': 'Nitrous',
        style: 'margin-top:0.5em;border-color:#3a7bff',
      },
      h('span', { class: 'name' }, 'Nitrous shot (house blend)'),
      h('span', { class: 'price' }, usd(NITROUS_SHOT_USD)),
      h(
        'span',
        { class: 'meta' },
        'In the car: ',
        h('strong', { 'data-testid': 'nitrous-count' }, `${state.nitrous} of ${NITROUS_MAX_SHOTS}`),
        '. A few seconds of boost on the N key. Shop price, not a catalogue part.',
      ),
      h(
        'span',
        { class: 'actions' },
        h(
          'button',
          {
            type: 'button',
            class: 'primary',
            disabled: full || poor,
            onclick: () => {
              this.pending = {
                action: { type: 'buyNitrous', shots: 1 },
                label: `Buy 1 nitrous shot for ${usd(NITROUS_SHOT_USD)}`,
              };
              this.renderSide();
            },
          },
          full ? 'Full' : poor ? 'Too pricey' : 'Buy a shot',
        ),
      ),
    );
  }

  /** The dealer's lot: every other car, with the trade-in worked out. */
  private lotPanel(): HTMLElement {
    const state = store.require();
    const cat = store.catalogue;
    const mine = findCar(cat, state.carId)!;
    const trade = tradeInValue(cat, state);
    const rows = cat.cars
      .filter((c) => c.id !== state.carId)
      .map((car) => {
        const pay = car.price_usd - trade;
        return h(
          'div',
          { class: 'part', role: 'group', 'aria-label': carName(car), 'data-car-id': car.id },
          h('span', { class: 'name' }, carName(car)),
          h('span', { class: 'price' }, usd(car.price_usd)),
          h(
            'span',
            { class: 'meta' },
            `${car.power_hp} hp · ${car.weight_kg.toLocaleString('en-US')} kg · ${car.drivetrain} · ${car.engine} · price checked ${car.checked_on} · `,
            h(
              'a',
              { href: car.source_url, target: '_blank', rel: 'noopener noreferrer' },
              'source',
            ),
          ),
          h(
            'span',
            { class: 'meta', 'data-testid': 'you-pay' },
            `You pay ${usd(pay)} after trade-in`,
          ),
          h(
            'span',
            { class: 'actions' },
            h(
              'button',
              {
                type: 'button',
                class: 'primary',
                disabled: state.money < pay,
                onclick: () => {
                  this.pending = {
                    action: { type: 'buyCar', carId: car.id },
                    label: `Trade up to the ${carName(car)} for ${usd(pay)} after trade-in`,
                  };
                  this.renderSide();
                },
              },
              state.money < pay ? 'Cannot afford' : 'Buy',
            ),
          ),
        );
      });
    return h(
      'div',
      {},
      h('h3', {}, 'On the lot'),
      h(
        'p',
        { class: 'muted', style: 'margin:0 0 0.5em;font-size:0.8em', 'data-testid': 'trade-in' },
        `Trade-in on your ${carName(mine)}: ${usd(trade)}. Fitted parts go with it. You have ${usd(state.money)}.`,
      ),
      h('div', { class: 'part-list', 'aria-label': 'Cars for sale' }, rows),
    );
  }

  private localPanel(): HTMLElement {
    const state = store.require();
    const loc = findLocation(state.location);
    const best = state.bestFinish[loc.id];
    return h(
      'div',
      {},
      h('h3', {}, loc.name),
      h('p', {}, loc.blurb),
      h(
        'p',
        { class: 'muted' },
        best ? `Your best finish here: P${best}.` : 'You have not raced here yet.',
      ),
      h('h3', {}, 'Local knowledge'),
      this.tips.length
        ? h(
            'ul',
            { style: 'margin:0;padding-left:1.1em;font-size:0.85em' },
            this.tips.map((t) => h('li', {}, t.tip)),
          )
        : h('p', { class: 'muted' }, 'Ask about the track.'),
    );
  }

  private coachPanel(): HTMLElement {
    const state = store.require();
    const cat = store.catalogue;
    const car = findCar(cat, state.carId)!;
    const stats = carStats(car, installedParts(cat, state));
    const r = state.lastRace;
    return h(
      'div',
      {},
      h('h3', {}, 'Last race'),
      r
        ? h(
            'p',
            { 'data-testid': 'coach-last-race' },
            `P${r.position} of ${r.order.length}, ${formatTime(r.timeMs)}. Top speed ${r.topSpeedKmh} km/h. ${r.collisions} contacts.`,
          )
        : h('p', { class: 'muted' }, 'No races yet.'),
      h('h3', {}, 'Your car'),
      statsTable(stats, stats),
      h('h3', { style: 'margin-top:0.8em' }, "Mags's notes"),
      this.tips.length
        ? h(
            'ul',
            { style: 'margin:0;padding-left:1.1em;font-size:0.85em' },
            this.tips.map((t) => h('li', {}, h('strong', {}, `${t.topic}: `), t.tip)),
          )
        : h('p', { class: 'muted' }, 'Ask her how to go faster.'),
    );
  }
}

function sideLabel(p: Persona): string {
  const labels: Record<Persona['role'], string> = {
    parts: 'Shop',
    mechanic: 'Garage',
    sponsor: 'Sponsorship',
    coach: 'Notes',
    dealer: 'Car lot',
    local: 'Local knowledge',
  };
  return labels[p.role];
}

function rapportLabel(n: number): string {
  if (n <= -4) return 'cold';
  if (n < 0) return 'wary';
  if (n === 0) return 'new';
  if (n < 3) return 'friendly';
  if (n < 5) return 'friend';
  return 'close friend';
}

function statsTable(before: CarStats, after: CarStats, caption?: string): HTMLElement {
  const pb = performance(before);
  const pa = performance(after);
  const rows: [string, number, number, (n: number) => string, boolean][] = [
    ['Power', before.power_hp, after.power_hp, (n) => `${n.toFixed(1)} hp`, true],
    ['Weight', before.weight_kg, after.weight_kg, (n) => `${n.toFixed(0)} kg`, false],
    ['Grip', before.grip, after.grip, (n) => n.toFixed(2), true],
    ['Braking', before.braking, after.braking, (n) => n.toFixed(2), true],
    ['Top speed', msToKmh(pb.topSpeed), msToKmh(pa.topSpeed), (n) => `${n.toFixed(0)} km/h`, true],
  ];
  const changed = rows.some(([, b, a]) => Math.abs(a - b) > 1e-9);
  return h(
    'table',
    { class: 'stats', 'data-testid': changed ? 'stats-before-after' : 'stats' },
    caption
      ? h('caption', { style: 'text-align:left;font-size:0.85em;color:var(--good)' }, caption)
      : null,
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', {}, 'Stat'),
        changed ? h('th', {}, 'Before') : null,
        h('th', {}, changed ? 'After' : 'Value'),
      ),
    ),
    h(
      'tbody',
      {},
      rows.map(([label, b, a, fmt, higherBetter]) => {
        const diff = a - b;
        const cls = Math.abs(diff) < 1e-9 ? '' : diff > 0 === higherBetter ? 'up' : 'down';
        return h(
          'tr',
          {},
          h('td', {}, label),
          changed ? h('td', {}, fmt(b)) : null,
          h('td', { class: cls }, fmt(a)),
        );
      }),
    ),
  );
}

let current: DialogueView | null = null;

export function openDialogue(characterId: string, onClose: () => void): void {
  const persona = findCharacter(store.catalogue, characterId);
  if (!persona) {
    onClose();
    return;
  }
  current?.close();
  current = new DialogueView(persona, () => {
    current = null;
    onClose();
  });
  current.open();
}

/** Clears remembered conversations, e.g. when a new career starts. */
export function resetConversations(): void {
  sessions.clear();
}
