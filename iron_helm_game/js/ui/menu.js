/** Pantalla de inicio: título, elección de héroe con las cartas reales, expansiones y continuar partida. */
import { h } from './dom.js';
import { buildCatalog, listPacks } from '../engine/index.js';
import { sound } from './audio.js';
import { cardPath } from './cards.js';

const PROF = { agilidad: 'Agilidad', mente: 'Mente', fuerza: 'Fuerza' };

export class Menu {
  constructor(app, root) {
    this.app = app; this.root = root;
    const saved = app.loadPrefs();
    this.cfg = { campaign: saved.campaign || null, modules: saved.modules || [] };
    this.heroId = saved.heroId || 'c1';
    this.info = listPacks();
    this.render();
  }
  get heroes() { return buildCatalog(this.cfg).pools.heroes; }
  render() {
    const app = this.app; const cat = buildCatalog(this.cfg);
    if (!cat.pools.heroes.some((x) => x.id === this.heroId)) this.heroId = 'c1';
    const hero = cat.pools.heroes.find((x) => x.id === this.heroId);
    const byName = (n) => cat.defs.find((d) => d.name === n);
    const trappings = hero.trappings.map((id) => cat.def(id).name).join(' y ');
    const skills = hero.skills.map((id) => cat.def(id).name).join(' y ');
    this.root.innerHTML = '';
    const save = app.hasSave();
    const heroes = h('div.heroes', { dataset: { scroll: '1' } }, cat.pools.heroes.map((x) => {
      const pk = x.pack !== 'base' ? this.info.packs.find((p) => p.id === x.pack) : null;
      return h('div.hero-pick' + (x.id === this.heroId ? '.on' : ''), { onclick: () => { sound.unlock(); sound.flip(); this.heroId = x.id; this.render(); } },
        h('img', { src: cardPath(x.img), alt: x.name }), pk ? h('div.pk', pk.name) : null);
    }));
    const packEl = (p) => {
      const on = p.type === 'campaign' ? this.cfg.campaign === p.id : this.cfg.modules.includes(p.id);
      return h('div.pack' + (on ? '.on' : '') + (p.type === 'module' ? '.mod' : ''), { onclick: () => this.toggle(p) },
        h('div.kind', p.type === 'campaign' ? 'CAMPAÑA' : 'MÓDULO'), h('div.tg'),
        h('b', p.es), h('em', p.name !== p.es ? p.name : `Expansión nº ${p.number}`), h('p', p.blurb),
        p.type === 'campaign' ? h('p', { style: 'margin-top:6px;font-size:13px;color:#a89570' }, `Jefe final propio · nivel de aventura ${p.adventureLevel}`) : null);
    };
    const camps = this.info.packs.filter((p) => p.type === 'campaign'); const mods = this.info.packs.filter((p) => p.type === 'module');
    this.root.append(
      h('div.menu',
        h('div.torch', { style: 'left:6%' }), h('div.torch', { style: 'right:6%' }),
        h('div.inner',
          h('div.logo', h('h1', 'IRON HELM'), h('p', 'Un último botín antes de colgar la espada…')),
          h('h2', 'Elige a tu héroe'), heroes,
          h('div.hero-info',
            h('div', { style: 'font:800 26px var(--font-title);color:var(--gold2)' }, hero.name),
            h('div', ...[['health', hero.health], ['energy', hero.energy], ['ration', hero.rations], ['gold', hero.gold]].map(([k, v]) => h('span.st', h('img', { src: `assets/tokens/tk_${k}.png`, alt: '' }), v)),
              h('span.st', '🎒', hero.encumbrance)),
            h('div', { style: 'margin-top:4px' }, `Equipo: ${trappings} · Habilidad: ${skills} · ${PROF[hero.proficiency]}`)),
          h('h2', 'Aventura'),
          h('div.packs', h('div.pack' + (!this.cfg.campaign ? '.on' : ''), { onclick: () => { this.cfg.campaign = null; sound.flip(); this.render(); } },
            h('div.kind', 'JUEGO BASE'), h('div.tg'), h('b', 'Mazmorra original'), h('em', 'Reglamento 2.x'), h('p', 'Cinco niveles, ocho turnos por nivel. El jefe final lo decide la debilidad más común de los enemigos que derrotes.')), camps.map(packEl)),
          h('h2', 'Expansiones modulares'),
          h('div.packs', mods.map(packEl)),
          h('div.small', `Cartas aún no incluidas en este repositorio: ${this.info.missing.join(', ')}.`),
          h('div.small', 'Juego en solitario de Jason Glover · Grey Gnome Games. Adaptación digital no oficial para uso personal.')),
        h('div.foot', save ? h('button.seal.gold', { onclick: () => { sound.unlock(); app.continueGame(); } }, 'CONTINUAR', h('br'), 'PARTIDA') : null,
          h('button.seal.pulse', { style: 'min-width:130px;height:130px;font-size:20px', onclick: () => { sound.unlock(); sound.gong(); app.startGame({ heroId: this.heroId, config: { ...this.cfg, modules: [...this.cfg.modules] } }); } }, 'COMENZAR', h('br'), 'AVENTURA'))));
    void byName;
  }
  toggle(p) {
    sound.unlock(); sound.flip();
    if (p.type === 'campaign') this.cfg.campaign = this.cfg.campaign === p.id ? null : p.id;
    else { const i = this.cfg.modules.indexOf(p.id); if (i >= 0) this.cfg.modules.splice(i, 1); else this.cfg.modules.push(p.id); }
    this.app.savePrefs({ ...this.cfg, heroId: this.heroId });
    this.render();
  }
}
