import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/data/catalogue.ts';
import { findPart } from '../../src/data/catalogue.ts';
import { migrate } from '../../src/save/migrations.ts';

const dir = 'tests/fixtures/saves';

describe('save fixtures', () => {
  it.each(readdirSync(dir).filter((f) => f.endsWith('.json')))('%s is a valid save using real catalogue ids', (file) => {
    const s = migrate(JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')));
    expect(CATALOGUE.cars.some((c) => c.id === s.carId)).toBe(true);
    for (const id of [...s.inventory, ...Object.values(s.installed)]) expect(findPart(CATALOGUE, id!)).toBeTruthy();
  });
});
