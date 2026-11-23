/**
 * Bot de interfaz: juega una partida completa pulsando de verdad los elementos de la pantalla.
 * Sirve para comprobar que cada decisión del motor tiene una interfaz usable. Guarda una captura
 * la primera vez que aparece cada tipo de petición.
 *   node tools/uibot.mjs [semilla] [heroId] [god] [módulos,separados] [campaña]
 */
import { open } from './shot.mjs';

export async function playUI({ seed = 1, hero = 'c1', god = false, config = {}, width = 1600, height = 900, touch = false, maxSteps = 700, shots = true, prefix = 'ui', quiet = false, speedK = 0.12 } = {}) {
  const s = await open({ width, height, touch });
  const p = s.page; const seen = new Set(); const log = [];
  await p.evaluate(([hero, config, seed, god]) => window.ironHelm.startGame({ heroId: hero, config, seed, godMode: god }), [hero, config, seed, god]);
  await p.evaluate((k) => window.__speed(k), speedK);
  await p.waitForTimeout(800);
  const state = () => p.evaluate(() => { const a = window.ironHelm; const g = a.game; return { type: g.s.prompt?.type || null, over: g.s.over, busy: a.busy || a.director.running, lvl: g.s.level, hp: g.s.hero.hp + '/' + (g.s.combat ? g.s.combat.hp : '-') + '/' + g.s.hero.energy + '/' + g.s.stats.actions, spot: !!a.director.spot, arena: a.arena.open_ }; });
  const click = async (sel, nth = 0, opts = {}) => { const l = p.locator(sel).nth(nth); await l.click({ force: true, timeout: 4000, ...opts }); };
  let lastKey = ''; let stuck = 0;
  for (let step = 0; step < maxSteps; step++) {
    let st = await state();
    for (let i = 0; i < 60 && st.busy; i++) { await p.waitForTimeout(150); st = await state(); }
    if (st.over) break;
    const t = st.type; const key = t + st.lvl + st.hp;
    if (key === lastKey) stuck++; else stuck = 0; lastKey = key;
    if (stuck > 25) { log.push('ATASCADO en ' + t); await s.shot(`${prefix}-stuck-${t}`); break; }
    if (shots && !seen.has(t) && t) { seen.add(t); await p.waitForTimeout(500); await s.shot(`${prefix}-${String(seen.size).padStart(2, '0')}-${t}`); }
    try {
      switch (t) {
        case 'setup': await click('button.seal:has-text("COMENZAR")'); await p.waitForTimeout(250); if (await p.locator('.sheet button:has-text("ENTRAR IGUAL")').count()) await click('.sheet button:has-text("ENTRAR IGUAL")'); break;
        case 'turn': await click('.slot-hit[data-zone="dungeon"]'); break;
        case 'pair': await click(`.slot-hit[data-zone="door${1 + (step % 2)}"]`); break;
        case 'chooseOne': await click('.slot-hit[data-zone="door1"]'); break;
        case 'decide': { const forced = await p.evaluate(() => window.ironHelm.game.s.prompt.forced); if (!forced && step % 3 === 0) await click('#actions .seal:has-text("ARRIESGAR"), #actions .seal:has-text("DESCARTAR")'); else await click('#actions .seal:has-text("AFRONTAR")'); break; }
        case 'choice': { const n = await p.locator('.plaque:not(.off)').count(); await click('.plaque:not(.off)', step % Math.max(1, n)); break; }
        case 'pickCards': { const need = await p.evaluate(() => window.ironHelm.game.s.prompt.min); const total = await p.locator('.pickrow .pc').count(); for (let k = 0; k < Math.max(1, need); k++) { await click('.pickrow .pc', k % total); await p.waitForTimeout(120); } if (!(await p.locator('.pick-foot .seal.off').count())) await click('.pick-foot .seal.gold'); else if (need === 0) await click('.pick-foot .seal.sm'); break; }
        case 'avoidCard': await click('.scene .plaque', await p.locator('.scene .plaque').count() - 1); break;
        case 'avoidEnemy': await click('.a-choices .plaque', await p.locator('.a-choices .plaque').count() - 1); break;
        case 'pre': await click('.a-seals .seal'); break;
        case 'attack': await click('.a-seals .seal.pulse'); break;
        case 'postRoll': await click('.a-seals .seal'); break;
        case 'enemyRoll': await click('.a-choices .plaque', 1); break;
        case 'merchant': { if (step % 2) { const c = await p.locator('.pickrow').nth(0).locator('.pc').count(); if (c) { await click('.pickrow >> nth=0 >> .pc', 0); await p.waitForTimeout(200); await click('button.seal:has-text("COMPRAR")'); await p.waitForTimeout(300); } } await click('button.seal:has-text("SALIR")'); break; }
        case 'overweight': await click('.pickrow .pc', 0); await p.waitForTimeout(150); await click('button.seal:has-text("SOLTAR")'); break;
        case 'divine': await click('button.seal:has-text("AL COMBATE")'); break;
        default: await p.waitForTimeout(400);
      }
    } catch (e) { log.push(`error ${t}: ${e.message.split('\n')[0]}`); await p.waitForTimeout(300); }
    await p.waitForTimeout(120);
  }
  const fin = await state();
  if (shots && fin.over) { await p.waitForTimeout(1800); await s.shot(`${prefix}-end-${fin.over.result}`); }
  const info = await p.evaluate(() => { const g = window.ironHelm.game; return { level: g.s.level, kills: g.s.z.graveyard.length, eyes: g.s.eyes, over: g.s.over && { r: g.s.over.result, why: g.s.over.reason } }; });
  const errors = s.errors.slice(); await s.close();
  if (!quiet) console.log(JSON.stringify({ seed, hero, info, seen: [...seen], log, errors: errors.slice(0, 8) }));
  return { info, seen, log, errors };
}

if (process.argv[1].endsWith('uibot.mjs')) {
  const [seed = 1, hero = 'c1', god = '0', mods = '', camp = '', w = '1600', hh = '900', steps = '700', touch = '0', prefix = 'ui'] = process.argv.slice(2);
  await playUI({ seed: +seed, hero, god: god === '1', config: { modules: mods ? mods.split(',') : [], campaign: camp || null }, width: +w, height: +hh, maxSteps: +steps, touch: touch === '1', prefix });
}
