/**
 * IRON HELM DIGITAL - Renderizador de Pilas de Fichas Físicas (Token Stacks)
 * Muestra las fichas del héroe (salud, energía, oro, raciones, veneno, bendiciones)
 * como pilas 3D isométricas de discos de madera/cartón sobre el tapete.
 */

export function renderTokenPile(options) {
  const {
    type,           // 'salud', 'energia', 'oro', 'racion', 'veneno', 'bendicion'
    image,          // ruta a 'assets/tokens/token_X.png'
    count,          // valor actual
    maxCount = null,// valor máximo (opcional)
    label,          // nombre visible
    tooltip = '',   // descripción
    size = 42       // tamaño del token en px
  } = options;

  // Calculamos el número de fichas visuales en la pila (máximo 8 para no saturar el DOM)
  const visualDiscs = Math.min(8, Math.max(1, count));
  const isZero = count <= 0;

  let stackHtml = '';
  if (!isZero) {
    for (let i = 0; i < visualDiscs; i++) {
      const offsetY = i * 3.5;
      const offsetX = (i % 2 === 0 ? 0 : 1.5);
      const zIndex = i + 1;
      const shadowBlur = 3 + i * 1.5;
      stackHtml += `
        <div class="physical-token-disc" style="
          bottom: ${offsetY}px;
          left: ${offsetX}px;
          z-index: ${zIndex};
          width: ${size}px;
          height: ${size}px;
          filter: drop-shadow(0 ${shadowBlur}px ${shadowBlur}px rgba(0,0,0,0.6));
        ">
          <img src="${image}" alt="${label}" class="token-disc-face" />
        </div>
      `;
    }
  } else {
    // Espacio de pila vacía sobre el fieltro
    stackHtml = `
      <div class="empty-token-slot" style="width: ${size}px; height: ${size}px;">
        <span class="empty-slot-cross">✕</span>
      </div>
    `;
  }

  const countDisplay = maxCount !== null ? `${count}/${maxCount}` : `${count}`;

  return `
    <div class="physical-token-pile ${type}-pile ${isZero ? 'empty' : ''}" title="${tooltip}">
      <div class="token-stack-container" style="width: ${size + 6}px; height: ${size + (visualDiscs * 3.5)}px;">
        ${stackHtml}
      </div>
      <div class="token-pile-badge">
        <span class="token-pile-num">${countDisplay}</span>
        <span class="token-pile-label">${label}</span>
      </div>
    </div>
  `;
}
