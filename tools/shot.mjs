/**
 * Utilidad de pruebas visuales: abre el juego en Chromium (Playwright), ejecuta pasos y guarda capturas en shots/.
 *   import { open } from './shot.mjs'
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.HOME + '/Library/Caches/ms-playwright/';
const exe = () => { const d = fs.readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().pop(); return `${base}${d}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`; };

export async function open({ width = 1600, height = 900, touch = false, scale = 1, url = null } = {}) {
  const browser = await chromium.launch({ executablePath: exe(), headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-gl=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: scale });
  const page = await ctx.newPage(); page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type().toUpperCase()} ${m.text()}`); });
  // IH_INSETS="arriba,derecha,abajo,izquierda" (px CSS) simula muescas y barras del sistema, igual que hace la app Android
  const ins = (process.env.IH_INSETS || '').split(',').map(Number);
  if (ins.length === 4 && ins.every((n) => Number.isFinite(n))) await page.addInitScript((v) => { const set = () => { if (!document.documentElement) return; const st = document.documentElement.style; ['t', 'r', 'b', 'l'].forEach((k, i) => st.setProperty('--sai-' + k, v[i] + 'px')); }; set(); document.addEventListener('DOMContentLoaded', set); }, ins);
  await page.goto(url || 'file://' + path.join(ROOT, 'iron_helm_game', 'index.html'));
  await page.waitForTimeout(600);
  fs.mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
  const shot = async (name) => { await page.screenshot({ path: path.join(ROOT, 'shots', name + '.png') }); return name; };
  return { browser, page, errors, shot, close: () => browser.close() };
}
