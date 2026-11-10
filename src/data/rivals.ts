/** AI rivals. Invented people in real (stock) cars from the catalogue. */
export interface Rival {
  id: string;
  name: string;
  carId: string;
  /** Fraction of the theoretical limit this driver uses. */
  pace: number;
  /** One line used in results banter. */
  banter: { win: string; beatYou: string; lostToYou: string };
}

export const RIVALS: Rival[] = [
  {
    id: 'kenji-morrow',
    name: 'Kenji "Static" Morrow',
    carId: '240sx-s13-1991',
    pace: 0.975,
    banter: {
      win: 'Static: "Was that a race? Felt like a parade with me at the front."',
      beatYou: 'Static: "Cute car. Call me when it has a personality."',
      lostToYou: 'Static: "My tyres were cold. And the sun was in my eyes. At night."',
    },
  },
  {
    id: 'priya-nandakumar',
    name: 'Priya Nandakumar',
    carId: 'mx5-na-1994',
    pace: 0.96,
    banter: {
      win: 'Priya: "Momentum is free. Brakes are a choice."',
      beatYou: 'Priya: "You braked for the hairpin like it owed you money."',
      lostToYou: 'Priya: "Nice lines. I am stealing that exit."',
    },
  },
  {
    id: 'lou-ferreira',
    name: '"Big" Lou Ferreira',
    carId: 'gti-mk2-1991',
    pace: 0.935,
    banter: {
      win: 'Lou: "Front-wheel drive, baby! Pull, don\'t push!"',
      beatYou: 'Lou: "Saw you in the mirror the whole way. Waved, too."',
      lostToYou: 'Lou: "Good race, kid. Next one\'s mine, and lunch is on you."',
    },
  },
  {
    id: 'rosa-esposito',
    name: 'Rosa "Ro" Esposito',
    carId: 'mx5-na-1994',
    pace: 0.915,
    banter: {
      win: 'Ro: "Did everyone else forget where the throttle is?"',
      beatYou: 'Ro: "Swing by the fish market after. I\'ll buy you a consolation taco."',
      lostToYou: 'Ro: "Okay, okay. You earned that one."',
    },
  },
  {
    id: 'dmitri-volk',
    name: 'Dmitri Volk',
    carId: '240sx-s13-1991',
    pace: 0.895,
    banter: {
      win: 'Dmitri: "Sideways is fast if you believe."',
      beatYou: 'Dmitri: "I was sideways the whole lap and still passed you. Think about that."',
      lostToYou: 'Dmitri: "I was going for style points."',
    },
  },
];
