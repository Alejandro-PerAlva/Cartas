/** Mide la fluidez al arrastrar y hacer zoom a la mesa (CPU ralentizada x4 para parecerse a un móvil). node tools/panperf.mjs */
import { open } from './shot.mjs';
const s = await open({ width: 844, height: 390, touch: false }); const p = s.page;
await p.evaluate(() => window.ironHelm.startGame({ heroId: 'c1', config: { campaign: 'throne', modules: ['realms', 'troll', 'anemia'] }, seed: 5 }));
await p.evaluate(() => { window.__speed(0.1); window.ironHelm.settings.reading = 'off'; }); await p.waitForTimeout(1200);
await p.locator('button:has-text("ENTRAR EN LA MAZMORRA")').click(); await p.waitForTimeout(1500);
const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.evaluate(() => { window.__f = []; const l = (t) => { window.__f.push(t); requestAnimationFrame(l); }; requestAnimationFrame(l); });
for (let k = 0; k < 3; k++) { await p.mouse.move(420, 200); await p.mouse.down(); for (let i = 0; i < 40; i++) await p.mouse.move(420 - i * 7, 200 + (i % 2) * 20); await p.mouse.up(); for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(30); } }
const r = await p.evaluate(() => { const f = window.__f; const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); d.sort((a, b) => a - b); const q = (x) => +(d[Math.floor(d.length * x)] || 0).toFixed(1); return { frames: d.length, p50: q(0.5), p95: q(0.95), max: +d[d.length - 1].toFixed(0), over33: d.filter((x) => x > 33).length }; });
console.log(JSON.stringify(r)); await s.close();
