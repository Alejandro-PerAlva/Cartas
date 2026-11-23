/**
 * Bot de interfaz: juega una partida completa pulsando de verdad los elementos de la pantalla.
 * Sirve para comprobar que cada decisión del motor tiene una interfaz usable. Guarda una captura
 * la primera vez que aparece cada tipo de petición.
 *   node tools/uibot.mjs [semilla] [heroId] [god] [módulos,separados] [campaña]
 */
import { open } from './shot.mjs';

export async function playUI({ perf = false, seed = 1, hero = 'c1', god = false, config = {}, width = 1600, height = 900, touch = false, maxSteps = 700, shots = true, prefix = 'ui', quiet = false, speedK = 0.12, reading = 'tap', exercise = true } = {}) {
  const s = await open({ width, height, touch });
  const p = s.page; const seen = new Set(); const log = [];
  await p.evaluate(([hero, config, seed, god]) => window.ironHelm.startGame({ heroId: hero, config, seed, godMode: god }), [hero, config, seed, god]);
  await p.evaluate((k) => window.__speed(k), speedK);
  await p.evaluate((r) => { window.ironHelm.settings.reading = r; }, reading);
  const stats = { holds: 0, tray: 0, shop: 0, drags: 0 };
  if (perf) await p.evaluate(() => { window.__fr = []; window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch {} const loop = (t) => { window.__fr.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  await p.waitForTimeout(800);
  const state = () => p.evaluate(() => { const a = window.ironHelm; const g = a.game; return { type: g.s.prompt?.type || null, over: g.s.over, busy: a.busy || a.director.running, lvl: g.s.level, hp: g.s.hero.hp + '/' + (g.s.combat ? g.s.combat.hp : '-') + '/' + g.s.hero.energy + '/' + g.s.stats.actions, spot: !!a.director.spot, arena: a.arena.open_ }; });
  const click = async (sel, nth = 0, opts = {}) => { const l = p.locator(sel).nth(nth); try { await l.click({ force: true, timeout: 4000, ...opts }); } catch (e) { throw new Error(`${sel}[${nth}] ${e.message.split('\n')[0]}`); } };
  let lastKey = ''; let stuck = 0;
  for (let step = 0; step < maxSteps; step++) {
    let st = await state();
    for (let i = 0; i < 80 && st.busy; i++) {
      await p.waitForTimeout(150);
      if (await p.locator('#hold.armed').count()) {
        stats.holds++; if (shots && stats.holds === 1) await s.shot(`${prefix}-hold`);
        const kind = await p.evaluate(() => (window.ironHelm.arena.open_ ? 'arena' : window.ironHelm.director.spot ? 'spot' : 'card'));
        if (shots && !seen.has('hold-' + kind)) { seen.add('hold-' + kind); await s.shot(`${prefix}-hold-${kind}`); }
        await p.locator('#hold').click({ force: true }).catch(() => {});
      }
      st = await state();
    }
    if (await p.locator('#hold').count()) { await p.waitForTimeout(300); if (await p.locator('#hold.armed').count()) { stats.holds++; await p.locator('#hold').click({ force: true }).catch(() => {}); } await p.waitForTimeout(150); continue; }
    if (st.over) break;
    const t = st.type; const key = t + st.lvl + st.hp;
    if (key === lastKey) stuck++; else stuck = 0; lastKey = key;
    if (stuck > 25) { log.push('ATASCADO en ' + t); await s.shot(`${prefix}-stuck-${t}`); break; }
    if (shots && !seen.has(t) && t) { seen.add(t); await p.waitForTimeout(500); await s.shot(`${prefix}-${String(seen.size).padStart(2, '0')}-${t}`); }
    try {
      switch (t) {
        case 'setup': {
          if (await p.locator('button:has-text("A LA POSADA")').count()) { await click('button:has-text("A LA POSADA")'); await p.waitForTimeout(500); break; }
          if (await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').count()) {
            if (exercise && !stats.shop) { // la tienda: tocar una carta la abre en grande y se puede comprar sin que se rehaga la pantalla
              stats.shop++; const n = await p.locator('.inn-panel .pc:not(.poor)').count();
              if (n) { await click('.inn-panel .pc:not(.poor)', 0); await p.waitForTimeout(400); if (shots) await s.shot(`${prefix}-shop-inspect`); const b = p.locator('.inspect-acts .btn:has-text("COMPRAR")'); if (await b.count()) { await b.first().click(); await p.waitForTimeout(900); } else await click('.inspect-acts .btn.quiet'); }
              if (shots) await s.shot(`${prefix}-shop-after`);
            }
            await click('button:has-text("ENTRAR EN LA MAZMORRA")');
          } else await p.waitForTimeout(500);
          break;
        }
        case 'turn': {
          if (exercise && step % 13 === 5) { // la mochila: abrirla, tocar una carta y cerrar
            stats.tray++; await click('#nav .pack'); await p.waitForTimeout(500);
            if (shots && stats.tray === 1) await s.shot(`${prefix}-tray`);
            if (await p.locator('#tray.open .tc').count()) { await click('#tray .tc', 0); await p.waitForTimeout(350); if (shots && stats.tray === 1) await s.shot(`${prefix}-tray-inspect`); await click('.inspect-acts .btn.quiet:has-text("CERRAR")'); }
            await click('#tray .tray-x'); await p.waitForTimeout(300);
          }
          if (exercise && step % 17 === 9) { await click('#nav [data-tab="char"]'); await p.waitForTimeout(800); if (shots && step < 40) await s.shot(`${prefix}-char`); await click('#nav [data-tab="dungeon"]'); await p.waitForTimeout(800); }
          await click('.slot-hit[data-zone="dungeon"]'); break;
        }
        case 'pair': { await p.waitForTimeout(700); if ((await state()).type === 'pair') await click(`.slot-hit[data-zone="door${1 + (step % 2)}"]`); break; }
        case 'chooseOne': await click('.slot-hit[data-zone="door1"]'); break;
        case 'decide': { const forced = await p.evaluate(() => window.ironHelm.game.s.prompt.forced); if (!forced && step % 3 === 0) await click('#actions .btn:has-text("ARRIESGAR"), #actions .btn:has-text("DESCARTAR")'); else await click('#actions .btn:has-text("AFRONTAR")'); break; }
        case 'choice': { const n = await p.locator('.plaque:not(.off)').count(); await click('.plaque:not(.off)', step % Math.max(1, n)); break; }
        case 'pickCards': {  const need = await p.evaluate(() => window.ironHelm.game.s.prompt.min); const total = await p.locator('.pickrow .pc').count(); for (let k = 0; k < Math.max(1, need); k++) { await click('.pickrow .pc', k % total); await p.waitForTimeout(120); } if (!(await p.locator('.pick-foot .btn.off').count())) await click('.pick-foot .btn.primary'); else if (need === 0) await click('.pick-foot .btn.quiet'); break; }
        case 'avoidCard': await click('.scene .plaque', await p.locator('.scene .plaque').count() - 1); break;
        case 'avoidEnemy': await click('.a-choices .plaque', await p.locator('.a-choices .plaque').count() - 1); break;
        case 'pre': await click('.a-seals .btn'); break;
        case 'attack': await click('.a-seals .btn.primary'); break;
        case 'postRoll': await click('.a-seals .btn.primary'); break;
        case 'enemyRoll': await click('.a-choices .plaque', await p.locator('.a-choices .plaque').count() - 1); break;
        case 'merchant': { if (step % 2) { const c = await p.locator('.pickrow').nth(0).locator('.pc').count(); if (c) { await click('.pickrow >> nth=0 >> .pc', 0); await p.waitForTimeout(200); await click('button.btn:has-text("COMPRAR")'); await p.waitForTimeout(300); } } await click('button.btn:has-text("SALIR")'); break; }
        case 'overweight': await click('.pickrow .pc', 0); await p.waitForTimeout(150); await click('button.btn:has-text("SOLTAR")'); break;
        case 'divine': await click('button.btn:has-text("AL COMBATE")'); break;
        default: await p.waitForTimeout(400);
      }
    } catch (e) { if (shots && !seen.has('err-' + t)) { seen.add('err-' + t); await s.shot(`${prefix}-err-${t}`); log.push('DOM ' + JSON.stringify(await p.evaluate(() => ({ arena: window.ironHelm.arena.open_, hold: !!document.querySelector('#hold'), seals: document.querySelectorAll('.a-seals .btn').length, prompt: window.ironHelm.game.s.prompt?.type, busy: window.ironHelm.busy, parca: !!window.ironHelm.game.s.parca })))); } log.push(`error ${t}: ${e.message.split('\n')[0]} :: ${JSON.stringify(await p.evaluate(() => { const q = window.ironHelm.game.s.prompt; return q && { type: q.type, purpose: q.purpose, min: q.min, max: q.max, n: q.uids?.length, title: q.title, dom: document.querySelectorAll('.pickrow .pc').length }; }))}`); await p.waitForTimeout(300); }
    await p.waitForTimeout(120);
  }
  const fin = await state();
  if (shots && fin.over) { await p.waitForTimeout(1800); await s.shot(`${prefix}-end-${fin.over.result}`); }
  const info = await p.evaluate(() => { const g = window.ironHelm.game; return { level: g.s.level, kills: g.s.z.graveyard.length, eyes: g.s.eyes, over: g.s.over && { r: g.s.over.result, why: g.s.over.reason } }; });
  let perfStats = null;
  if (perf) perfStats = await p.evaluate(() => { const f = window.__fr; const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); d.sort((a, b) => a - b); const q = (x) => d[Math.floor(d.length * x)] || 0; return { frames: d.length, p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), p99: +q(0.99).toFixed(1), max: +d[d.length - 1].toFixed(1), over33: d.filter((x) => x > 33).length, over50: d.filter((x) => x > 50).length, over100: d.filter((x) => x > 100).length, longtasks: window.__lt.length, longtaskMs: Math.round(window.__lt.reduce((a, b) => a + b, 0)) }; });
  const errors = s.errors.slice(); await s.close();
  if (!quiet) console.log(JSON.stringify({ seed, hero, info, seen: [...seen], stats, log, errors: errors.slice(0, 8), perfStats }));
  return { info, seen, log, errors, perfStats, stats };
}

if (process.argv[1].endsWith('uibot.mjs')) {
  const [seed = 1, hero = 'c1', god = '0', mods = '', camp = '', w = '1600', hh = '900', steps = '700', touch = '0', prefix = 'ui', pf = '0', sp = '0.12', rd = 'tap'] = process.argv.slice(2);
  await playUI({ seed: +seed, hero, god: god === '1', config: { modules: mods && mods !== '-' ? mods.split(',') : [], campaign: camp && camp !== '-' ? camp : null }, width: +w, height: +hh, maxSteps: +steps, touch: touch === '1', prefix, perf: pf === '1', speedK: +sp, shots: pf !== '1', reading: rd });
}
