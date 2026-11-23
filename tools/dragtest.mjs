/** Prueba de arrastre real (ratón o táctil): ranura → bandeja, bandeja → ranura y soltar. node tools/dragtest.mjs [ancho] [alto] [táctil] */
import { open } from './shot.mjs';
const [w = '1600', hh = '900', touch = '0'] = process.argv.slice(2);
const s = await open({ width: +w, height: +hh, touch: touch === '1' }); const p = s.page; const out = [];
const ok = (name, cond, extra = '') => { out.push(`${cond ? '✔' : '✘'} ${name} ${extra}`); };
await p.evaluate(() => window.ironHelm.startGame({ heroId: 'c1', config: {}, seed: 5 }));
await p.evaluate(() => { window.__speed(0.1); window.ironHelm.settings.reading = 'off'; });
await p.waitForTimeout(1200);
await p.locator('.inn-panel .pc:not(.poor)').first().click(); await p.waitForTimeout(400); await p.locator('.inspect-acts .btn:has-text("COMPRAR")').click(); await p.waitForTimeout(1200);
await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').click(); await p.waitForTimeout(1500);
await p.locator('#nav [data-tab="char"]').click(); await p.waitForTimeout(900);
const state = () => p.evaluate(() => { const g = window.ironHelm.game; return { MP: g.s.eq.MP, hand: g.s.z.hand.length, OM: g.s.eq.OM, items: g.allItems().length }; });
const center = async (sel, n = 0) => { const b = await p.locator(sel).nth(n).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const cdp = touch === '1' ? await p.context().newCDPSession(p) : null;
const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const drag = async (from, to, steps = 14) => {
  if (cdp) { await tp('touchStart', from.x, from.y); for (let i = 1; i <= steps; i++) { await tp('touchMove', from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await p.waitForTimeout(16); } await p.waitForTimeout(120); await tp('touchEnd'); await p.waitForTimeout(900); return; }
  await p.mouse.move(from.x, from.y); await p.mouse.down();
  for (let i = 1; i <= steps; i++) await p.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
  await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(900);
};
let st = await state(); ok('empieza con arma en mano principal', !!st.MP);
await p.locator('#nav .pack').click(); await p.waitForTimeout(800);
// ranura → bandeja
let from = await center('.card[data-uid]', 0); void from;
const mainCard = p.locator('.slot-hit[data-zone="c_main"]'); const mb = await mainCard.boundingBox();
const src = { x: mb.x + mb.width / 2, y: mb.y + mb.height / 2 }; const tray = await p.locator('#tray').boundingBox();
await drag(src, { x: tray.x + tray.width / 2, y: tray.y + tray.height / 2 });
st = await state(); ok('arrastrar el arma a la bandeja la guarda', !st.MP && st.hand === 1, JSON.stringify(st));
await s.shot('drag-1-stored');
// bandeja → ranura
const tc = await center('#tray .tc.bag, #tray .tray-group.bag .tc', 0).catch(() => null);
const tcp = tc || await center('#tray .tc', 0);
const mb2 = await mainCard.boundingBox();
await drag(tcp, { x: mb2.x + mb2.width / 2, y: mb2.y + mb2.height / 2 });
st = await state(); ok('arrastrar de la bandeja a la ranura equipa', !!st.MP && st.hand === 0, JSON.stringify(st));
await s.shot('drag-2-equipped');
if (!cdp) { // soltar: arma → cubo
const mb3 = await mainCard.boundingBox(); const before = (await state()).items;
await p.mouse.move(mb3.x + mb3.width / 2, mb3.y + mb3.height / 2); await p.mouse.down();
for (let i = 1; i <= 10; i++) await p.mouse.move(mb3.x + mb3.width / 2 + i * 8, mb3.y + mb3.height / 2 - i * 12);
await s.shot("drag-3-bin"); console.log(out.join("\n")); const bin = await p.locator(await p.locator("#dragbin").count() ? "#dragbin" : ".trash").boundingBox({ timeout: 2000 });   // en el tablero de personaje se suelta sobre la reja (.trash)
await p.mouse.move(bin.x + bin.width / 2, bin.y + bin.height / 2, { steps: 6 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(900);
st = await state(); ok('soltar en el cubo descarta el objeto', st.items === before - 1, JSON.stringify(st));
}
console.log(out.join('\n')); console.log(JSON.stringify({ errors: s.errors.slice(0, 5) }));
await s.close();
