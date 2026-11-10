/**
 * The racers. Invented people in real cars from the catalogue.
 * Five of them are on the grid in every race; Nyx only races at night for money.
 * Each has their own lines for the three things that happen on track.
 */
export interface RaceLines {
  /** Said when the player passes them. */
  passedByPlayer: string[];
  /** Said when they pass the player. */
  passesPlayer: string[];
  /** Said on contact with the player. */
  bump: string[];
}

export interface Rival {
  id: string;
  name: string;
  /** Short name for speech bubbles. */
  short: string;
  /** Default car; locations move rivals up to faster ones. */
  carId: string;
  /** Fraction of the theoretical limit this driver uses. */
  pace: number;
  /** Sprite and bubble colour. */
  color: string;
  /** Only appears in night duels, never in the day race. */
  duelOnly?: boolean;
  /** One line used in results banter. */
  banter: { win: string; beatYou: string; lostToYou: string };
  lines: RaceLines;
}

export const RIVALS: Rival[] = [
  {
    id: 'kenji-morrow',
    name: 'Kenji "Static" Morrow',
    short: 'Static',
    carId: '240sx-s13-1991',
    pace: 0.975,
    color: '#1c1c24',
    banter: {
      win: 'Static: "Was that a race? Felt like a parade with me at the front."',
      beatYou: 'Static: "Cute car. Call me when it has a personality."',
      lostToYou: 'Static: "My tyres were cold. And the sun was in my eyes. At night."',
    },
    lines: {
      passedByPlayer: [
        'I LET you have that.',
        'Enjoy it. It is a loan.',
        'My tyres are cold! This does not count!',
        'Fine. I prefer the view from back here anyway. No I do not.',
      ],
      passesPlayer: [
        'And THAT is the natural order.',
        'Wave at the mirror, sweetheart.',
        'Static on your radio? That is me. Leaving.',
      ],
      bump: [
        'That is a custom bumper!',
        'Do you KNOW what this paint costs?',
        'Touch me again and I am telling everyone.',
      ],
    },
  },
  {
    id: 'priya-nandakumar',
    name: 'Priya Nandakumar',
    short: 'Priya',
    carId: 'mx5-na-1994',
    pace: 0.96,
    color: '#f2c230',
    banter: {
      win: 'Priya: "Momentum is free. Brakes are a choice."',
      beatYou: 'Priya: "You braked for the hairpin like it owed you money."',
      lostToYou: 'Priya: "Nice lines. I am stealing that exit."',
    },
    lines: {
      passedByPlayer: [
        'Clean. I am taking notes.',
        'Good exit. Do it again and I will believe it.',
        'Late on the brakes. I respect it.',
        'Okay. Now hold it for a whole lap.',
      ],
      passesPlayer: [
        'Momentum, friend. You gave yours away.',
        'You lifted. I felt it from here.',
        'Inside line was open. Thank you.',
      ],
      bump: [
        'Easy. We both need these cars tomorrow.',
        'That was a choice. A poor one.',
        'Racing room, please.',
      ],
    },
  },
  {
    id: 'lou-ferreira',
    name: '"Big" Lou Ferreira',
    short: 'Big Lou',
    carId: 'gti-mk2-1991',
    pace: 0.935,
    color: '#2e8b57',
    banter: {
      win: 'Lou: "Front-wheel drive, baby! Pull, don\'t push!"',
      beatYou: 'Lou: "Saw you in the mirror the whole way. Waved, too."',
      lostToYou: 'Lou: "Good race, kid. Next one\'s mine, and lunch is on you."',
    },
    lines: {
      passedByPlayer: [
        'Attaboy! Go get the next one!',
        'There you go, kid! Lunch is still on you!',
        'Ha! Look at you! I taught you that. I did not, but still!',
        'Go on, go on, I am only resting!',
      ],
      passesPlayer: [
        'Coming through, kid! Mind the paint!',
        'Pull, do not push! Wooo!',
        'See you at the buffet!',
      ],
      bump: [
        'Whoa! Rubbing is racing, but buy me dinner first!',
        'Easy, easy! This car has feelings!',
        'That is a hug in my family!',
      ],
    },
  },
  {
    id: 'rosa-esposito',
    name: 'Rosa "Ro" Esposito',
    short: 'Ro',
    carId: 'mx5-na-1994',
    pace: 0.915,
    color: '#ff7a2f',
    banter: {
      win: 'Ro: "Did everyone else forget where the throttle is?"',
      beatYou: 'Ro: "Swing by the fish market after. I\'ll buy you a consolation taco."',
      lostToYou: 'Ro: "Okay, okay. You earned that one."',
    },
    lines: {
      passedByPlayer: [
        'Oh, it is like THAT today?',
        'Okay, hotshot. I see you.',
        'Rude. Fast, but rude.',
        'Fine. But you are buying the tacos.',
      ],
      passesPlayer: [
        'Beep beep, coming through!',
        'Did you forget where the throttle is?',
        'Catch me and the tacos are on me!',
      ],
      bump: [
        'Hey! I just washed this!',
        'Ay! Hands to yourself!',
        'You owe me a bumper AND a taco.',
      ],
    },
  },
  {
    id: 'dmitri-volk',
    name: 'Dmitri Volk',
    short: 'Dmitri',
    carId: '240sx-s13-1991',
    pace: 0.895,
    color: '#8a2be2',
    banter: {
      win: 'Dmitri: "Sideways is fast if you believe."',
      beatYou: 'Dmitri: "I was sideways the whole lap and still passed you. Think about that."',
      lostToYou: 'Dmitri: "I was going for style points."',
    },
    lines: {
      passedByPlayer: [
        'You pass, but where is the style?',
        'Straight lines. So boring. So fast.',
        'I was mid-drift. It does not count.',
        'Go. I am composing a slide.',
      ],
      passesPlayer: [
        'Sideways AND in front. Believe!',
        'This is called commitment, my friend.',
        'Did you see the angle? Tell me you saw the angle.',
      ],
      bump: [
        'You have ruined my line and my art!',
        'Contact is not style!',
        'Ah! The slide was perfect until you!',
      ],
    },
  },
];

/** The sixth racer: never on the day grid, always up for a night race. */
export const NYX: Rival = {
  id: 'nyx-calloway',
  name: 'Nyx Calloway',
  short: 'Nyx',
  carId: '240sx-s13-1991',
  pace: 0.985,
  color: '#3a4a8a',
  duelOnly: true,
  banter: {
    win: 'Nyx: "The road tells the truth after dark. Tonight it said my name."',
    beatYou: 'Nyx: "Keep your money somewhere safer than your right foot."',
    lostToYou: 'Nyx: "Hm. The night has a new favourite. For now."',
  },
  lines: {
    passedByPlayer: [
      'Interesting. Nobody does that.',
      'So you can see in the dark too.',
      'Enjoy the front. It is lonely up there.',
      'Good. Now I get to hunt.',
    ],
    passesPlayer: ['Goodnight.', 'You blinked.', 'The dark belongs to me.'],
    bump: [
      'Careful. I count every scratch.',
      'Touch the car again and the wager doubles.',
      'We do not do that at night.',
    ],
  },
};

/** Everyone you can meet at the bar. */
export const RACERS: Rival[] = [...RIVALS, NYX];

export const findRacer = (id: string) => RACERS.find((r) => r.id === id);
