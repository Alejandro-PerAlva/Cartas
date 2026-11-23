/**
 * Auditoría de formato: recorre las pantallas principales en varios tamaños de móvil/tableta (con muescas simuladas) y comprueba
 * que nada se sale de la pantalla, que no hay barras de desplazamiento sobrantes ni desbordes horizontales. Guarda capturas en shots/fc-*.png.
 *   node tools/formatcheck.mjs [rápida]
 */
import { open } from './shot.mjs';

const VIEWS = [
  ['p360', 360, 740, true, '24,0,0,0'], ['p412', 412, 915, true, '30,0,0,0'], ['p390', 390, 844, true, '47,0,0,0'],
  ['l740', 740, 360, true, '0,44,0,44'], ['l915', 915, 412, true, '0,48,0,48'], ['t1024', 1024, 768, true, '0,0,0,0'], ['d1600', 1600, 900, false, '0,0,0,0'],
];
const quick = process.argv[2] === 'rápida';
const problems = [];
const audit = (page) => page.evaluate(() => {
  const out = []; const W = innerWidth, H = innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  if (document.documentElement.scrollWidth > W + 1) out.push(`desborde horizontal de la página (${document.documentElement.scrollWidth} > ${W})`);
  for (const sel of ['.sheet', '.hold-plate', '.inspect-card', '.inn-panel', '.book', '.builder-panel', '.btn', '.plaque', '.pick-title', '.pick-sub', '.hud-stats', '#nav', '.menu-head h1', '.menu-foot', '.tc-tag']) {
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue; if (el.closest('.leaving')) continue;
      const r = el.getBoundingClientRect(); const bad = r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2;
      // los botones dentro de zonas con desplazamiento propio pueden quedar fuera a propósito
      if (bad && !el.closest('.pickwrap, .menu-col, .book .page, .tray-rail, .scroll .plaque, .a-choices, .builder-main')) out.push(`${sel} fuera de pantalla: [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}] en ${W}×${H}`);
    }
  }
  for (const el of document.querySelectorAll('.scroll, .sheet, .inn-panel')) {
    if (!visible(el)) continue; const d = el.scrollHeight - el.clientHeight; const dx = el.scrollWidth - el.clientWidth;
    if (dx > 2) out.push(`${el.className} con desborde horizontal ${dx}px`);
    if (d > 2 && d < 24) out.push(`${el.className} con barra de desplazamiento sobrante (${d}px)`);
  }
  return out;
});

for (const [name, w, h, touch, ins] of VIEWS) {
  if (quick && !['p390', 'l915', 'd1600'].includes(name)) continue;
  process.env.IH_INSETS = ins;
  const s = await open({ width: w, height: h, touch }); const p = s.page; const shot = (n) => s.shot(`fc-${name}-${n}`);
  const check = async (what) => { const r = await audit(p); for (const m of r) problems.push(`${name} · ${what}: ${m}`); };
  await p.waitForTimeout(700); await shot('01-menu'); await check('menú');
  // menú → partida
  await p.evaluate(() => window.ironHelm.startGame({ heroId: 'c1', config: { modules: [] }, seed: 12 }));
  await p.evaluate(() => { window.__speed(0.1); window.ironHelm.settings.reading = 'off'; });
  await p.waitForTimeout(1300); await shot('02-shop'); await check('posada');
  const tile = p.locator('.inn-panel .pc:not(.poor)').first();
  if (await tile.count()) { await tile.click(); await p.waitForTimeout(450); await shot('03-inspect'); await check('ficha de carta'); await p.locator('.inspect-acts .btn.quiet').last().click(); await p.waitForTimeout(250); }
  await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').click(); await p.waitForTimeout(1500); await shot('04-dungeon'); await check('mazmorra');
  await p.locator('#nav .pack').click(); await p.waitForTimeout(650); await shot('05-tray'); await check('mochila'); await p.locator('#tray .tray-x').click(); await p.waitForTimeout(350);
  await p.locator('#nav [data-tab="char"]').click(); await p.waitForTimeout(1000); await shot('06-char'); await check('personaje');
  await p.locator('#nav .pack').click(); await p.waitForTimeout(650); await shot('07-char-tray'); await check('personaje + mochila'); await p.locator('#tray .tray-x').click(); await p.waitForTimeout(350);
  await p.evaluate(() => window.ironHelm.overlays.showSettings()); await p.waitForTimeout(450); await shot('08-settings'); await check('ajustes'); await p.evaluate(() => window.ironHelm.overlays.clearUser());
  await p.evaluate(() => window.ironHelm.back()); await p.waitForTimeout(450); await shot('09-back-confirm'); await check('confirmar salir'); await p.locator('.sheet .btn.quiet').click().catch(() => {}); await p.waitForTimeout(250);
  await p.evaluate(() => window.ironHelm.openJournal('map')); await p.waitForTimeout(450); await shot('10-journal'); await check('diario'); await p.evaluate(() => window.ironHelm.overlays.clearUser());
  await p.evaluate(() => window.ironHelm.overlays.showPile('Botín descartado', 'Prueba', window.ironHelm.game.s.z.loot.slice(0, 3))); await p.waitForTimeout(400); await shot('11-pile'); await check('pila'); await p.evaluate(() => window.ironHelm.overlays.clearUser());
  // rotación con la partida abierta: la mesa debe reencuadrarse
  await p.locator('#nav [data-tab="dungeon"]').click(); await p.waitForTimeout(900);
  await p.setViewportSize({ width: h, height: w }); await p.waitForTimeout(900); await s.shot(`fc-${name}-12-rotated`); await check('girado');
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(700);
  if (s.errors.length) problems.push(`${name}: errores JS: ${s.errors.slice(0, 3).join(' | ')}`);
  await s.close();
}
console.log(problems.length ? problems.join('\n') : 'Sin problemas de formato detectados.');
process.exit(problems.length ? 1 : 0);
