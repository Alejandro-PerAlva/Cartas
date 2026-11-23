/**
 * Menú principal: héroe y aventura en dos paneles (pestañas en móvil), todo actualizado EN SITIO
 * (elegir una expansión no reconstruye la pantalla ni mueve el scroll) y ficha informativa de cada expansión.
 */
import { h } from './dom.js';
import * as E from '../engine/index.js';
import { buildCatalog, listPacks, buildCustomHeroPreview } from '../engine/index.js';
import { sound } from './audio.js';
import { cardPath } from './cards.js';
import { icon } from './icons.js';
import { Builder } from './builder.js';
import { manualBody } from './manual.js';

const PROF = { agilidad: 'Agilidad', mente: 'Mente', fuerza: 'Fuerza' };
const COUNT_LABEL = {
  heroes: ['héroe', 'héroes'], bosses: ['jefe', 'jefes'], enemies: ['enemigo', 'enemigos'], items: ['objeto', 'objetos'], plots: ['trama', 'tramas'], skills: ['habilidad', 'habilidades'],
  environments: ['entorno', 'entornos'], artifacts: ['artefacto', 'artefactos'], mercenaries: ['esbirro', 'esbirros'], adventures: ['mapa de encuentros', 'mapas de encuentros'],
  dungeonCards: ['carta de mazmorra', 'cartas de mazmorra'], afflictions: ['aflicción', 'aflicciones'],
};
const countLabel = (k, n) => { const l = COUNT_LABEL[k] || [k, k]; return n === 1 ? l[0] : l[1]; };

export class Menu {
  constructor(app, root) {
    this.app = app; this.root = root;
    const saved = app.loadPrefs();
    this.cfg = { campaign: saved.campaign || null, modules: saved.modules || [], variants: saved.variants || {} };
    this.heroId = saved.heroId || 'c1'; this.tab = 'hero'; this.custom = saved.custom || null; this.customPreview = null;
    this.info = listPacks(); this.variants = E.listVariants?.() || [];
    this.build();
  }
  get packs() { return this.info.packs; }
  catalog() { return buildCatalog(this.cfg); }

  /* ================================================================ construcción (una sola vez) */
  build() {
    const app = this.app; const save = app.hasSave();
    this.heroCol = h('section.menu-col.hero-col'); this.advCol = h('section.menu-col.adv-col');
    this.tabsEl = h('div.menu-tabs', ...[['hero', 'Héroe'], ['adv', 'Aventura']].map(([id, t]) => h('button.tab' + (id === this.tab ? '.on' : ''), { dataset: { tab: id }, onclick: () => { sound.tap(); this.tab = id; this.syncTabs(); } }, t)));
    this.summary = h('div.menu-summary');
    this.body = h('div.menu-body', this.heroCol, this.advCol);
    const stats = app._json('ironhelm.scores.v2', null);
    this.menuEl = h('div.menu',
      h('div.torch.l'), h('div.torch.r'),
      h('div.menu-head', h('h1', 'IRON HELM'), h('p', 'Un último botín antes de colgar la espada…'),
        stats?.games ? h('small', `Partidas: ${stats.games} · victorias: ${stats.wins} · mejor fondo de jubilación: ${stats.best}`) : null),
      this.tabsEl, this.body,
      h('div.menu-foot', this.summary, h('div.menu-btns',
        h('button.btn.quiet', { onclick: () => { sound.tap(); this.showManual(this.cfg.modules.includes('anemia') ? 'anemia' : 'original'); } }, 'MANUAL'),
        save ? h('button.btn', { onclick: () => { sound.unlock(); app.continueGame(); } }, 'CONTINUAR PARTIDA') : null,
        h('button.btn.primary.big', { onclick: () => this.start() }, 'COMENZAR AVENTURA'))));
    this.root.append(this.menuEl);
    this.buildAdventure();
    this.renderHero();
    this.syncTabs();
  }
  /** aviso dentro del menú (la partida aún no existe, así que no hay #toast de juego) */
  menuToast(msg) { this.menuEl?.querySelector('.menu-note-err')?.remove(); const el = h('div.menu-note-err', msg); this.menuEl?.append(el); setTimeout(() => el.remove(), 4500); }
  syncTabs() { this.tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === this.tab)); this.menuEl.dataset.tab = this.tab; }
  start() {
    sound.unlock(); sound.gong();
    const config = { ...this.cfg, modules: [...this.cfg.modules] }; if (this.heroId === 'custom') config.custom = { ...this.custom };
    config.variants = this.activeVariants(); if (!Object.keys(config.variants).length) delete config.variants;
    try { this.app.startGame({ heroId: this.heroId, config }); } catch (e) { console.error(e); sound.error(); this.menuToast(e.message || 'No se pudo empezar la partida.'); }
  }

  /* ================================================================ aventura y expansiones */
  buildAdventure() {
    const camps = this.packs.filter((p) => p.type === 'campaign'); const mods = this.packs.filter((p) => p.type === 'module'); const modes = this.packs.filter((p) => p.type === 'mode');
    const row = (p, kind) => {
      const el = h('div.opt.' + kind, { dataset: { id: p?.id || 'base' } },
        h('div.opt-mark'),
        h('div.opt-main', h('b', p ? p.es : 'Mazmorra original'), h('small', p ? this.sub(p) : 'Juego base · cinco niveles de ocho turnos. El jefe lo decide la debilidad más común de los enemigos que derrotes.')),
        h('button.opt-info', { title: p ? 'Qué incluye' : 'Cómo se juega', 'aria-label': p ? `Qué incluye ${p.es}` : 'Cómo se juega la mazmorra original', onclick: (e) => { e.stopPropagation(); sound.tap(); this.showPackInfo(p || this.basePack()); } }, icon('info', 22)));
      el.addEventListener('click', () => { sound.flip(); if (!p) this.cfg.campaign = null; else this.toggle(p); this.afterChange(); });
      return el;
    };
    this.advCol.append(
      h('h2', 'Aventura'), h('p.col-hint', 'Elige la mazmorra donde se desarrollará tu partida.'),
      h('div.opts', row(null, 'radio'), ...camps.map((p) => row(p, 'radio'))),
      h('h2', 'Expansiones modulares'), h('p.col-hint', 'Se pueden combinar con cualquier aventura. La mayoría aumenta la dificultad.'),
      h('div.opts', ...mods.map((p) => row(p, 'check'))),
      modes.length ? [h('h2', 'Modos fanmade'), h('p.col-hint', 'Contenido no oficial hecho por la comunidad. Se combina con cualquier aventura.'), h('div.opts', ...modes.map((p) => row(p, 'check')))] : null,
      this.variants.length ? [h('h2', 'Reglas variantes'), h('p.col-hint', 'Opcionales y independientes: actívalas a tu gusto para cambiar el reto o el tono de la partida.'), this.variantsBox = h('div.opts')] : null,
      this.info.missing?.length ? h('p.col-note', `Sin cartas en el repositorio todavía: ${this.info.missing.join(', ')}.`) : null,
      h('p.col-note', 'Juego en solitario de Jason Glover · Grey Gnome Games. Adaptación digital no oficial para uso personal.'));
    this.renderVariants(); this.updateOpts();
  }
  /** reglas variantes: interruptores independientes (algunas necesitan un modo, un módulo, o excluyen a otra) */
  packOn(id) { return !!id && (this.cfg.modules.includes(id) || this.cfg.campaign === id); }
  /** por qué una regla no se puede activar ahora (o null si se puede) */
  variantLock(v) {
    if (v.needsPack && !this.packOn(v.needsPack)) return `Requiere ${this.packs.find((p) => p.id === v.needsPack)?.es || v.needsPack}`;
    const miss = (v.needsModules || []).filter((m) => !this.packOn(m));
    if (miss.length) return `Requiere ${miss.map((m) => this.packs.find((p) => p.id === m)?.es || m).join(', ')}`;
    return null;
  }
  activeVariants() { const out = {}; for (const v of this.variants) if (this.cfg.variants[v.id] && !this.variantLock(v)) out[v.id] = true; return out; }
  /** héroe que fija una regla activa (Metal Inmortal → Gene Slash) */
  forcedHero() { const v = this.variants.find((x) => x.forcesHero && this.activeVariants()[x.id]); return v?.forcesHero || null; }
  renderVariants() {
    if (!this.variantsBox) return;
    const out = []; let group = null;
    for (const v of this.variants) {
      if (v.group !== group) { group = v.group; out.push(h('h3.var-group', v.groupName || v.group || '')); }
      const lock = this.variantLock(v);
      const el = h('div.opt.check', { dataset: { variant: v.id } }, h('div.opt-mark'),
        h('div.opt-main', h('b', v.name), h('small', v.blurb || ''), h('small.need', lock || '')),
        v.rules?.length ? h('button.opt-info', { title: 'Cómo funciona', 'aria-label': `Cómo funciona ${v.name}`, onclick: (e) => { e.stopPropagation(); sound.tap(); this.showVariantInfo(v); } }, icon('info', 22)) : null);
      el.addEventListener('click', () => {
        const why = this.variantLock(v); if (why) { sound.error(); this.app.toast(`${why}: actívalo en la lista de expansiones.`); return; }
        sound.flip(); const on = !this.cfg.variants[v.id]; this.cfg.variants[v.id] = on;
        if (on) for (const o of v.exclusive || []) if (this.cfg.variants[o]) { this.cfg.variants[o] = false; this.app.toast(`«${v.name}» es incompatible con «${this.variants.find((x) => x.id === o)?.name || o}»: la desactivo.`); }
        if (on && v.forcesHero) this.heroId = v.forcesHero;
        this.afterChange();
      });
      out.push(el);
    }
    this.variantsBox.replaceChildren(...out);
  }
  showVariantInfo(v) {
    const el = h('div.modal', h('div.veil', { onclick: () => el.remove() }), h('div.sheet.scroll.wide', h('h2', v.name), v.blurb ? h('p.narr', v.blurb) : null,
      h('ul.rules', ...(v.rules || []).map((r) => h('li', r))), h('button.close-x', { onclick: () => el.remove(), 'aria-label': 'Cerrar' }, icon('x', 18))));
    this.menuEl.append(el);
  }
  sub(p) {
    if (p.type === 'base') return 'Juego base · cinco niveles de ocho turnos';
    const bits = [p.type === 'campaign' ? `Campaña · nivel de aventura ${p.adventureLevel ?? '?'}` : p.type === 'mode' ? 'Modo fanmade' : 'Módulo'];
    if (p.name && p.name !== p.es) bits.push(p.name);
    return bits.join(' · ');
  }
  toggle(p) {
    if (p.type === 'campaign') this.cfg.campaign = this.cfg.campaign === p.id ? null : p.id;
    else {
      const i = this.cfg.modules.indexOf(p.id);
      if (i >= 0) this.cfg.modules.splice(i, 1);
      else {
        // los módulos exclusivos (mazo de mazmorra alternativo) se excluyen entre sí
        if (p.exclusive) for (const o of this.packs) if (o.type === 'module' && o.exclusive === p.exclusive) { const j = this.cfg.modules.indexOf(o.id); if (j >= 0) this.cfg.modules.splice(j, 1); }
        this.cfg.modules.push(p.id);
      }
    }
  }
  afterChange() {
    this.app.savePrefs({ ...this.cfg, heroId: this.heroId, custom: this.custom });
    this.renderVariants(); this.updateOpts(); this.renderHero({ keepScroll: true });
  }
  updateOpts() {
    this.advCol.querySelectorAll('.opt[data-variant]').forEach((el) => {
      const v = this.variants.find((x) => x.id === el.dataset.variant); const locked = !!this.variantLock(v);
      el.classList.toggle('on', !!this.cfg.variants[v.id] && !locked); el.classList.toggle('locked', locked);
    });
    this.advCol.querySelectorAll('.opt[data-id]').forEach((el) => {
      const id = el.dataset.id; const p = this.packs.find((x) => x.id === id);
      const on = id === 'base' ? !this.cfg.campaign : p.type === 'campaign' ? this.cfg.campaign === id : this.cfg.modules.includes(id)
        || (this.cfg.campaign && this.packs.find((x) => x.id === this.cfg.campaign)?.includes?.includes(id));
      el.classList.toggle('on', !!on);
    });
  }

  /* ================================================================ héroe */
  gnomeOn() { return this.cfg.modules.includes('gnome'); }
  builderButton() {
    if (!this.gnomeOn()) return null;
    const c = this.custom;
    return h('div.builder-cta', h('div', h('b', 'Gnome Pack · crea tu propio héroe'), h('small', c ? `${c.race} ${c.klass} ${c.sign}` : 'Elige raza, clase y signo astral')),
      h('button.btn' + (this.heroId === 'custom' ? '.primary' : ''), { onclick: () => { sound.flip(); new Builder(this, this.custom || {}).open(); } }, c ? 'EDITAR HÉROE' : 'CREAR HÉROE'));
  }
  useCustom(sel, preview) { this.custom = sel; this.customPreview = preview; this.heroId = 'custom'; this.afterChange(); }
  renderHero({ keepScroll = false } = {}) {
    const cat = this.catalog(); const heroes = cat.pools.heroes;
    const forced = this.forcedHero(); if (forced && heroes.some((x) => x.id === forced)) this.heroId = forced;
    if (this.heroId === 'custom' && !(this.gnomeOn() && this.custom)) this.heroId = heroes[0].id;
    if (this.heroId !== 'custom' && !heroes.some((x) => x.id === this.heroId)) this.heroId = heroes[0].id;
    let hero = heroes.find((x) => x.id === this.heroId);
    if (this.heroId === 'custom') {
      const pv = buildCustomHeroPreview(this.custom); this.customPreview = pv;
      const race = listPacks().gnome.races.find((r) => r.name === this.custom.race);
      hero = { id: 'custom', name: pv.name || 'Héroe a medida', img: race?.img || heroes[0].img, health: pv.health, energy: pv.energy, encumbrance: pv.encumbrance, rations: pv.rations, gold: pv.gold,
        trappings: [], skills: [], proficiency: pv.proficiency, pack: 'gnome', _eq: pv.equipment?.map((e) => e.name), _sk: pv.skills?.map((s) => s.name), text: pv.raceAbility };
    }
    const old = this.heroCol.querySelector('.heroes'); const sl = old ? old.scrollLeft : 0;
    const name = (id) => cat.def(id)?.name || id;
    const trappings = hero._eq || (hero.trappings || []).map(name); const skills = hero._sk || (hero.skills || []).map(name);
    const pk = hero.pack !== 'base' ? this.packs.find((p) => p.id === hero.pack) : null;
    const stage = h('div.hero-stage',
      h('div.hero-card', h('img', { src: cardPath(hero.img), alt: hero.name })),
      h('div.hero-info', h('div.hero-name', hero.name), pk ? h('div.hero-pack', pk.es) : null,
        h('div.hero-stats', ...[['health', hero.health, 'Salud'], ['energy', hero.energy, 'Energía'], ['ration', hero.rations, 'Raciones'], ['gold', hero.gold, 'Oro']].map(([k, v, t]) => h('span.st', { title: t }, h('img', { src: `assets/tokens/tk_${k}.png`, alt: t }), String(v))),
          h('span.st', { title: 'Carga' }, icon('weight', 22), String(hero.encumbrance))),
        h('dl', h('dt', 'Equipo inicial'), h('dd', trappings.length ? trappings.join(' · ') : 'Ninguno'), h('dt', 'Habilidad'), h('dd', skills.length ? skills.join(' · ') : 'Ninguna'), h('dt', 'Competencia'), h('dd', PROF[hero.proficiency] || '—')),
        hero.text ? h('p.hero-text', hero.text) : null));
    const strip = h('div.heroes', [...heroes.filter((x) => !forced || x.id === forced), ...(this.heroId === 'custom' ? [{ id: 'custom', name: hero.name, img: hero.img }] : [])].map((x) => h('button.hero-pick' + (x.id === this.heroId ? '.on' : ''), { title: x.name, onclick: () => { sound.flip(); this.heroId = x.id; this.app.savePrefs({ ...this.cfg, heroId: x.id }); this.renderHero({ keepScroll: true }); } },
      h('img', { src: cardPath(x.img), alt: x.name }))));
    this.heroCol.replaceChildren(...[h('h2', 'Tu héroe'), stage, h('div.heroes-wrap', strip), forced ? h('p.col-note', `La regla «${this.variants.find((x) => x.forcesHero)?.name}» fija a este personaje.`) : null, this.builderButton?.()].filter(Boolean));
    strip.scrollLeft = keepScroll ? sl : 0;
    const on = strip.querySelector('.on'); if (on && !keepScroll) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    this.updateSummary(cat, hero);
  }
  updateSummary(cat = this.catalog(), hero = cat.pools.heroes.find((x) => x.id === this.heroId)) {
    const camp = this.cfg.campaign ? this.packs.find((p) => p.id === this.cfg.campaign)?.es : 'Mazmorra original';
    const mods = this.cfg.modules.map((id) => this.packs.find((p) => p.id === id)?.es).filter(Boolean); const nv = Object.keys(this.activeVariants()).length;
    this.summary.replaceChildren(h('b', hero.name), ' · ', camp, mods.length ? ` · ${mods.length} módulo${mods.length > 1 ? 's' : ''}` : '', nv ? ` · ${nv} regla${nv > 1 ? 's' : ''} variante${nv > 1 ? 's' : ''}` : '');
  }

  /* ================================================================ ficha de una expansión */
  /** ficha de la mazmorra original, con el mismo formato que la de cada expansión */
  basePack() {
    if (this._basePack) return this._basePack;
    const cat = buildCatalog({}); const P = cat.pools; const n = (l) => (l || []).reduce((t, d) => t + (d.copies || 1), 0);
    const counts = { heroes: n(P.heroes), bosses: n(P.bosses), enemies: n(P.enemies), items: n(P.loot) + n(P.potions) + n(P.trappings), plots: n(P.plots), skills: n(P.skills), dungeonCards: n(P.dungeon) };
    const keyCards = []; const kc = (d, kind) => { if (d && keyCards.length < 8 && !keyCards.some((k) => k.img === d.img)) keyCards.push({ img: d.img, name: d.name, kind }); };
    kc(P.bosses[0], 'boss'); P.heroes.forEach((d) => kc(d, 'hero'));
    for (let r = 0; r < 3; r++) for (const l of [P.enemies, P.plots, P.loot, P.dungeon, P.skills]) kc((l || [])[r], 'card');
    this._basePack = { id: 'base', es: 'Mazmorra original', type: 'base', counts, keyCards,
      blurb: 'El juego base de Iron Helm: un aventurero veterano busca un último botín antes de colgar la espada. No necesita expansiones.',
      rules: ['Cinco niveles de ocho turnos cada uno; al acabar cada nivel se resuelve una trama.', 'El jefe final lo decide la debilidad más común de los enemigos que derrotes (fuego, hielo o no muerto).',
        'Cinco héroes, tres jefes y los mazos de enemigos, botín, pociones, equipo, habilidades y tramas del juego base.', 'Se puede combinar con cualquier expansión modular y con las reglas variantes.'] };
    return this._basePack;
  }
  showPackInfo(p) {
    const base = p.type === 'base';
    const on = () => (base ? !this.cfg.campaign : p.type === 'campaign' ? this.cfg.campaign === p.id : this.cfg.modules.includes(p.id));
    const counts = Object.entries(p.counts || {}).filter(([, n]) => n > 0).map(([k, n]) => h('span.chip', h('b', String(n)), ' ', countLabel(k, n)));
    const key = (p.keyCards || []).map((c) => h('button.thumb', { title: c.name, onclick: () => this.zoom(c.img) }, h('img', { src: cardPath(c.img), alt: c.name })));
    const toggle = h('button.btn.primary', { onclick: () => { sound.flip(); if (base) this.cfg.campaign = null; else this.toggle(p); this.afterChange(); sync(); } });
    const sync = () => { toggle.textContent = base ? (on() ? 'AVENTURA ELEGIDA' : 'ELEGIR ESTA AVENTURA') : on() ? 'QUITAR DE LA PARTIDA' : p.type === 'campaign' ? 'ELEGIR ESTA CAMPAÑA' : 'AÑADIR A LA PARTIDA'; };
    sync();
    const el = h('div.modal', h('div.veil', { onclick: () => el.remove() }),
      h('div.sheet.scroll.wide', h('h2', p.es), h('div.pack-sub', this.sub(p)), p.blurb ? h('p.narr', p.blurb) : null,
        counts.length ? h('div.chips-row', ...counts) : null,
        p.rules?.length ? [h('h4', base ? 'Qué incluye' : 'Cómo cambia la partida'), h('ul.rules', ...p.rules.map((r) => h('li', r)))] : null,
        p.includes?.length ? h('p.col-note', `Incluye también: ${p.includes.map((id) => this.packs.find((x) => x.id === id)?.es || id).join(', ')}.`) : null,
        p.exclusive ? h('p.col-note', 'Sustituye al mazo de mazmorra original: no se puede combinar con otro mazo alternativo.') : null,
        key.length ? [h('h4', 'Cartas destacadas'), h('div.thumbs', ...key)] : null,
        h('div.btnrow', toggle, base || p.id === 'anemia' ? h('button.btn', { onclick: () => { sound.tap(); el.remove(); this.showManual(base ? 'original' : 'anemia'); } }, 'MANUAL') : null),
        h('button.close-x', { onclick: () => el.remove(), 'aria-label': 'Cerrar' }, icon('x', 18))));
    this.menuEl.append(el);
  }
  /** manual de instrucciones (juego original, Anemia y controles) */
  showManual(tab = 'original') {
    const el = h('div.modal', h('div.veil', { onclick: () => el.remove() }),
      h('div.sheet.scroll.wide.manual-sheet', h('h2', 'Manual de instrucciones'), manualBody({ tab }),
        h('button.close-x', { onclick: () => el.remove(), 'aria-label': 'Cerrar' }, icon('x', 18))));
    this.menuEl.append(el);
  }
  zoom(img) {
    const el = h('div.modal.zoom', { onclick: () => el.remove() }, h('div.veil.dark'), h('img', { src: cardPath(img), alt: '' }));
    this.menuEl.append(el);
  }
}
