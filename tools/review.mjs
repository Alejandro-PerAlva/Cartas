/**
 * Revisión visual guiada: abre una partida, prepara estados concretos y guarda capturas en shots/.
 *   node tools/review.mjs [prefijo] [ancho] [alto] [táctil 0|1] [campaña|-] [módulos,…|-]
 */
import { open } from './shot.mjs';

const [prefix = 'rv', w = '1600', hh = '900', touch = '0', camp = '-', mods = '-'] = process.argv.slice(2);
const s = await open({ width: +w, height: +hh, touch: touch === '1' });
const p = s.page; const shot = (n) => s.shot(`${prefix}-${n}`);
const config = { campaign: camp !== '-' ? camp : null, modules: mods !== '-' ? mods.split(',') : [] };
await p.evaluate(([config]) => window.ironHelm.startGame({ heroId: 'c1', config, seed: 11 }), [config]);
await p.evaluate(() => { window.__speed(0.1); window.ironHelm.settings.reading = 'off'; });
await p.waitForTimeout(1200);
await shot('01-shop');
const tile = p.locator('.inn-panel .pc:not(.poor)').first();
if (await tile.count()) { await tile.click(); await p.waitForTimeout(500); await shot('02-shop-inspect'); const b = p.locator('.inspect-acts .btn:has-text("COMPRAR")'); if (await b.count()) { await b.first().click(); await p.waitForTimeout(1200); await shot('03-shop-bought'); } else await p.locator('.inspect-acts .btn.quiet').click(); }
await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').click(); await p.waitForTimeout(1500);
// recursos para ver los montones
await p.evaluate(() => { const a = window.ironHelm; const h = a.game.s.hero; h.gold = 9; h.rations = 4; h.poison = 3; h.energy = 12; a.table.sync(); a.updateHud(); });
await shot('04-dungeon');
await p.locator('#nav [data-tab="char"]').click(); await p.waitForTimeout(1000); await shot('05-char');
await p.locator('#nav .pack').click(); await p.waitForTimeout(800); await shot('06-char-tray');
const tc = p.locator('#tray .tc').first();
if (await tc.count()) { await tc.click(); await p.waitForTimeout(400); await shot('07-tray-inspect'); await p.locator('.inspect-acts .btn.quiet').last().click(); await p.waitForTimeout(300); }
await p.locator('#tray .tray-x').click(); await p.waitForTimeout(500);
await p.locator('#nav [data-tab="dungeon"]').click(); await p.waitForTimeout(900);
await p.locator('#nav .pack').click(); await p.waitForTimeout(700); await shot('08-dungeon-tray'); await p.locator('#tray .tray-x').click();
console.log(JSON.stringify({ errors: s.errors.slice(0, 6) }));
await s.close();
