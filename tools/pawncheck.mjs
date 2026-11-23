/** Comprueba que el peón de nivel cae sobre el número de sala en el mapa de cada campaña: guarda recortes en shots/pawns-<campaña>-<nivel>.png */
import { open } from './shot.mjs';
const CAMPS = ['', 'warren', 'blackened', 'galnok', 'crystal', 'throne', 'malicia', 'spire'];
for (const camp of CAMPS) {
  const s = await open({ width: 1600, height: 900 }); const p = s.page;
  await p.evaluate(([camp]) => window.ironHelm.startGame({ heroId: 'c1', config: { campaign: camp || null, modules: [] }, seed: 4 }), [camp]);
  await p.evaluate(() => { window.__speed(0.1); window.ironHelm.settings.reading = 'off'; });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').click(); await p.waitForTimeout(1200);
  for (let lv = 1; lv <= 5; lv++) {
    await p.evaluate((lv) => { const a = window.ironHelm; a.game.s.level = lv; a.table.vs = a.table.extract(); a.table.render(); }, lv);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const a = window.ironHelm; const z = window.ironHelm.table.hits.map.getBoundingClientRect(); return { x: z.x - 6, y: z.y - 30, width: z.width + 12, height: z.height + 40 }; });
    await p.screenshot({ path: `shots/pawns-${camp || 'base'}-${lv}.png`, clip: r });
  }
  await s.close();
}
console.log('ok');
