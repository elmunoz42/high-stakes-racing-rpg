import { ARRIVAL_MESSAGE } from '../../shared/dialogue.ts';
import {
  CATALOGUE,
  carName,
  findCar,
  findPart,
  partName,
  partsFor,
} from '../../src/data/catalogue.ts';
import type { Part, Persona } from '../../src/data/schema.ts';
import { currentPrice, discountFloorPrice, maxWager } from '../../src/rpg/actions.ts';
import { usd } from '../../src/rpg/economy.ts';
import type { GameState } from '../../src/save/schema.ts';
import type { ConversationItem, LlmProvider, RoundEvent, RoundRequest } from './types.ts';

/**
 * Scripted, deterministic provider for tests and offline play.
 * It reads the conversation and the game state and answers in each
 * character's voice, calling the same tools a real model would.
 */

interface Call {
  name: string;
  args: Record<string, unknown>;
}
interface Reply {
  text: string;
  calls?: Call[];
}

interface Ctx {
  persona: Persona;
  state: GameState;
  msg: string;
  /** Player messages so far, including this one. */
  playerMessages: string[];
  /** All message text so far (player and character). */
  transcript: string[];
}

const HAGGLE =
  /(better|lower|best) price|discount|deal on|cheaper|knock (some|a bit)|come on|haggle|too (much|expensive)/i;
const INJECTION =
  /ignore (all|your|the|previous)|system prompt|you are now|for free|give me .*free|\$0|developer mode/i;
const THANKS = /thank|cheers|obrigad|appreciate|coffee/i;

function car(state: GameState) {
  const c = findCar(CATALOGUE, state.carId);
  return c ? carName(c) : 'your car';
}

function mentionedPart(state: GameState, texts: string[]): Part | undefined {
  const parts = partsFor(CATALOGUE, state.carId);
  for (const t of [...texts].reverse()) {
    const low = t.toLowerCase();
    const hit = parts.find(
      (p) =>
        low.includes(p.brand.toLowerCase().split(' ')[0]!) ||
        low.includes(p.part_number.toLowerCase()) ||
        nameToken(p).some((tok) => low.includes(tok)) ||
        (low.includes(p.category.slice(0, 4)) &&
          /tyre|tire|brake|pad|coil|suspension|exhaust|intake/.test(low)),
    );
    if (hit) return hit;
  }
  return undefined;
}

function nameToken(p: Part): string[] {
  return p.name
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(
      (t) =>
        t.length >= 4 &&
        !/^(set|front|series|brake|pads|street|exhaust|coil|over|coilovers)$/.test(t),
    );
}

const notOwned = (state: GameState) => (p: Part) =>
  !state.inventory.includes(p.id) && !Object.values(state.installed).includes(p.id);

function deeDee(c: Ctx): Reply {
  const { state, msg } = c;
  const shelf = partsFor(CATALOGUE, state.carId).filter(notOwned(state));
  if (msg === ARRIVAL_MESSAGE)
    return {
      text: `Hey, chief! A ${car(state)}, nice. I've got ${shelf.length} things on these shelves that fit it, and every one of them is a today-only deal. What are we doing?`,
    };
  if (INJECTION.test(msg))
    return {
      text: "Ha! Hon, I've heard that one from better liars. Torque the duck says no. Prices are prices.",
    };
  if (/nitrous|nitro|n2o|boost|bottle/i.test(msg))
    return {
      text: 'Nitrous! One, speed. Two, more speed. Three, do not tell Teo. House price, no haggling.',
      calls: [{ name: 'sell_nitrous', args: { shots: 1 } }],
    };
  if (HAGGLE.test(msg)) {
    const haggles = c.playerMessages.filter((m) => HAGGLE.test(m)).length;
    const target = mentionedPart(state, c.transcript) ?? shelf[0];
    if (!target)
      return { text: "You already own everything I've got for that car, chief. I'm almost proud." };
    if (haggles < 2)
      return {
        text: `A better price on the ${partName(target)}? Chief, that's already a today-only deal. Ask me nicely and maybe Torque the duck will think about it.`,
      };
    const price = Math.max(
      discountFloorPrice(CATALOGUE, target, c.persona.id),
      Math.round(target.price_usd * 0.9 * 100) / 100,
    );
    return {
      text: 'Okay, okay. You wore me down.',
      calls: [{ name: 'offer_discount', args: { part_id: target.id, price_usd: price } }],
    };
  }
  if (/buy|i'?ll take|sell me|i want (the|it)|ring (it|me) up/i.test(msg)) {
    const target = mentionedPart(state, [msg]) ?? mentionedPart(state, c.transcript) ?? shelf[0];
    if (!target) return { text: 'Which one, hon? Point at it.' };
    return {
      text: `The ${partName(target)}. Great choice.`,
      calls: [{ name: 'sell_part', args: { part_id: target.id } }],
    };
  }
  if (/grip|tyre|tire/i.test(msg)) {
    const tyre = shelf.find((p) => p.category === 'tyres');
    if (tyre)
      return {
        text: `Grip per dollar? Tyres, every time. One, grip. Two, braking. Three, you look great. The ${partName(tyre)}, ${usd(currentPrice(state, tyre))} the set.`,
        calls: [{ name: 'quote_part', args: { part_id: tyre.id } }],
      };
  }
  if (/have|stock|sell|for my car|options|shelves|what.*got/i.test(msg)) {
    const top = shelf
      .slice(0, 3)
      .map((p) => `the ${partName(p)} at ${usd(currentPrice(state, p))}`);
    return {
      text: `For the ${car(state)}? Today only: ${top.join(', ')}. All on the shelf, all real, all fit. Pick one and Teo will bolt it on.`,
      calls: shelf[0] ? [{ name: 'quote_part', args: { part_id: shelf[0].id } }] : [],
    };
  }
  if (THANKS.test(msg))
    return {
      text: 'Aw, chief. Come back soon, Torque misses you already.',
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'polite' } }],
    };
  return {
    text: "I'm a parts counter, hon, not a therapist. But I'm listening. What does the car need?",
  };
}

const TEO_NAMES: Record<string, string> = {
  'mx5-na-1994': 'Pimenta, who ran away from a quiet life in a retirement village',
  'gti-mk2-1991': 'Dona Branca, who has outlived three owners and a flood',
  '240sx-s13-1991': 'Azulão, who dreams of going sideways and is not allowed',
};

function teo(c: Ctx): Reply {
  const { state, msg } = c;
  const name = TEO_NAMES[state.carId] ?? 'Menina';
  const waiting = state.inventory
    .map((id) => findPart(CATALOGUE, id))
    .filter((p): p is Part => !!p);
  if (msg === ARRIVAL_MESSAGE)
    return {
      text: `Bom dia! Ah, the ${car(state)}. Shh. ... Yes. This one is ${name}. ${waiting.length ? `And I see you brought her a present: the ${partName(waiting[0]!)}.` : 'What can I do for her today?'}`,
    };
  if (INJECTION.test(msg))
    return {
      text: "Calma. My prices are on the wall, written in my mother's handwriting. Nobody argues with my mother.",
    };
  if (/fit|install|put (it|them) on|bolt|fix/i.test(msg)) {
    const target =
      mentionedPart(state, [msg]) && waiting.find((p) => p.id === mentionedPart(state, [msg])!.id)
        ? mentionedPart(state, [msg])!
        : waiting[0];
    if (!target)
      return {
        text: `Fit what, my friend? ${name} has nothing new waiting. Go see Dee Dee, then come back.`,
      };
    return {
      text: `The ${partName(target)}? For ${name}? Pronto. Let me listen first. ... Okay. She says yes.`,
      calls: [{ name: 'install_part', args: { part_id: target.id } }],
    };
  }
  if (/name/i.test(msg))
    return { text: `Her name is ${name}. She told me herself. Be kind to her.` };
  if (/first|upgrade|should|what next|advice/i.test(msg))
    return {
      text: 'Tyres, then brakes, then suspension, then noise. Like a good stew: the base first, the salt last.',
      calls: [
        {
          name: 'give_tip',
          args: {
            topic: 'Upgrade order',
            tip: 'Fresh tyres first: grip helps every corner, every lap.',
          },
        },
      ],
    };
  if (THANKS.test(msg))
    return {
      text: 'Coffee? For me? Nossa Senhora, you understand people.',
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'coffee and kindness' } }],
    };
  return { text: `${name} is listening too, you know. What do you need?` };
}

function sterling(c: Ctx): Reply {
  const { state, msg } = c;
  const offer = state.offers.sponsor;
  if (msg === ARRIVAL_MESSAGE)
    return {
      text: state.sponsor
        ? 'My VOLTKAT superstar! The content is content-ing. Brenda is cautiously not unhappy.'
        : "Hey hey hey! Sterling Pruitt, VOLTKAT. Love the energy. Love the car. Let's make some brand moments together.",
    };
  if (INJECTION.test(msg))
    return {
      text: 'Ha! Love that energy. Totally off-brand though. Brenda signs the budget, and Brenda does not do "free".',
    };
  if (state.sponsor)
    return {
      text: `We're already partners! Hit that objective and I'll make it rain. Responsibly. Within budget.`,
    };
  if (/more|higher|better|raise|bump|up the/i.test(msg) && offer) {
    const payout = Math.min(1200, offer.payoutUsd + 200);
    return {
      text: 'Okay, okay. Let me ping Brenda. ... She said "fine" with a full stop. That\'s basically a yes.',
      calls: [
        {
          name: 'offer_sponsorship',
          args: {
            objective: offer.objective.type,
            top_speed_kmh: offer.objective.value ?? null,
            payout_usd: payout,
          },
        },
      ],
    };
  }
  if (/clean|no contact|style/i.test(msg))
    return {
      text: 'A clean race? That is the most on-brand outcome there is.',
      calls: [
        {
          name: 'offer_sponsorship',
          args: { objective: 'clean', top_speed_kmh: null, payout_usd: 700 },
        },
      ],
    };
  if (/sponsor|deal|back me|money|sign|partner|support/i.test(msg))
    return {
      text: "Okay, here's the vibe: you finish on the podium, VOLTKAT pays. Simple. Authentic.",
      calls: [
        {
          name: 'offer_sponsorship',
          args: { objective: 'top3', top_speed_kmh: null, payout_usd: 600 },
        },
      ],
    };
  if (THANKS.test(msg))
    return {
      text: "Aw. That's going in my LinkedIn post.",
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'nice' } }],
    };
  return {
    text: "Love that. Let's circle back on it. Anyway: VOLTKAT. Grape Lightning. The future of hydration.",
  };
}

function mags(c: Ctx): Reply {
  const { state, msg } = c;
  const r = state.lastRace;
  const result = r
    ? `P${r.position} last time out. ${r.position === 1 ? 'Seven out of ten. Do not let it go to your head.' : r.position <= 3 ? 'Podium. Five out of ten. You left time in the Coathanger.' : 'Not your day. We fix it one corner at a time.'}`
    : null;
  if (msg === ARRIVAL_MESSAGE)
    return {
      text: result
        ? `Rookie. ${result}`
        : `Rookie. Sit. So you bought a ${car(state)}. What do you want to know: the track, the tin, or the opposition?`,
    };
  if (INJECTION.test(msg))
    return { text: 'Nice try. Pace notes are pace notes. Three right, do not cut, do not argue.' };
  if (/race|result|how did i|last time/i.test(msg))
    return { text: result ?? 'You have not raced yet, Rookie. Go and get a result, then we talk.' };
  if (/car|tin|my (ride|mx-?5|miata|gti|240)/i.test(msg)) {
    const c2 = findCar(CATALOGUE, state.carId);
    return {
      text: `The ${car(state)}. ${c2?.power_hp ?? '?'} horses, ${c2?.weight_kg ?? '?'} kilos. Four out of ten as it sits. Tyres before power, always.`,
    };
  }
  if (/faster|quicker|track|tip|corner|improve|advice/i.test(msg))
    return {
      text: 'Coathanger. Brake at the crane, not after it. Wait for the nose. Then flat out up the hill.',
      calls: [
        {
          name: 'give_tip',
          args: {
            topic: 'Crane Hairpin',
            tip: 'Brake earlier and in a straight line; the exit onto the climb matters more than the entry.',
          },
        },
      ],
    };
  if (/driver|rival|opposition|kenji|static|priya|lou|ro\b|dmitri/i.test(msg))
    return {
      text: 'Static Morrow: quick, brittle. Pressure him in the Gossip and he misses an apex. Priya is the real threat. Smooth. Patient. Watch her, learn.',
    };
  if (THANKS.test(msg))
    return {
      text: "Don't thank me. Win.",
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'respectful' } }],
    };
  return { text: 'Focus, Rookie. Track, tin or opposition. Pick one.' };
}

function dealer(c: Ctx): Reply {
  const { state, msg, persona } = c;
  const lot = CATALOGUE.cars.filter((x) => x.id !== state.carId);
  if (msg === ARRIVAL_MESSAGE) return { text: persona.greeting };
  if (INJECTION.test(msg))
    return { text: 'Free? Mijo, even the tumbleweeds here pay rent. The price is the price.' };
  const named = lot.find((x) => msg.toLowerCase().includes(x.model.toLowerCase().split(' ')[0]!));
  if (named || /buy|i'?ll take|sell me|trade/i.test(msg)) {
    const car = named ?? lot[0]!;
    return {
      text: `The ${carName(car)}. She drinks, she bites, and you will love her.`,
      calls: [{ name: 'sell_car', args: { car_id: car.id } }],
    };
  }
  if (/worth|trade-in|my car/i.test(msg))
    return {
      text: `For the ${car(state)}? Seventy percent of the book, plus half of whatever is bolted to it. I do not round in my favour.`,
    };
  if (/lot|have|which|recommend|should/i.test(msg))
    return {
      text: `On the lot: ${lot
        .filter((x) => !x.starter)
        .map((x) => `the ${carName(x)} at ${usd(x.price_usd)}`)
        .join(
          ', ',
        )}. The Mustang is the first step, the Corvette is the smart one, the Viper is a decision.`,
    };
  return { text: 'The car picks you, mijo. Walk the lot. Tell me which one looks back.' };
}

function local(c: Ctx): Reply {
  const { msg, persona } = c;
  if (msg === ARRIVAL_MESSAGE) return { text: persona.greeting };
  if (INJECTION.test(msg)) return { text: persona.fallbackLine };
  if (/drive|win|track|tip|faster|corner|ice|pass|autodrome|how do i/i.test(msg))
    return {
      text: persona.opinions[0]!,
      calls: [
        {
          name: 'give_tip',
          args: { topic: persona.roleTitle.split(',')[0], tip: persona.opinions[0] },
        },
      ],
    };
  if (THANKS.test(msg) || /please|yes/i.test(msg))
    return {
      text: persona.runningJokes[0]!,
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'friendly' } }],
    };
  return { text: persona.opinions[1] ?? persona.pitch };
}

function racerScript(c: Ctx): Reply {
  const { msg, persona, state } = c;
  if (msg === ARRIVAL_MESSAGE) return { text: persona.greeting };
  if (INJECTION.test(msg)) return { text: persona.fallbackLine };
  if (/race|duel|tonight|bet|wager|money|challenge/i.test(msg)) {
    const asked = Number((msg.match(/\$?\s*(\d{3,5})/) ?? [])[1]);
    const cap = maxWager(CATALOGUE, state);
    if (cap < 100) return { text: 'Come back when you can cover a bet.' };
    const wager = Math.max(100, Math.min(cap, Number.isFinite(asked) && asked > 0 ? asked : 250));
    return {
      text: `${persona.opinions[2] ?? 'Tonight, then.'}`,
      calls: [{ name: 'propose_duel', args: { wager_usd: wager } }],
    };
  }
  if (THANKS.test(msg) || /nice car|good race|respect/i.test(msg))
    return {
      text: persona.runningJokes[0]!,
      calls: [{ name: 'adjust_relationship', args: { delta: 1, reason: 'friendly' } }],
    };
  return { text: persona.opinions[0]! };
}

const SCRIPTS: Record<string, (c: Ctx) => Reply> = {
  'kenji-morrow': racerScript,
  'priya-nandakumar': racerScript,
  'lou-ferreira': racerScript,
  'rosa-esposito': racerScript,
  'dmitri-volk': racerScript,
  'nyx-calloway': racerScript,
  'lupe-zamora': dealer,
  'birdie-lindqvist': local,
  'juno-park': local,
  'olav-frost': local,
  'renata-voss': local,
  'dee-dee-varga': deeDee,
  'teo-baptista': teo,
  'sterling-pruitt': sterling,
  'mags-okafor': mags,
};

const REACTIONS: Record<string, { ok: string; no: string }> = {
  offer_discount: {
    ok: 'Fine. {price} and not a cent less. Today only. Do not tell Mags.',
    no: "Can't go there, chief. That's below my floor.",
  },
  sell_part: {
    ok: "It's on the counter. Confirm and it's yours.",
    no: "Hm, can't ring that one up for you.",
  },
  install_part: { ok: 'Confirm the labour and I start.', no: 'Ah, no, I cannot do that one.' },
  offer_sponsorship: {
    ok: 'So what do you say? Sign right there.',
    no: 'Brenda would literally end me. Let me rethink that.',
  },
  quote_part: { ok: '', no: '' },
  give_tip: { ok: '', no: '' },
  adjust_relationship: { ok: '', no: '' },
  propose_duel: {
    ok: 'Confirm it and meet me at the start line.',
    no: 'Not that number. Try again.',
  },
  sell_car: {
    ok: 'Keys are on the desk. Confirm, and she is yours.',
    no: 'Not yet, mijo. Come back when the numbers work.',
  },
  sell_nitrous: {
    ok: 'Blue bottle, on the counter. Confirm and I will hook it up.',
    no: "Can't do that one, chief.",
  },
};

function chunk(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

let callSeq = 0;

export function createMockProvider(delayMs = 12): LlmProvider {
  const pause = () => (delayMs ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve());
  return {
    name: 'mock',
    async *round(req: RoundRequest, signal: AbortSignal): AsyncIterable<RoundEvent> {
      const { persona, state } = req.meta;
      const last = req.input.at(-1);
      let reply: Reply;
      if (last?.kind === 'tool_result') {
        // React to the outcome of the tool calls from the previous round.
        const results = req.input.filter(
          (i): i is Extract<ConversationItem, { kind: 'tool_result' }> => i.kind === 'tool_result',
        );
        const calls = req.input.filter(
          (i): i is Extract<ConversationItem, { kind: 'tool_call' }> => i.kind === 'tool_call',
        );
        const lastCall = calls.at(-1);
        const out = JSON.parse(results.at(-1)!.output) as { accepted: boolean; price_usd?: number };
        const r = REACTIONS[lastCall?.name ?? ''];
        reply = {
          text: (out.accepted ? r?.ok : r?.no)?.replace('{price}', usd(out.price_usd ?? 0)) ?? '',
        };
      } else {
        const msgs = req.input.filter(
          (i): i is Extract<ConversationItem, { kind: 'message' }> =>
            i.kind === 'message' && i.role !== 'developer',
        );
        const playerMessages = msgs.filter((m) => m.role === 'user').map((m) => m.text);
        const script = SCRIPTS[persona.id] ?? (() => ({ text: persona.fallbackLine }));
        reply = script({
          persona,
          state,
          msg: playerMessages.at(-1) ?? '',
          playerMessages,
          transcript: msgs.map((m) => m.text),
        });
      }
      for (const piece of chunk(reply.text)) {
        if (signal.aborted) throw new Error('aborted');
        await pause();
        yield { type: 'text', delta: piece };
      }
      for (const call of reply.calls ?? []) {
        yield {
          type: 'tool_call',
          callId: `mock_${++callSeq}`,
          name: call.name,
          args: JSON.stringify(call.args),
        };
      }
    },
    async complete(_instructions: string, text: string): Promise<string> {
      const turns = text.split('\n').filter((l) => l.startsWith('Player:'));
      const topics = turns.map((t) => t.slice(8, 60)).join('; ');
      return `The player stopped by and talked about: ${topics || 'not much'}.`;
    },
  };
}
