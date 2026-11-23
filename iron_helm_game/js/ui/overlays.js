/**
 * Superposiciones: escenas de decisión, selección de cartas, mercader, bazar inicial, diario, ajustes, inspector.
 * Las ligadas a una petición del motor (choice, pickCards, merchant…) se cierran solas al resolverse.
 */
import { h, $, sleep, animate, speed, coinImg, WK, WK_ICON } from './dom.js';
import { cardEl, backOf, cardPath } from './cards.js';
import { sound } from './audio.js';
import { ZONES } from './layout.js';

const WEAK = { fire: '🔥 Fuego', ice: '❄️ Hielo', undead: '💀 No muerto' };

export class Overlays {
  constructor(app, root) {
    this.app = app; this.root = root;
    this.prompt = null; this.user = null; this.inspecting = null;
  }
  get g() { return this.app.game; }

  /* ----------------------------------------------------------------- gestión */
  clearPrompt() { this.prompt?.remove(); this.prompt = null; }
  clearUser() { this.user?.remove(); this.user = null; this.userKind = null; }
  mountPrompt(el) { this.clearPrompt(); this.prompt = el; this.root.append(el); }
  mountUser(el, kind) { this.clearUser(); this.user = el; this.userKind = kind; this.root.append(el); sound.page(); }
  get busyModal() { return !!this.prompt; }

  /* ----------------------------------------------------------------- elementos comunes */
  faceCard(uidOrImg, { cls = '' } = {}) {
    const g = this.g; const isUid = typeof uidOrImg === 'number';
    const src = isUid ? g.img(uidOrImg) : uidOrImg;
    const back = isUid ? backOf(g.def(uidOrImg)) : backOf(null);
    return cardEl({ front: src, back, up: true, cls });
  }
  sceneCard(src) { return h('div.scene-card', this.faceCard(src)); }
  closeBtn(fn) { return h('button.close-x', { 'aria-label': 'Cerrar', onclick: () => { sound.click(); fn(); } }, '✕'); }

  /* ----------------------------------------------------------------- elección (altar, campamento, tramas…) */
  showChoice(pr) {
    const g = this.g; const src = pr.source ?? g.s.ctx.plotUid ?? g.s.ctx.cardUid ?? null;
    const opts = pr.options.map((o, i) => h('button.plaque' + (o.disabled ? '.off' : ''), { 'data-n': i + 1, onclick: () => { if (o.disabled) { sound.error(); this.app.toast(o.reason || 'No disponible'); return; } sound.click(); this.app.act('choose', { id: o.id }); } },
      h('b', o.label), o.text ? h('span', o.text) : null, o.disabled ? h('small', o.reason || 'No disponible') : null));
    const scroll = h('div.scroll', h('h2', pr.title || ''), pr.text ? h('div.narr', pr.text) : null, ...opts);
    const el = h('div', h('div.veil'), h('div.scene', typeof src === 'number' ? this.sceneCard(src) : null, scroll));
    el.style.position = 'absolute'; el.style.inset = '0';
    this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- selección de cartas */
  showPick(pr) {
    const g = this.g; const sel = new Set();
    const need = pr.min === pr.max ? `Elige ${pr.min}` : pr.min === 0 ? `Elige hasta ${pr.max}` : `Elige entre ${pr.min} y ${pr.max}`;
    const seal = h('button.seal.gold.off', { onclick: () => confirm() }, 'ELEGIR');
    const n = pr.uids.length; const cw = n <= 2 ? 'min(34vw, 52vh)' : n <= 4 ? 'min(22vw, 44vh)' : n <= 8 ? 'min(15vw, 34vh)' : 'min(11vw, 26vh)';
    const row = h('div.pickrow', { style: `--pcw:${cw}` });
    const refresh = () => { const ok = sel.size >= pr.min && sel.size <= pr.max; seal.classList.toggle('off', !ok); seal.classList.toggle('pulse', ok); row.querySelectorAll('.pc').forEach((p) => p.classList.toggle('sel', sel.has(+p.dataset.uid))); };
    const confirm = () => { if (seal.classList.contains('off')) return; sound.click(); this.app.act('pickCards', { uids: [...sel] }); };
    for (const uid of pr.uids) {
      const d = g.def(uid);
      const pc = h('div.pc', { dataset: { uid }, onclick: () => {
        if (pr.max === 1) { if (sel.has(uid)) { confirm(); return; } sel.clear(); sel.add(uid); } else if (sel.has(uid)) sel.delete(uid); else if (sel.size < pr.max) sel.add(uid);
        sound.tap(); refresh();
      }, oncontextmenu: (e) => { e.preventDefault(); this.inspect({ uid }); } }, this.faceCard(uid),
        d.price != null && d.kind === 'item' ? h('div.price', String(d.price), coinImg(), ` · ⚖ ${d.weight}`) : null);
      row.append(pc);
    }
    const hint = pr.max === 1 && pr.uids.length > 1 ? 'Toca una carta para elegirla (tócala otra vez para confirmar)' : '';
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil'), h('div.pick-title', pr.title || need), h('div.pick-title', { style: `top:calc(110px + var(--sai-t));font:italic 500 18px var(--font-body);color:var(--parch)` }, hint || need), row,
      h('div.pick-foot', pr.min === 0 ? h('button.seal.sm', { onclick: () => this.app.act('pickCards', { uids: [] }) }, 'NINGUNA') : null, seal));
    this.mountPrompt(el); refresh();
  }

  /* ----------------------------------------------------------------- mercader */
  showMerchant(pr) {
    const g = this.g; let selected = null;
    const gold = () => g.s.hero.gold;
    const bazaar = h('div.pickrow', { style: 'position:static;transform:none;justify-content:center;margin-top:10px' });
    const mine = h('div.pickrow', { style: 'position:static;transform:none;justify-content:center;margin-top:6px;max-height:34vh' });
    const bar = h('div', { style: 'text-align:center;min-height:90px;margin-top:10px' });
    const rebuild = () => {
      bazaar.innerHTML = ''; mine.innerHTML = ''; bar.innerHTML = '';
      for (const uid of g.s.ctx.stock || []) {
        const p = g.buyPrice(uid);
        const pc = h('div.pc' + (selected?.uid === uid && selected.mode === 'buy' ? '.sel' : ''), { onclick: () => { sound.tap(); selected = { uid, mode: 'buy' }; rebuild(); } }, this.faceCard(uid), h('div.price', String(p), coinImg()));
        if (p > gold()) pc.style.filter = 'grayscale(.6) brightness(.8)';
        bazaar.append(pc);
      }
      if (!(g.s.ctx.stock || []).length) bazaar.append(h('div', { style: 'font-style:italic;color:#cdb58a;padding:30px' }, 'El bazar está vacío.'));
      for (const uid of g.allItems()) {
        const d = g.def(uid);
        const pc = h('div.pc' + (selected?.uid === uid && selected.mode === 'sell' ? '.sel' : ''), { style: 'width:clamp(80px,10vw,120px)', onclick: () => { sound.tap(); selected = { uid, mode: 'sell' }; rebuild(); } }, this.faceCard(uid), h('div.price', { style: 'font-size:14px' }, `+${g.sellPrice()}`, coinImg()));
        if (d.fx?.cursed) pc.style.filter = 'grayscale(1)';
        mine.append(pc);
      }
      if (selected) {
        const d = g.def(selected.uid);
        const emerald = g.equippedUid('L29');
        bar.append(h('div', { style: 'font:700 20px var(--font-title);color:var(--gold2);margin-bottom:6px' }, d.name),
          selected.mode === 'buy' ? h('button.seal.gold' + (g.buyPrice(selected.uid) > gold() ? '.off' : ''), { onclick: () => { sound.coin(); this.app.act('merchantBuy', { uid: selected.uid }); selected = null; } }, 'COMPRAR', h('br'), String(g.buyPrice(selected.uid)), coinImg())
            : h('button.seal.green', { onclick: () => { sound.coin(); this.app.act('merchantSell', { uid: selected.uid }); selected = null; } }, 'VENDER', h('br'), `+${g.sellPrice()}`, coinImg()),
          selected.mode === 'buy' && emerald ? h('button.seal.sm', { style: 'margin-left:12px', onclick: () => { this.app.act('merchantEmerald', { uid: selected.uid }); selected = null; } }, 'ESMERALDA') : null,
          h('button.seal.sm', { style: 'margin-left:12px', onclick: () => this.inspect({ uid: selected.uid }) }, 'VER'));
      } else bar.append(h('div', { style: 'font-style:italic;color:#cdb58a' }, 'Toca una carta del bazar para comprarla o una de las tuyas para venderla.'));
    };
    const wrap = h('div', { style: 'position:absolute;inset:0;overflow:auto;touch-action:pan-y;padding:calc(64px + var(--sai-t)) 14px 100px' }, h('div.veil', { style: 'position:fixed' }),
      h('div', { style: 'position:relative;max-width:1100px;margin:0 auto;text-align:center' },
        h('div', { style: 'font:900 34px var(--font-title);color:var(--gold2);text-shadow:0 3px 6px #000' }, 'EL MERCADER'),
        h('div', { style: 'font-style:italic;color:var(--parch)' }, h('span', `Tienes ${gold()} `, coinImg(), ` · Vendes cada objeto por ${g.sellPrice()} `, coinImg())),
        h('div', { style: 'font:700 16px var(--font-title);color:var(--gold);margin-top:14px;letter-spacing:.15em' }, 'BAZAR'), bazaar,
        bar,
        h('div', { style: 'font:700 16px var(--font-title);color:var(--gold);margin-top:14px;letter-spacing:.15em' }, 'TU EQUIPO'), mine),
      h('div.pick-foot', { style: 'position:fixed' }, h('button.seal.pulse', { onclick: () => { sound.click(); this.app.act('leaveMerchant'); } }, 'SALIR')));
    rebuild(); this.mountPrompt(wrap);
  }

  /* ----------------------------------------------------------------- sobrecarga */
  showOverweight(pr) {
    const g = this.g; let selected = null;
    const row = h('div.pickrow'); const bar = h('div', { style: 'position:absolute;left:0;right:0;bottom:calc(24px + var(--sai-b));display:flex;justify-content:center;gap:16px' });
    const rebuild = () => {
      row.innerHTML = ''; bar.innerHTML = '';
      for (const uid of g.allItems()) { const d = g.def(uid); row.append(h('div.pc' + (selected === uid ? '.sel' : ''), { onclick: () => { sound.tap(); selected = uid; rebuild(); } }, this.faceCard(uid), h('div.price', `⚖ ${g.weightOf(uid)}`))); void d; }
      bar.append(h('button.seal' + (selected ? '' : '.off'), { onclick: () => { if (selected) { sound.click(); this.app.act('dropOver', { uid: selected }); } } }, 'SOLTAR'));
    };
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil'),
      h('div.pick-title', 'Vas demasiado cargado'), h('div.pick-title', { style: 'top:calc(110px + var(--sai-t));font:italic 500 19px var(--font-body);color:var(--parch)' }, `Llevas ${g.weight()} de carga y tu límite es ${g.maxWeight()}. Suelta ${pr.need} o más de peso para continuar.`), row, bar);
    rebuild(); this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- evitar encuentro */
  showAvoidCard(pr) {
    const g = this.g;
    const opts = pr.options.map((o, i) => h('button.plaque', { 'data-n': i + 1, onclick: () => { sound.click(); this.app.act('avoidCard', { id: o.id }); } }, h('b', o.label), h('span', o.text)));
    opts.push(h('button.plaque', { 'data-n': '⚔', onclick: () => { sound.click(); this.app.act('avoidCard', { id: 'fight' }); } }, h('b', 'Enfrentarte'), h('span', 'Roba un enemigo y combate.')));
    const scroll = h('div.scroll', h('h2', g.def(pr.uid).name), h('div.narr', '¿Puedes evitar este encuentro?'), ...opts);
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil'), h('div.scene', this.sceneCard(pr.uid), scroll));
    this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- bazar de equipo inicial / compra de equipo */
  showShop() {
    const g = this.g; const inSetup = g.s.prompt?.type === 'setup';
    const row = h('div.pickrow', { style: 'top:46%;max-height:62vh' }); let selected = null; const bar = h('div.pick-foot');
    const rebuild = () => {
      row.innerHTML = ''; bar.innerHTML = '';
      for (const uid of g.s.z.trappings) {
        const d = g.def(uid); const can = d.price <= g.s.hero.gold;
        row.append(h('div.pc' + (selected === d.id ? '.sel' : ''), { style: can ? '' : 'filter:grayscale(.7) brightness(.8)', onclick: () => { sound.tap(); selected = d.id; rebuild(); } }, this.faceCard(uid), h('div.price', String(d.price), coinImg(), ` · ⚖ ${d.weight}`)));
      }
      const d = selected ? g.cat.def(selected) : null;
      if (d) bar.append(h('button.seal.gold' + (inSetup && d.price <= g.s.hero.gold ? '' : '.off'), { onclick: async () => { sound.coin(); await this.app.act('buy', { id: d.id }); selected = null; if (this.userKind === 'shop') this.showShop(); } }, 'COMPRAR', h('br'), String(d.price), coinImg()));
      bar.append(h('button.seal.sm', { onclick: () => this.clearUser() }, 'CERRAR'));
    };
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil'), h('div.pick-title', 'EQUIPO DE LA POSADA'),
      h('div.pick-title', { style: 'top:calc(108px + var(--sai-t));font:italic 500 19px var(--font-body);color:var(--parch)' }, inSetup ? h('span', `Gasta tu oro inicial en más equipo (tienes ${g.s.hero.gold} `, coinImg(), ').') : 'Estas son las cartas de equipo que quedan. Solo se compran antes de entrar en la mazmorra.'), row, bar);
    rebuild(); this.mountUser(el, 'shop');
  }

  /* ----------------------------------------------------------------- visita divina */
  showDivine(pr) {
    const faces = pr.faces; const items = faces.map((f) => h('div', { style: 'width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font:900 34px var(--font-title);color:#fff;text-shadow:0 2px 4px #000;border:3px solid #fff8;box-shadow:0 0 30px #ffe9a8, inset 0 0 20px rgba(255,255,255,.4);background:' + (f.k === 'hp' ? 'radial-gradient(circle at 35% 30%,#ff8a7a,#a1241a)' : f.k === 'en' ? 'radial-gradient(circle at 35% 30%,#d9a0ff,#6a2a9a)' : 'radial-gradient(circle at 35% 30%,#9be39f,#2f7a3a)') + ';animation:rise .6s both' }, f.k === 'hp' ? `❤${f.n}` : f.k === 'en' ? `⚡${f.n}` : '✚'));
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil.light'),
      h('div', { style: 'position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;padding:0 20px' },
        h('div', { style: 'font:900 42px var(--font-title);color:#ffe9a8;text-shadow:0 0 30px #ffb23a, 0 4px 8px #000;letter-spacing:.1em' }, 'VISITA DIVINA'),
        h('div', { style: 'font-style:italic;font-size:21px;margin:8px 0 22px;color:var(--parch)' }, 'Un ser angelical te visita antes del combate final…'),
        h('div', { style: 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;max-width:700px;margin:0 auto' }, items.length ? items : h('div', { style: 'color:#cdb58a' }, 'No tienes fichas de bendición.')),
        h('div', { style: 'margin:22px 0;font:700 22px var(--font-title);color:var(--gold2)' }, pr.hp || pr.en || pr.cure ? `${pr.hp ? `+${pr.hp} salud  ` : ''}${pr.en ? `+${pr.en} energía  ` : ''}${pr.cure ? '· sin veneno' : ''}` : ''),
        h('button.seal.pulse', { onclick: () => { sound.click(); this.app.act('ack'); } }, 'AL COMBATE')));
    this.mountPrompt(el); sound.bless();
  }

  /* ----------------------------------------------------------------- inspector de cartas */
  /** inspect({uid}) o inspect({img, title, text}); actions: [{label, cls, fn}] */
  inspect({ uid = null, img = null, actions = [] } = {}) {
    const g = this.g; const src = uid != null ? cardPath(g.img(uid)) : img.startsWith('assets/') ? img : cardPath(img);
    const el = h('div', { style: 'position:absolute;inset:0;z-index:5' }, h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.86);animation:fadein .2s both', onclick: () => this.closeInspector() }),
      h('div', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:50px 10px 14px;pointer-events:none' },
        h('div', { style: 'position:relative;height:min(76vh,860px);aspect-ratio:480/675;max-width:92vw;filter:drop-shadow(0 20px 40px #000);pointer-events:auto;animation:rise .3s both', onclick: () => { if (!actions.length) this.closeInspector(); } },
          h('img', { src, style: 'width:100%;height:100%;border-radius:14px;pointer-events:none' })),
        h('div', { style: 'display:flex;gap:14px;pointer-events:auto' }, ...actions.map((a) => h('button.seal' + (a.cls ? '.' + a.cls : ''), { onclick: () => { sound.click(); this.closeInspector(); a.fn(); } }, a.label)), h('button.seal.sm', { onclick: () => this.closeInspector() }, 'CERRAR'))));
    this.closeInspector(); this.inspecting = el; this.root.append(el); sound.flip();
  }
  closeInspector() { this.inspecting?.remove(); this.inspecting = null; }

  /* ----------------------------------------------------------------- diario */
  showJournal(tab = 'map') {
    const g = this.g; const s = g.s; const cat = g.cat;
    const tabs = [['map', '🗺', 'Mapa y moral'], ['plots', '📜', 'Tramas'], ['grave', '💀', 'Cementerio'], ['skills', '⚔', 'Habilidades'], ['log', '📖', 'Registro']];
    const page = h('div.page');
    const book = h('div.book', h('div.pages', page), h('div.tabs', ...tabs.map(([id, ic, t]) => h('div.tab' + (id === tab ? '.on' : ''), { title: t, onclick: () => { sound.page(); this.showJournal(id); } }, ic))), h('button.close-x', { style: 'right:-6px;top:-10px', onclick: () => { sound.click(); this.clearUser(); } }, '✕'));
    const spot = (m, [x, y]) => h('div.pawn', { style: `left:${x * 100}%;top:${y * 100}%` });
    if (tab === 'map') {
      const lv = Math.min(5, s.level); const mo = Math.max(-5, Math.min(5, g.morality()));
      page.append(h('h3', 'Mapa de la mazmorra'), h('div.two',
        h('div', h('div.mapbox', h('img.bg', { src: cardPath(cat.mapImg) }), h('div.pawn', { style: `left:${cat.mapSpots[lv][0] * 100}%;top:${cat.mapSpots[lv][1] * 100}%` })),
          h('div', { style: 'text-align:center;font:700 18px var(--font-title);margin-top:6px' }, `Nivel ${s.level} · turno ${s.turn}/8`)),
        h('div', h('div.mapbox', h('img.bg', { src: cardPath(cat.moralityImg) }), h('div.pawn', { style: `left:${cat.moralitySpots[String(mo)][0] * 100}%;top:${cat.moralitySpots[String(mo)][1] * 100}%;filter:hue-rotate(205deg)` })),
          h('div', { style: 'text-align:center;font:700 18px var(--font-title);margin-top:6px' }, `Moral ${mo > 0 ? '+' : ''}${mo} · ojos ${s.eyes}/10`))));
      void spot;
    } else if (tab === 'plots') {
      page.append(h('h3', 'Tramas resueltas'), h('p', { style: 'font-style:italic;margin:0 0 8px' }, `Ojos del jefe: ${s.eyes} / 10. Al llegar a 10 el jefe final despierta.`),
        h('div.cards', s.z.plotsPlayed.length ? s.z.plotsPlayed.map((u) => h('div.bc', { onclick: () => this.inspect({ uid: u }) }, h('img', { src: cardPath(g.img(u)) }))) : h('p', 'Aún no has resuelto ninguna trama.')));
    } else if (tab === 'grave') {
      const counts = { fire: 0, undead: 0, ice: 0 }; s.z.graveyard.forEach((e) => counts[g.def(e.uid).weakness]++);
      page.append(h('h3', 'Cementerio de enemigos'), h('p', { style: 'margin:0 0 8px' }, `Debilidades: `, ...Object.entries(counts).map(([k, v]) => h('b', { style: 'margin-right:14px' }, `${WEAK[k]} ${v}`)), h('br'), h('i', 'La debilidad más común decide al jefe final. Tres enemigos (cinco si es de otra competencia) se gastan para aprender una habilidad.')),
        h('div.cards', s.z.graveyard.length ? s.z.graveyard.map((e) => h('div.bc' + (e.spent ? '.spent' : ''), { onclick: () => this.inspect({ uid: e.uid }) }, h('img', { src: cardPath(g.img(e.uid)) }), h('div.w', WK_ICON[g.def(e.uid).weakness]))) : h('p', 'Aún no has derrotado a ningún enemigo.')),
        h('h4', `Disponibles para habilidades: ${g.unspentEnemies().length}`));
    } else if (tab === 'skills') {
      page.append(h('h3', 'Habilidades'), h('h4', `Conocidas · competencia: ${s.hero.proficiency}`),
        ...s.hero.skills.map((id) => { const d = cat.def(id); return h('div.skillrow', h('img', { src: cardPath(d.img), onclick: () => this.inspect({ img: d.img }) }), h('div', h('b', d.name), h('p', d.text),
          d.code === 'S4' ? h('button.tiny-btn', { onclick: () => { this.app.act('toggleDivinidad'); this.showJournal('skills'); } }, s.hero.divinidad === 'health' ? 'Convirtiendo energía en salud ✔' : 'Convertir energía en salud') : null)); }),
        h('h4', `Por aprender · enemigos disponibles: ${g.unspentEnemies().length}`),
        ...s.z.skills.map((u) => { const d = g.def(u); if (s.hero.skills.includes(d.id)) return null; const cost = g.skillCost(d.id); const can = g.canLearn(d.id) && ['turn', 'setup'].includes(s.prompt?.type);
          return h('div.skillrow', h('img', { src: cardPath(g.img(u)), onclick: () => this.inspect({ uid: u }) }), h('div', h('b', `${d.name} · ${d.proficiency}`), h('p', d.text), h('button.tiny-btn' + (can ? '' : '.off'), { style: can ? '' : 'opacity:.5', onclick: () => { if (can) { this.app.act('learn', { id: d.id }); this.clearUser(); } } }, `Aprender (${cost} enemigos)`))); }));
    } else {
      const lines = s.log.slice(-160).reverse();
      page.append(h('h3', 'Registro de la aventura'), ...lines.map((l) => h('div.logline.' + l.cat, l.msg)));
    }
    this.mountUser(h('div', { style: 'position:absolute;inset:0' }, h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.7)', onclick: () => this.clearUser() }), book), 'journal');
  }

  /* ----------------------------------------------------------------- confirmación */
  /** devuelve una promesa con el valor del botón pulsado */
  confirm({ title, text, yes = 'SÍ', no = 'NO' }) {
    return new Promise((res) => {
      const done = (v) => { sound.click(); el.remove(); res(v); };
      const el = h('div', { style: 'position:absolute;inset:0;z-index:20' }, h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.72)' }),
        h('div.sheet.scroll', h('h2', title), h('div.narr', text), h('div.btnrow', h('button.seal.gold', { onclick: () => done(true) }, yes), h('button.seal.sm', { onclick: () => done(false) }, no))));
      this.root.append(el); sound.page();
    });
  }

  /* ----------------------------------------------------------------- ajustes y ayuda */
  showSettings() {
    const a = this.app; const st = a.settings;
    const sw = (key, label, fn) => h('label', label, h('div.sw' + (st[key] ? '.on' : ''), { onclick: (e) => { st[key] = !st[key]; e.currentTarget.classList.toggle('on', st[key]); a.saveSettings(); fn?.(st[key]); } }));
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.7)', onclick: () => this.clearUser() }),
      h('div.sheet.scroll', h('h2', 'Ajustes'),
        sw('sound', 'Sonido', (v) => sound.setMuted(!v)), sw('fast', 'Animaciones rápidas', (v) => { speed.k = v ? 0.55 : 1; }), sw('autoCam', 'Cámara automática (móvil)'), sw('captions', 'Narración de sucesos'),
        h('div.btnrow', h('button.seal.sm', { onclick: () => { this.clearUser(); this.showHelp(); } }, 'AYUDA'), h('button.seal.sm', { onclick: () => { this.clearUser(); a.fitCamera(); } }, 'VER MESA'),
          h('button.seal.sm.gold', { onclick: async () => { if (await this.confirm({ title: '¿Volver al menú?', text: 'La partida se guarda al inicio de cada turno y podrás continuarla desde el menú.', yes: 'AL MENÚ', no: 'SEGUIR' })) { this.clearUser(); a.leaveToMenu(); } } }, 'MENÚ')),
        this.closeBtn(() => this.clearUser())));
    this.mountUser(el, 'settings');
  }
  showHelp() {
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.75)', onclick: () => this.clearUser() }),
      h('div.sheet.scroll', { style: 'width:min(640px,94vw)' }, h('h2', 'Cómo se juega'),
        h('div.helpgrid',
          h('div', h('b', '1. Explora. '), 'Toca la puerta grande para robar 2 cartas de mazmorra. Revela una: o la afrontas (parte 1) o la descartas y estás obligado a resolver la otra (parte 2).'),
          h('div', h('b', '2. Combate. '), 'El enemigo ataca primero con 2d6 (mayor − menor, dobles = falla). Tú gastas hasta 3 de energía: un d6 por ficha. Con 0 de energía das un puñetazo de 1.'),
          h('div', h('b', '3. Fin de nivel. '), 'Tras 8 turnos: comes una ración (o pierdes 3 de salud), el veneno crece y robas una trama. Con 10 ojos despierta el jefe.'),
          h('div', h('b', '4. Controles. '), 'Toca o haz clic en cualquier carta para actuar. Mantén pulsado (o clic derecho) para verla grande. Arrastra la mesa y pellizca (o rueda) para acercar. ', h('kbd', 'J'), ' diario · ', h('kbd', 'I'), ' mochila · ', h('kbd', 'F'), ' ver toda la mesa · ', h('kbd', 'M'), ' sonido.')),
        h('div.btnrow', h('button.seal.gold', { onclick: () => this.clearUser() }, 'ENTENDIDO')), this.closeBtn(() => this.clearUser())));
    this.mountUser(el, 'help');
  }

  /* ----------------------------------------------------------------- fin de partida */
  showEnd(over, extra = '') {
    const g = this.g; const win = over.result === 'victory'; const sc = over.score;
    const row = (a, b) => h('tr', h('td', a), h('td', b));
    const best = this.app.recordScore(win ? sc.total : 0, win);
    const scroll = h('div.scroll', h('h2', win ? '¡Victoria!' : 'Has muerto'),
      win ? h('div', h('div.narr', 'Con el jefe final derrotado, puedes colgar la espada…'), h('div.rank', sc.rank), h('table', row('Salud y energía restantes', sc.parts.hp + sc.parts.energy), row('Monedas de oro (×3)', sc.parts.gold), row('Enemigos derrotados (×2)', sc.parts.enemies), row('Valor de tus objetos', sc.parts.items), row('Nivel de mazmorra', sc.parts.level), row('Posición en el marcador de moral', sc.parts.morality), h('tr.total', h('td', 'FONDO DE JUBILACIÓN'), h('td', sc.total))), best ? h('div.narr', `Mejor puntuación: ${best}`) : null)
        : h('div', h('div.narr', over.reason), h('div.narr', `Llegaste al nivel ${g.s.level}, derrotaste ${g.s.z.graveyard.length} enemigos y ${g.s.eyes} ojos te vigilaban.`)),
      h('div.btnrow', { style: 'display:flex;gap:14px;justify-content:center;margin-top:12px;flex-wrap:wrap' }, h('button.seal.gold', { onclick: () => this.app.leaveToMenu() }, 'MENÚ'), h('button.seal', { onclick: () => this.app.restart() }, 'OTRA', h('br'), 'VEZ'), h('button.seal.sm', { onclick: () => { this.clearUser(); this.showJournal('log'); } }, 'DIARIO')));
    this.clearPrompt();
    this.root.append(h('div.endscreen' + (win ? '' : '.defeat'), { id: 'endscreen' }, h('div.veil'), scroll));
    void extra;
  }
}
