import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildCatalog } from '../iron_helm_game/js/engine/index.js';
import { play, audit } from './helpers/bot.js';

const CONFIGS = [
  { name: 'base', config: {} },
  { name: 'warren', config: { campaign: 'warren' } },
  { name: 'blackened', config: { campaign: 'blackened' } },
  { name: 'módulos', config: { modules: ['loot_lore', 'fanny_pack', 'beasts'] } },
  { name: 'warren+módulos', config: { campaign: 'warren', modules: ['loot_lore', 'fanny_pack', 'beasts'] } },
  { name: 'blackened+módulos', config: { campaign: 'blackened', modules: ['loot_lore', 'fanny_pack', 'beasts'] } },
];

for (const { name, config } of CONFIGS) {
  test(`partidas hasta el jefe, modo dios (${name})`, () => {
    const cat = buildCatalog(config);
    const heroes = cat.pools.heroes;
    const results = { victory: 0, defeat: 0 }; const reasons = {};
    let levels = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const hero = heroes[seed % heroes.length];
      const g = Game.create({ heroId: hero.id, config, seed, godMode: true });
      const res = play(g, { seed, maxSteps: 6000 });
      results[res.over.result]++; levels += g.s.level;
      reasons[res.over.reason] = (reasons[res.over.reason] || 0) + 1;
      const a = audit(g);
      assert.equal(a.problems.length, 0, `semilla ${seed}: ${a.problems.join('; ')}`);
    }
    console.log(`  ${name} (dios): victorias ${results.victory}, derrotas ${results.defeat}; nivel medio ${(levels / 40).toFixed(1)}`, reasons);
  });

  test(`partidas completas (${name})`, () => {
    const cat = buildCatalog(config);
    const heroes = cat.pools.heroes;
    let wins = 0; let games = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const hero = heroes[seed % heroes.length];
      const g = Game.create({ heroId: hero.id, config, seed });
      const res = play(g, { seed });
      games++; if (res.over.result === 'victory') wins++;
      const a = audit(g);
      assert.equal(a.problems.length, 0, `semilla ${seed}: ${a.problems.join('; ')}`);
    }
    console.log(`  ${name}: ${wins}/${games} victorias del bot aleatorio`);
  });
}
