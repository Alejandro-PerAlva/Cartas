/** Iconos de interfaz en SVG (trazo dorado, coherentes con el resto del juego). */
const P = {
  door: '<path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M3 21h18"/><path d="M12 6v15"/><circle cx="15.5" cy="14" r=".9" fill="currentColor"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 7v10"/><path d="M8.5 11h7"/>',
  pack: '<path d="M8.5 6.5a3.5 3.5 0 0 1 7 0"/><path d="M6.5 7h11a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8.5A1.5 1.5 0 0 1 6.5 7z"/><path d="M9 13.5h6"/><path d="M9.5 7v3.5M14.5 7v3.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5V21"/><path d="M8.5 7.5H15M8.5 11H15"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  weight: '<path d="M6 8h12l2 12H4z"/><circle cx="12" cy="5.5" r="2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  scale: '<path d="M12 4v16M6 20h12M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7zM19 7l-2.5 6a3 3 0 0 0 5 0L19 7z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
  trash: '<path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.9-2.5.9-2.5 1.9 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>',
};
export function icon(name, size = 22) {
  const el = document.createElement('span');
  el.className = 'ico'; el.style.cssText = `display:inline-flex;width:${size}px;height:${size}px;flex:none`;
  el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  return el;
}
