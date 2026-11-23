/**
 * Superposiciones: escenas de decisión, selección de cartas, mercader, bazar inicial, diario, ajustes, inspector.
 * Las ligadas a una petición del motor (choice, pickCards, merchant…) se cierran solas al resolverse.
 */
import { h, $, sleep, animate, speed, coinImg, WK, WK_ICON } from './dom.js';
import { cardEl, backOf, cardPath } from './cards.js';
import { sound } from './audio.js';
import { icon } from './icons.js';
import { mapSpotsFor } from './mapspots.js';
import { manualBody } from './manual.js';

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
  mountUser(el, kind, { silent = false } = {}) { this.clearUser(); this.user = el; this.userKind = kind; this.root.append(el); if (!silent) sound.page(); }
  get busyModal() { return !!this.prompt || this.userKind === 'shop'; }
  /** al ejecutar una acción, los menús se retiran YA para dejar ver la animación que sigue */
  closeForAction() {
    const p = this.prompt;
    if (p?._scene?.card?.isConnected) { // la carta de la escena (trama, altar…) sigue a la vista mientras se resuelve lo elegido
      const r = p._scene.card.getBoundingClientRect(); const d = this.g.def(p._scene.uid);
      if (r.width) this.app.director.adoptSpot(p._scene.uid, { x: r.left, y: r.top, w: r.width, h: r.height }, { plot: d.kind === 'plot' });
    }
    if (p) { this.prompt = null; p.classList.add('leaving'); setTimeout(() => p.remove(), 200); }
    if (this.user && this.userKind !== 'shop') this.clearUser();
  }

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
    const card = typeof src === 'number' ? this.sceneCard(src) : null;
    const el = h('div', h('div.veil'), h('div.scene', card, scroll));
    el.style.position = 'absolute'; el.style.inset = '0'; if (card) el._scene = { uid: src, card };
    this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- selección de cartas */
  showPick(pr) {
    const g = this.g; const sel = new Set();
    const need = pr.min === pr.max ? `Elige ${pr.min}` : pr.min === 0 ? `Elige hasta ${pr.max}` : `Elige entre ${pr.min} y ${pr.max}`;
    const seal = h('button.btn.primary.off', { onclick: () => confirm() }, 'ELEGIR');
    const n = pr.uids.length; const cw = n <= 2 ? 'min(34vw, 46vh)' : n <= 4 ? 'min(22vw, 40vh)' : n <= 8 ? 'min(15vw, 30vh)' : 'min(11vw, 24vh)';
    const row = h('div.pickrow', { style: `--pcw:${cw}` });
    const refresh = () => { const ok = sel.size >= pr.min && sel.size <= pr.max; seal.classList.toggle('off', !ok); row.querySelectorAll('.pc').forEach((p) => p.classList.toggle('sel', sel.has(+p.dataset.uid))); };
    const confirm = () => {
      if (seal.classList.contains('off')) return; sound.click();
      for (const u of sel) this.app.noteOrigin(u, row.querySelector(`.pc[data-uid="${u}"]`));
      this.app.act('pickCards', { uids: [...sel] });
    };
    for (const uid of pr.uids) {
      const d = g.def(uid);
      const pc = h('div.pc', { dataset: { uid }, onclick: () => {
        if (pr.max === 1) { if (sel.has(uid)) { confirm(); return; } sel.clear(); sel.add(uid); } else if (sel.has(uid)) sel.delete(uid); else if (sel.size < pr.max) sel.add(uid);
        sound.tap(); refresh();
      }, oncontextmenu: (e) => { e.preventDefault(); this.inspect({ uid }); } }, this.faceCard(uid),
        d.price != null && d.kind === 'item' ? h('div.price', String(d.price), coinImg(), ` · ⚖ ${d.weight}`) : null);
      row.append(pc);
    }
    const hint = pr.max === 1 && pr.uids.length > 1 ? 'Toca una carta para elegirla; tócala otra vez para confirmar.' : need;
    const el = h('div.modal', h('div.veil.mid'), h('div.pick-head', h('div.pick-title', pr.title || need), h('div.pick-sub', hint)), h('div.pickwrap', row),
      h('div.pick-foot', pr.min === 0 ? h('button.btn.quiet', { onclick: () => this.app.act('pickCards', { uids: [] }) }, 'NINGUNA') : null, seal));
    this.mountPrompt(el); refresh();
  }

  /* ----------------------------------------------------------------- tu historia (reglas variantes de ANEMIA al empezar) */
  showIntro(intro, done, label = 'A LA POSADA') {
    const g = this.g; const rows = [];
    const row = (k, title, txt, tag) => rows.push(h('div.story-row', h('div.story-roll', tag), h('div', h('b', title), h('p', txt))));
    if (intro.origin) row('o', `Pueblo de origen · ${intro.origin.town}`, intro.origin.text, `d6 ${intro.origin.roll}`);
    if (intro.motivation) row('m', 'Tu motivación', intro.motivation.text, `d6 ${intro.motivation.roll}`);
    if (intro.direction) row('d', `Rumbo: ${intro.direction.name}`, 'Marca los entornos que encontrarás en los primeros niveles de la mazmorra.', `d4 ${intro.direction.roll}`);
    const el = h('div.modal', h('div.veil.dark'), h('div.sheet.scroll.wide', h('h2', `La historia de ${g.s.hero.name}`), h('div.narr', 'Antes de bajar a la mazmorra…'), ...rows,
      h('div.btnrow', h('button.btn.primary', { onclick: () => { sound.click(); this.clearUser(); done(); } }, label))));
    this.mountUser(el, 'intro');
  }

  /* ----------------------------------------------------------------- pilas de descarte */
  /** muestra las cartas de una pila (solo ver: tocar una la abre en grande) */
  showPile(title, sub, uids) {
    if (!uids.length) return;
    const g = this.g; const n = uids.length; const cw = n <= 2 ? 'min(34vw, 46vh)' : n <= 4 ? 'min(22vw, 40vh)' : n <= 8 ? 'min(15vw, 30vh)' : n <= 18 ? 'min(11vw, 24vh)' : 'min(8.5vw, 19vh)';
    const row = h('div.pickrow', { style: `--pcw:${cw}` }, ...uids.slice().reverse().map((uid) => h('div.pc', { dataset: { uid }, onclick: () => { sound.tap(); this.inspect({ uid }); } }, this.faceCard(uid))));
    const el = h('div.modal', h('div.veil.mid', { onclick: () => this.clearUser() }), h('div.pick-head', h('div.pick-title', title), h('div.pick-sub', sub)), h('div.pickwrap', row),
      h('div.pick-foot', h('button.btn', { onclick: () => { sound.click(); this.clearUser(); } }, 'CERRAR')));
    this.mountUser(el, 'pile'); void g;
  }

  /* ----------------------------------------------------------------- mercader */
  showMerchant(pr) {
    const g = this.g; let selected = null; let tradeFrom = null;
    const gold = () => g.s.hero.gold;
    const bazaar = h('div.pickrow.flat'); const mine = h('div.pickrow.flat');
    const bar = h('div', { style: 'text-align:center;min-height:90px;margin-top:10px' });
    const rebuild = () => {
      bazaar.innerHTML = ''; mine.innerHTML = ''; bar.innerHTML = '';
      for (const uid of g.s.ctx.stock || []) {
        const p = g.buyPrice(uid);
        const worth = (g.def(uid).price || 0) < (tradeFrom != null ? (g.def(tradeFrom).price || 0) : Infinity);
        const pc = h('div.pc' + (selected?.uid === uid && selected.mode === 'buy' ? '.sel' : '') + (tradeFrom != null ? (worth ? '.can-trade' : '.poor') : ''), { dataset: { uid }, onclick: () => {
          if (tradeFrom != null) { if (!worth) { sound.error(); this.app.toast('Debe valer menos que lo que entregas.'); return; } sound.coin(); const give = tradeFrom; tradeFrom = null; selected = null; this.app.act('merchantTrade', { give, take: uid }); return; }
          sound.tap(); selected = { uid, mode: 'buy' }; rebuild(); } }, this.faceCard(uid), h('div.price', String(p), coinImg()));
        if (p > gold() && tradeFrom == null) pc.style.filter = 'grayscale(.6) brightness(.8)';
        bazaar.append(pc);
      }
      if (!(g.s.ctx.stock || []).length) bazaar.append(h('div', { style: 'font-style:italic;color:#cdb58a;padding:30px' }, 'El bazar está vacío.'));
      for (const uid of g.allItems()) {
        const d = g.def(uid);
        const pc = h('div.pc' + (selected?.uid === uid && selected.mode === 'sell' ? '.sel' : ''), { style: 'width:clamp(80px,10vw,120px)', onclick: () => { sound.tap(); selected = { uid, mode: 'sell' }; rebuild(); } }, this.faceCard(uid), h('div.price', { style: 'font-size:14px' }, `+${g.sellPrice()}`, coinImg()));
        if (d.fx?.cursed) pc.style.filter = 'grayscale(1)';
        mine.append(pc);
      }
      if (tradeFrom != null) {
        bar.append(h('div', { style: 'font:700 19px var(--font-title);color:var(--gold2);margin-bottom:6px' }, `Entregas: ${g.def(tradeFrom).name}`), h('div', { style: 'font-style:italic;color:#cdb58a;margin-bottom:8px' }, 'Elige en el bazar qué objeto de menor valor quieres a cambio.'),
          h('button.btn.quiet', { onclick: () => { tradeFrom = null; rebuild(); } }, 'CANCELAR EL CAMBIO'));
      } else if (selected) {
        const d = g.def(selected.uid);
        const emerald = g.equippedUid('L29');
        bar.append(...[h('div', { style: 'font:700 20px var(--font-title);color:var(--gold2);margin-bottom:6px' }, d.name),
          selected.mode === 'buy' ? h('button.btn.primary' + (g.buyPrice(selected.uid) > gold() ? '.off' : ''), { onclick: () => { sound.coin(); this.app.noteOrigin(selected.uid, bazaar.querySelector(`.pc[data-uid="${selected.uid}"]`)); this.app.act('merchantBuy', { uid: selected.uid }); selected = null; } }, 'COMPRAR ', String(g.buyPrice(selected.uid)), coinImg())
            : h('button.btn.primary', { onclick: () => { sound.coin(); this.app.act('merchantSell', { uid: selected.uid }); selected = null; } }, 'VENDER +', String(g.sellPrice()), coinImg()),
          selected.mode === 'buy' && emerald ? h('button.btn.quiet', { style: 'margin-left:12px', onclick: () => { this.app.act('merchantEmerald', { uid: selected.uid }); selected = null; } }, 'ESMERALDA') : null,
          selected.mode === 'sell' && pr.trade && !d.fx?.cursed ? h('button.btn', { style: 'margin-left:12px', onclick: () => { sound.tap(); tradeFrom = selected.uid; selected = null; rebuild(); } }, 'CAMBIAR POR OTRO') : null,
          h('button.btn.quiet', { style: 'margin-left:12px', onclick: () => this.inspect({ uid: selected.uid }) }, 'VER')].filter(Boolean));
      } else bar.append(h('div', { style: 'font-style:italic;color:#cdb58a' }, 'Toca una carta del bazar para comprarla o una de las tuyas para venderla.'));
    };
    const wrap = h('div.modal.scrolly', h('div.veil.mid', { style: 'position:fixed' }),
      h('div.merchant-body', 
        h('div', { style: 'font:900 34px var(--font-title);color:var(--gold2);text-shadow:0 3px 6px #000' }, 'EL MERCADER'),
        h('div', { style: 'font-style:italic;color:var(--parch)' }, h('span', `Tienes ${gold()} `, coinImg(), ` · Vendes cada objeto por ${g.sellPrice()} `, coinImg()), pr.trade ? h('span', ' · este mercader también hace trueques') : null),
        h('div', { style: 'font:700 16px var(--font-title);color:var(--gold);margin-top:14px;letter-spacing:.15em' }, 'BAZAR'), bazaar,
        bar,
        h('div', { style: 'font:700 16px var(--font-title);color:var(--gold);margin-top:14px;letter-spacing:.15em' }, 'TU EQUIPO'), mine,
        h('div.m-foot', h('button.btn.primary', { onclick: () => { sound.click(); this.app.act('leaveMerchant'); } }, 'SALIR DEL BAZAR'))));
    rebuild(); this.mountPrompt(wrap);
  }

  /* ----------------------------------------------------------------- sobrecarga */
  showOverweight(pr) {
    const g = this.g; let selected = null;
    const row = h('div.pickrow', { style: '--pcw:min(15vw, 30vh)' }); const bar = h('div.pick-foot');
    const rebuild = () => {
      row.innerHTML = ''; bar.innerHTML = '';
      for (const uid of g.allItems()) row.append(h('div.pc' + (selected === uid ? '.sel' : ''), { dataset: { uid }, onclick: () => { sound.tap(); selected = uid; rebuild(); }, oncontextmenu: (e) => { e.preventDefault(); this.inspect({ uid }); } }, this.faceCard(uid), h('div.price', icon('weight', 14), ` ${g.weightOf(uid)}`)));
      const canUse = selected != null && !!g.usableNow?.(selected);
      if (canUse) bar.append(h('button.btn', { onclick: () => { sound.click(); this.app.act('use', { uid: selected }); } }, 'USAR'));
      bar.append(h('button.btn.primary' + (selected ? '' : '.off'), { onclick: () => { if (selected) { sound.click(); this.app.act('dropOver', { uid: selected }); } } }, 'SOLTAR'));
    };
    const carry = g.s.hero.carryRule === 'weaponsOnly' ? 'Solo puedes llevar armas: dos de una mano o una de dos manos.' : `Llevas ${g.weight()} de carga y tu límite es ${g.maxWeight()}. Suelta ${pr.need} o más de peso para continuar.`;
    const el = h('div.modal', h('div.veil.mid'), h('div.pick-head', h('div.pick-title', 'Vas demasiado cargado'), h('div.pick-sub', carry)), h('div.pickwrap', row), bar);
    rebuild(); this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- evitar encuentro */
  showAvoidCard(pr) {
    const g = this.g;
    const opts = pr.options.map((o, i) => h('button.plaque', { 'data-n': i + 1, onclick: () => { sound.click(); this.app.act('avoidCard', { id: o.id }); } }, h('b', o.label), h('span', o.text)));
    opts.push(h('button.plaque', { 'data-n': pr.resolve ? '✔' : '⚔', onclick: () => { sound.click(); this.app.act('avoidCard', { id: 'fight' }); } },
      h('b', pr.resolve ? 'Resolver la carta' : 'Enfrentarte'), h('span', pr.resolve ? 'Sigues adelante y resuelves lo que dice.' : 'Roba un enemigo y combate.')));
    const card = this.sceneCard(pr.uid);
    const scroll = h('div.scroll', h('h2', g.def(pr.uid).name), h('div.narr', pr.resolve ? '¿Puedes esquivar lo que te espera?' : '¿Puedes evitar este encuentro?'), ...opts);
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil'), h('div.scene', card, scroll)); el._scene = { uid: pr.uid, card };
    this.mountPrompt(el);
  }

  /* ----------------------------------------------------------------- La Posada: equipo (y esbirros si hay expansión) */
  /**
   * La tienda se construye UNA vez y después solo se actualiza lo que cambia (oro, cartas compradas, tu equipo):
   * nada se vuelve a montar, no se repite el sonido ni parpadea. Tocar una carta la abre en grande con COMPRAR.
   */
  showShop({ auto = false } = {}) {
    if (this.userKind === 'shop' && this.shop?.el.isConnected) { this.refreshShop(); return; }
    const g = this.g; const st = (this.shopState = { tab: 'gear' }); void st;
    const S = this.shop = { tiles: new Map(), tab: null, sigTabs: '', sigMine: '' };
    S.goldB = h('b'); S.tabs = h('div.inn-tabs'); S.row = h('div.pickrow'); S.info = h('div.inn-info');
    S.mineLoad = h('small'); S.mineRow = h('div.mine-row'); S.foot = h('div.inn-foot');
    S.el = h('div.modal', h('div.veil.dark'), h('div.inn-panel',
      h('div.inn-head', h('h2', 'LA POSADA'), h('div.inn-gold', h('span', 'Tu oro'), S.goldB, coinImg())), S.tabs,
      h('div.inn-gear', h('div.pickwrap.inline', S.row), S.info),
      h('div.inn-mine', h('div.mine-title', 'Tu equipo ', S.mineLoad), S.mineRow), S.foot));
    this.mountUser(S.el, 'shop', { silent: !auto });
    this.refreshShop();
  }
  /** (re)sincroniza las cartas de `list` dentro de `row` sin tocar las que no cambian */
  _syncTiles(row, tiles, list, make, update) {
    const want = new Set(list);
    for (const [uid, el] of tiles) if (!want.has(uid)) { tiles.delete(uid); el.classList.add('leaving'); setTimeout(() => el.remove(), 260); }
    let prev = null;
    for (const uid of list) {
      let el = tiles.get(uid); if (!el) { el = make(uid); tiles.set(uid, el); }
      if (el.parentNode !== row || (prev ? el.previousElementSibling !== prev : row.firstElementChild !== el)) row.insertBefore(el, prev ? prev.nextSibling : row.firstChild);
      update(uid, el); prev = el;
    }
  }
  refreshShop() {
    const S = this.shop; if (!S?.el.isConnected) return;
    const g = this.g; const pr = g.s.prompt; const inSetup = pr?.type === 'setup'; const gold = g.s.hero.gold; const st = this.shopState;
    if (!pr?.inn) st.tab = 'gear';
    S.goldB.textContent = String(gold);
    const sigTabs = pr?.inn ? st.tab : '';
    if (sigTabs !== S.sigTabs) {
      S.sigTabs = sigTabs;
      S.tabs.replaceChildren(...(pr?.inn ? [['gear', 'Equipo'], ['inn', 'Esbirros']].map(([id, t]) => h('button.tab' + (st.tab === id ? '.on' : ''), { onclick: () => { if (st.tab === id) return; sound.tap(); st.tab = id; this.refreshShop(); } }, t)) : []));
    }
    if (S.tab !== st.tab) { S.tab = st.tab; S.row.replaceChildren(); S.tiles.clear(); S.row.style.setProperty('--pcw', st.tab === 'inn' ? 'max(80px, min(8.6vw, 17.5vh))' : 'max(74px, min(8.4vw, 17.5vh))'); }
    const hired = new Set((g.s.mercs || []).map((m) => m.uid));
    if (st.tab === 'inn' && pr?.inn) {
      const inn = pr.inn;
      this._syncTiles(S.row, S.tiles, inn.candidates,
        (uid) => this._tile(uid, () => this.openShopItem(uid)),
        (uid, el) => { const d = g.def(uid); const isHired = hired.has(uid); const m = (g.s.mercs || []).find((x) => x.uid === uid); const can = !isHired && d.cost <= gold && hired.size < inn.max;
          el.classList.toggle('hired', isHired); el.classList.toggle('poor', !isHired && !can); this._price(el, isHired ? `Moral ${m.morale}/${m.max}` : [String(d.cost), coinImg()]); });
      S.info.replaceChildren(h('span.hintline', `Puedes llevar hasta ${inn.max} esbirros (${hired.size} contratados). Toca uno para verlo y contratarlo.`));
    } else {
      this._syncTiles(S.row, S.tiles, g.s.z.trappings,
        (uid) => this._tile(uid, () => this.openShopItem(uid)),
        (uid, el) => { const d = g.def(uid); el.classList.toggle('poor', d.price > gold); this._price(el, [String(d.price), coinImg(), h('span.w', icon('weight', 13), String(d.weight))]); });
      S.info.replaceChildren(g.s.z.trappings.length ? h('span.hintline', 'Toca una carta para verla en grande y comprarla.') : h('span.hintline', 'No queda equipo por comprar.'));
    }
    // tu equipo actual
    const eq = g.s.eq; const owned = [['MP', eq.MP], ['OM', eq.OM], ['CA', eq.CA], ['CP', eq.CP], ...eq.AC.map((u) => ['AC', u]), ...g.s.z.hand.map((u) => ['·', u])].filter(([, u]) => u);
    const sigMine = JSON.stringify(owned);
    S.mineLoad.textContent = g.s.hero.carryRule === 'weaponsOnly' ? '· solo armas' : `· carga ${g.weight()} / ${g.maxWeight()}`;
    if (sigMine !== S.sigMine) {
      S.sigMine = sigMine;
      S.mineRow.replaceChildren(...(owned.length ? owned.map(([slot, u]) => h('div.mini-eq', { dataset: { uid: u }, onclick: () => this.app.onItemTap(u) }, this.faceCard(u), h('i', slot))) : [h('span.hintline', 'Todavía no llevas nada.')]));
    }
    const foot = inSetup ? 'enter' : 'close';
    if (S.footKind !== foot) {
      S.footKind = foot;
      S.foot.replaceChildren(inSetup ? h('button.btn.primary.big', { onclick: () => { sound.click(); this.clearUser(); this.shopState = null; this.app.act('begin'); } }, 'ENTRAR EN LA MAZMORRA') : h('button.btn', { onclick: () => this.clearUser() }, 'CERRAR'));
    }
  }
  _tile(uid, open) {
    return h('div.pc', { dataset: { uid }, onclick: () => { sound.tap(); open(); }, oncontextmenu: (e) => { e.preventDefault(); open(); } }, this.faceCard(uid), h('div.price'));
  }
  _price(el, content) { const p = el.querySelector('.price'); p.replaceChildren(...[content].flat()); }
  /** una carta de la tienda abierta en grande, con lo que se puede hacer con ella */
  openShopItem(uid) {
    const g = this.g; const pr = g.s.prompt; const inSetup = pr?.type === 'setup'; const gold = g.s.hero.gold; const d = g.def(uid); const actions = []; let note = '';
    const tile = this.shop?.tiles.get(uid);
    if (this.shopState?.tab === 'inn' && pr?.inn) {
      const m = (g.s.mercs || []).find((x) => x.uid === uid); const hired = new Set((g.s.mercs || []).map((x) => x.uid)); const inn = pr.inn;
      if (m) { note = `Contratado · moral ${m.morale} de ${m.max}.`; if (m.morale < m.max && gold >= 1) actions.push({ label: 'RESTAURAR MORAL · 1 ORO', cls: 'primary', fn: () => { sound.coin(); this.app.act('payMorale', { uid }, { keep: true }); } }); }
      else if (hired.size >= inn.max) note = `Ya llevas ${inn.max} esbirros.`;
      else if (d.cost > gold) note = `Cuesta ${d.cost} de oro: te faltan ${d.cost - gold}.`;
      else { note = `Cuesta ${d.cost} de oro · moral inicial ${d.die}.`; actions.push({ label: `CONTRATAR · ${d.cost} ORO`, cls: 'primary', fn: () => { sound.coin(); this.app.act('hire', { uid }, { keep: true }); } }); }
    } else {
      note = '';
      if (!inSetup) note = 'Solo se compra antes de entrar en la mazmorra.';
      else if (d.price > gold) note = `Cuesta ${d.price} de oro: te faltan ${d.price - gold}.`;
      else actions.push({ label: `COMPRAR · ${d.price} ORO`, cls: 'primary', fn: () => { sound.coin(); this.app.noteOrigin(uid, tile?.querySelector('.card') || tile); this.app.act('buy', { id: d.id }, { keep: true }); } });
    }
    this.inspect({ uid, actions, note, keepShop: true });
  }
  /** dónde cae lo que acabas de comprar (la fila "Tu equipo" de la tienda abierta) */
  shopMineRect() { const r = this.shop?.mineRow?.getBoundingClientRect(); return r && r.width ? { x: r.left + 8, y: r.top + 4, w: 54, h: 76 } : null; }

  /* ----------------------------------------------------------------- visita divina */
  showDivine(pr) {
    const faces = pr.faces; const items = faces.map((f) => h('div', { style: 'width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font:900 34px var(--font-title);color:#fff;text-shadow:0 2px 4px #000;border:3px solid #fff8;box-shadow:0 0 30px #ffe9a8, inset 0 0 20px rgba(255,255,255,.4);background:' + (f.k === 'hp' ? 'radial-gradient(circle at 35% 30%,#ff8a7a,#a1241a)' : f.k === 'en' ? 'radial-gradient(circle at 35% 30%,#d9a0ff,#6a2a9a)' : 'radial-gradient(circle at 35% 30%,#9be39f,#2f7a3a)') + ';animation:rise .6s both' }, f.k === 'hp' ? `❤${f.n}` : f.k === 'en' ? `⚡${f.n}` : '✚'));
    const el = h('div', { style: 'position:absolute;inset:0' }, h('div.veil.light'),
      h('div', { style: 'position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;padding:0 20px' },
        h('div', { style: 'font:900 42px var(--font-title);color:#ffe9a8;text-shadow:0 0 30px #ffb23a, 0 4px 8px #000;letter-spacing:.1em' }, 'VISITA DIVINA'),
        h('div', { style: 'font-style:italic;font-size:21px;margin:8px 0 22px;color:var(--parch)' }, 'Un ser angelical te visita antes del combate final…'),
        h('div', { style: 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;max-width:700px;margin:0 auto' }, items.length ? items : h('div', { style: 'color:#cdb58a' }, 'No tienes fichas de bendición.')),
        h('div', { style: 'margin:22px 0;font:700 22px var(--font-title);color:var(--gold2)' }, pr.hp || pr.en || pr.cure ? `${pr.hp ? `+${pr.hp} salud  ` : ''}${pr.en ? `+${pr.en} energía  ` : ''}${pr.cure ? '· sin veneno' : ''}` : ''),
        h('button.btn.primary', { onclick: () => { sound.click(); this.app.act('ack'); } }, 'AL COMBATE')));
    this.mountPrompt(el); sound.bless();
  }

  /* ----------------------------------------------------------------- inspector de cartas */
  /** inspect({uid}) o inspect({img}); actions: [{label, cls, fn}]; note: línea bajo la carta */
  inspect({ uid = null, img = null, actions = [], note = '' } = {}) {
    const g = this.g; const src = uid != null ? cardPath(g.img(uid)) : img.startsWith('assets/') ? img : cardPath(img);
    let meta = '';
    if (uid != null) {
      const d = g.def(uid); const SLOT = { MP: 'mano principal', OM: 'otra mano', '2M': 'dos manos', CP: 'cuerpo', CA: 'cabeza', AC: 'accesorio' };
      if (d.kind === 'item') meta = [d.name, d.slot ? SLOT[d.slot] : null, d.weight != null ? `peso ${d.weight}` : null, d.price != null ? `valor ${d.price}` : null].filter(Boolean).join(' · ');
      else meta = d.name || '';
      if (d.fx?.cursed) note = note || 'Maldito: no puedes quitártelo ni soltarlo.';
      if (g.s.cards[uid]?.empty) note = note || 'Vacía: se rellena en el Campamento.';
    }
    const el = h('div.inspect', h('div.inspect-veil', { onclick: () => this.closeInspector() }),
      h('div.inspect-body',
        h('div.inspect-card', { onclick: () => { if (!actions.length) this.closeInspector(); } }, h('img', { src, alt: meta || '' })),
        meta ? h('div.inspect-meta', meta) : null, note ? h('div.inspect-note', note) : null,
        h('div.inspect-acts', ...actions.map((a) => h('button.btn' + (a.cls ? '.' + a.cls.split(' ').join('.') : ''), { onclick: () => { sound.click(); this.closeInspector(); a.fn(); } }, a.label)), h('button.btn.quiet', { onclick: () => this.closeInspector() }, 'CERRAR'))));
    this.closeInspector(); this.inspecting = el; this.root.append(el); sound.flip();
  }
  closeInspector() { this.inspecting?.remove(); this.inspecting = null; }

  /* ----------------------------------------------------------------- diario */
  showJournal(tab = 'map') {
    this.app._jTab = tab; const g = this.g; const s = g.s; const cat = g.cat;
    const tabs = [['map', '🗺', 'Mapa y moral'], ['plots', '📜', 'Tramas'], ['grave', '💀', 'Cementerio'], ['skills', '⚔', 'Habilidades'], ['log', '📖', 'Registro'], ['manual', '📘', 'Manual']];
    const page = h('div.page');
    const book = h('div.book', h('div.pages', page), h('div.tabs', ...tabs.map(([id, ic, t]) => h('div.tab' + (id === tab ? '.on' : ''), { title: t, onclick: () => { sound.page(); this.showJournal(id); } }, ic))), h('button.close-x', { style: 'right:-6px;top:-10px', onclick: () => { sound.click(); this.clearUser(); } }, '✕'));
    const spot = (m, [x, y]) => h('div.pawn', { style: `left:${x * 100}%;top:${y * 100}%` });
    if (tab === 'map') {
      const lv = Math.min(5, s.level); const mo = Math.max(-5, Math.min(5, g.morality()));
      page.append(h('h3', 'Mapa de la mazmorra'), h('div.two',
        h('div', h('div.mapbox', h('img.bg', { src: cardPath(cat.mapImg) }), h('div.pawn', { style: `left:${mapSpotsFor(cat)[lv][0] * 100}%;top:${mapSpotsFor(cat)[lv][1] * 100}%` })),
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
        h('h4', `Disponibles para habilidades: ${g.unspentEnemies().length}`),
        ...(s.variants?.gastarXP ? (() => { const can = ['turn', 'setup'].includes(s.prompt?.type) && g.unspentEnemies().length >= 7; const b = (stat, t) => h('button.tiny-btn' + (can ? '' : '.off'), { style: can ? 'margin-right:8px' : 'margin-right:8px;opacity:.5', onclick: () => { if (can) { this.app.act('spendXp', { stat }); this.clearUser(); } } }, t);
          return [h('h4', 'Gastar experiencia'), h('p', { style: 'margin:0 0 6px' }, 'Cada 7 enemigos derrotados sin gastar pueden dar +1 de salud o de energía máximas.'), h('div', b('hp', '+1 salud máxima'), b('energy', '+1 energía máxima'))]; })() : []));
    } else if (tab === 'skills') {
      page.append(h('h3', 'Habilidades'), h('h4', `Conocidas · competencia: ${s.hero.proficiency}`),
        ...s.hero.skills.map((id) => { const d = cat.def(id); return h('div.skillrow', h('img', { src: cardPath(d.img), onclick: () => this.inspect({ img: d.img }) }), h('div', h('b', d.name), h('p', d.text),
          d.code === 'S4' ? h('button.tiny-btn', { onclick: () => { this.app.act('toggleDivinidad'); this.showJournal('skills'); } }, s.hero.divinidad === 'health' ? 'Convirtiendo energía en salud ✔' : 'Convertir energía en salud') : null)); }),
        h('h4', `Por aprender · enemigos disponibles: ${g.unspentEnemies().length}`),
        ...s.z.skills.map((u) => { const d = g.def(u); if (s.hero.skills.includes(d.id)) return null; const cost = g.skillCost(d.id); const can = g.canLearn(d.id) && ['turn', 'setup'].includes(s.prompt?.type);
          return h('div.skillrow', h('img', { src: cardPath(g.img(u)), onclick: () => this.inspect({ uid: u }) }), h('div', h('b', `${d.name} · ${d.proficiency}`), h('p', d.text), h('button.tiny-btn' + (can ? '' : '.off'), { style: can ? '' : 'opacity:.5', onclick: () => { if (can) { this.app.act('learn', { id: d.id }); this.clearUser(); } } }, `Aprender (${cost} enemigos)`))); }));
    } else if (tab === 'manual') {
      const first = this.app._manTab || (s.config?.modules?.includes('anemia') ? 'anemia' : 'original');
      page.append(h('h3', 'Manual de instrucciones'), manualBody({ tab: first, onTab: (id) => { this.app._manTab = id; } }));
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
        h('div.sheet.scroll', h('h2', title), h('div.narr', text), h('div.btnrow', h('button.btn.primary', { onclick: () => done(true) }, yes), h('button.btn.quiet', { onclick: () => done(false) }, no))));
      this.root.append(el); sound.page();
    });
  }

  /* ----------------------------------------------------------------- ajustes y ayuda */
  showSettings() {
    const a = this.app; const st = a.settings;
    const sw = (key, label, fn, hintText = '') => h('label', h('span', label, hintText ? h('small', hintText) : null), h('div.sw' + (st[key] ? '.on' : ''), { onclick: (e) => { st[key] = !st[key]; e.currentTarget.classList.toggle('on', st[key]); a.saveSettings(); fn?.(st[key]); } }));
    const el = h('div.modal', h('div.veil', { onclick: () => this.clearUser() }),
      h('div.sheet.scroll.settings', h('h2', 'Ajustes'),
        h('div.rows', h('div.seg-row', h('span', 'Pausas para leer', h('small', 'Qué hacen las cartas que se muestran en pantalla')),
          h('div.seg', ...[['tap', 'Tocar'], ['timed', 'Tiempo'], ['off', 'Sin pausas']].map(([id, t]) => h('button' + (st.reading === id ? '.on' : ''), { onclick: (e) => { st.reading = id; a.saveSettings(); sound.tap(); e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, t)))),
        sw('sound', 'Sonido', (v) => sound.setMuted(!v)), sw('fast', 'Animaciones rápidas', (v) => { speed.k = v ? 0.55 : 1; }),
        sw('autoReveal', 'Revelar sola la primera carta', null, 'Ahorra un toque por turno'), sw('autoDraw', 'Robar solo al empezar cada turno', null, 'Para jugar más deprisa'), sw('preShop', 'Tienda de la posada antes de entrar', null, 'Si no, empiezas directamente'),
        sw('autoCam', 'Cámara automática en móvil'), sw('captions', 'Narración de sucesos')),
        h('div.btnrow', h('button.btn.quiet', { onclick: () => { this.clearUser(); this.showHelp(); } }, 'AYUDA'), h('button.btn.quiet', { onclick: () => { this.clearUser(); this.showJournal('manual'); } }, 'MANUAL'),
          h('button.btn', { onclick: async () => { if (await this.confirm({ title: '¿Volver al menú?', text: 'La partida se guarda al inicio de cada turno y podrás continuarla desde el menú.', yes: 'AL MENÚ', no: 'SEGUIR' })) { this.clearUser(); a.leaveToMenu(); } } }, 'MENÚ PRINCIPAL')),
        this.closeBtn(() => this.clearUser())));
    this.mountUser(el, 'settings');
  }
  showHelp() {
    const el = h('div.modal', h('div.veil', { onclick: () => this.clearUser() }),
      h('div.sheet.scroll.wide', h('h2', 'Cómo se juega'),
        h('div.helpgrid',
          h('div', h('b', 'Explorar. '), 'Toca la puerta grande para robar 2 cartas. La primera se revela sola: o la afrontas (parte 1) o la descartas y estás obligado a resolver la otra (parte 2).'),
          h('div', h('b', 'Combatir. '), 'El enemigo ataca primero con 2d6 (mayor − menor, dobles = falla). Tú gastas hasta 3 de energía, un d6 por ficha; sin energía das un puñetazo de 1. Toca el fieltro para lanzar los dados.'),
          h('div', h('b', 'Fin de nivel. '), 'Tras 8 turnos comes una ración (o pierdes 3 de salud), el veneno crece y robas una trama. Con 10 ojos despierta el jefe.'),
          h('div', h('b', 'Dos tableros. '), 'Las pestañas de abajo alternan entre la ', h('b', 'Mazmorra'), ' y el ', h('b', 'Personaje'), '. En Personaje arrastras objetos entre la mochila y las ranuras del tapete (o a SOLTAR AQUÍ). Solo se cambia de equipo entre turnos.'),
          h('div', h('b', 'Controles. '), 'Toca cualquier carta para actuar; mantén pulsado (o clic derecho) para verla grande; toca una ficha del HUD para saber qué hace. Arrastra la mesa y pellizca (o rueda) para acercar. ', h('kbd', 'J'), ' diario · ', h('kbd', 'I'), ' mochila · ', h('kbd', '1'), '/', h('kbd', '2'), ' tableros · ', h('kbd', 'F'), ' encuadrar · ', h('kbd', 'M'), ' sonido.')),
        h('div.btnrow', h('button.btn.quiet', { onclick: () => { this.clearUser(); this.showJournal('manual'); } }, 'MANUAL COMPLETO'), h('button.btn.primary', { onclick: () => this.clearUser() }, 'ENTENDIDO')), this.closeBtn(() => this.clearUser())));
    this.mountUser(el, 'help');
  }

  /* ----------------------------------------------------------------- fin de partida */
  showEnd(over, extra = '') {
    const g = this.g; const win = over.result === 'victory'; const sc = over.score;
    const row = (a, b) => h('tr', h('td', a), h('td', b));
    const best = this.app.recordScore(win ? sc.total : 0, win);
    const ENDING = { mansion: 'Compras la mansión de tus sueños y te retiras sin más combates.', home: 'Regresas a casa tras la aventura inmortal.', trapped: 'Quedas atrapado en el tiempo para siempre.', evaded: 'Evitas al jefe final y escapas con vida.' };
    const scroll = h('div.scroll', h('h2', win ? '¡Victoria!' : 'Has muerto'), over.ending && ENDING[over.ending] ? h('div.narr', ENDING[over.ending]) : null,
      win ? h('div', h('div.narr', 'Con el jefe final derrotado, puedes colgar la espada…'), h('div.rank', sc.rank), h('table', row('Salud y energía restantes', sc.parts.hp + sc.parts.energy), row('Monedas de oro (×3)', sc.parts.gold), row('Enemigos derrotados (×2)', sc.parts.enemies), row('Valor de tus objetos', sc.parts.items), row('Nivel de mazmorra', sc.parts.level), row('Posición en el marcador de moral', sc.parts.morality), h('tr.total', h('td', 'FONDO DE JUBILACIÓN'), h('td', sc.total))), best ? h('div.narr', `Mejor puntuación: ${best}`) : null)
        : h('div', h('div.narr', over.reason), h('div.narr', `Llegaste al nivel ${g.s.level}, derrotaste ${g.s.z.graveyard.length} enemigos y ${g.s.eyes} ojos te vigilaban.`)),
      over.epilogue ? h('div.epilogue', h('b', over.epilogue.name), h('p', over.epilogue.text)) : null,
      win && sc.retreat ? h('div.epilogue', h('b', `Lugar de retiro: ${sc.retreat.name}`), h('p', sc.retreat.text)) : null,
      h('div.btnrow', { style: 'display:flex;gap:14px;justify-content:center;margin-top:12px;flex-wrap:wrap' }, h('button.btn', { onclick: () => this.app.leaveToMenu() }, 'MENÚ'), h('button.btn.primary', { onclick: () => this.app.restart() }, 'OTRA PARTIDA'), h('button.btn.quiet', { onclick: () => { this.clearUser(); this.showJournal('log'); } }, 'DIARIO')));
    this.clearPrompt();
    this.root.append(h('div.endscreen' + (win ? '' : '.defeat'), { id: 'endscreen' }, h('div.veil'), scroll));
    void extra;
  }
}
