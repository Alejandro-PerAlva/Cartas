/**
 * IRON HELM - Modal de Zoom de Cartas en Alta Resolución
 */

export class CardModalView {
  constructor(container) {
    this.container = container;
    this.currentSrc = null;

    window.openCardModal = (src) => {
      this.open(src);
    };
  }

  open(src) {
    this.currentSrc = src;
    this.render();
  }

  close() {
    this.currentSrc = null;
    this.container.innerHTML = '';
  }

  render() {
    if (!this.currentSrc) return;

    this.container.innerHTML = `
      <div class="card-zoom-overlay" id="zoomOverlay">
        <div class="card-zoom-wrapper">
          <img src="${this.currentSrc}" alt="Carta en Detalle" class="zoomed-card-img" />
          <button class="btn-close-zoom" id="btnCloseZoom">✕ Cerrar</button>
        </div>
      </div>
    `;

    const overlay = this.container.querySelector('#zoomOverlay');
    const btnClose = this.container.querySelector('#btnCloseZoom');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }
  }
}
