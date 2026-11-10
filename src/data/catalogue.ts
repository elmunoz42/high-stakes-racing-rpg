import type { Car, Part, Persona, Sponsor } from './schema.ts';
import { CARS } from './cars.ts';
import { PARTS } from './parts.ts';
import { SPONSORS } from './sponsors.ts';
import { CHARACTERS } from './characters/index.ts';

export interface Catalogue {
  cars: readonly Car[];
  parts: readonly Part[];
  sponsors: readonly Sponsor[];
  characters: readonly Persona[];
}

export const CATALOGUE: Catalogue = {
  cars: CARS,
  parts: PARTS,
  sponsors: SPONSORS,
  characters: CHARACTERS,
};

export const findCar = (cat: Catalogue, id: string) => cat.cars.find((c) => c.id === id);
export const findPart = (cat: Catalogue, id: string) => cat.parts.find((p) => p.id === id);
export const findSponsor = (cat: Catalogue, id: string) => cat.sponsors.find((s) => s.id === id);
export const findCharacter = (cat: Catalogue, id: string) =>
  cat.characters.find((c) => c.id === id);
export const characterByRole = (cat: Catalogue, role: Persona['role']) =>
  cat.characters.find((c) => c.role === role);

export const carName = (car: Pick<Car, 'year' | 'make' | 'model'>) =>
  `${car.year} ${car.make} ${car.model}`;
export const partName = (part: Pick<Part, 'brand' | 'name'>) => `${part.brand} ${part.name}`;

export function partsFor(cat: Catalogue, carId: string): Part[] {
  return cat.parts.filter((p) => p.fits.includes(carId));
}
