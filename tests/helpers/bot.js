/**
 * Bot de pruebas: juega partidas completas eligiendo acciones legales al azar (con cierto criterio)
 * y comprueba invariantes del motor en cada paso.
 */
import { Game } from '../../iron_helm_game/js/engine/index.js';

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Todas las cartas deben estar exactamente en un sitio. Devuelve lista de problemas. */
export function audit(g) {
  const s = g.s; const z = s.z; const seen = new Map(); const problems = [];
  const put = (u, where) => { if (u == null) return; if (seen.has(u)) problems.push(`carta ${u} (${s.cards[u]?.id}) en ${seen.get(u)} y en ${where}`); else seen.set(u, where); };
  for (const [k, arr] of Object.entries(z)) {
    if (k === 'blessingPile') continue;
    for (const e of arr) put(k === 'graveyard' ? e.uid : e, `z.${k}`);
  }
  for (const k of ['MP', 'OM', 'CA', 'CP']) put(s.eq[k], `eq.${k}`);
  s.eq.AC.forEach((u) => put(u, 'eq.AC'));
  s.hero.afflictions.forEach((u) => put(u, 'hero.afflictions'));
  Object.values(s.hero.skillCards).forEach((u) => put(u, 'hero.skillCards'));
  if (s.combat && !s.combat.defeated) put(s.combat.uid, 'combat');
  const pr = s.prompt;
  if (pr?.uids && ['pickCards'].includes(pr.type)) pr.uids.forEach((u) => { if (!seen.has(u)) put(u, 'prompt'); });
  if (s.ctx.stock) s.ctx.stock.forEach((u) => put(u, 'ctx.stock'));
  const total = Object.keys(s.cards).length;
  return { problems, orphans: total - seen.size, total };
}

export function checkInvariants(g) {
  const h = g.s.hero; const errs = [];
  for (const k of ['hp', 'energy', 'rations', 'gold', 'poison']) if (!Number.isFinite(h[k]) || h[k] < 0) errs.push(`${k}=${h[k]}`);
  if (h.hp > g.maxHp()) errs.push(`hp ${h.hp} > máx ${g.maxHp()}`);
  if (h.morality < -5 || h.morality > 5) errs.push(`moral ${h.morality}`);
  if (h.blessings.length > 12) errs.push('demasiadas bendiciones');
  if (g.s.eyes < 0) errs.push('ojos negativos');
  return errs;
}

export function play(g, { seed = 1, maxSteps = 3000, style = 'random' } = {}) {
  const r = mulberry(seed * 7919 + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const log = [];
  let steps = 0;
  const act = (type, payload = {}) => {
    const before = g.s.prompt?.type;
    const res = g.act(type, payload);
    log.push(`${before}:${type}${res.ok ? '' : '!' + res.error}`);
    return res;
  };
  while (!g.s.over && steps++ < maxSteps) {
    const s = g.s; const pr = s.prompt;
    if (!pr) throw new Error(`Sin prompt ni fin de partida tras ${log.slice(-8).join(' > ')}`);
    const errs = checkInvariants(g); if (errs.length) throw new Error(`Invariantes: ${errs.join(', ')} tras ${log.slice(-8).join(' > ')}`);
    const a = audit(g);
    if (a.problems.length) throw new Error(`Cartas duplicadas: ${a.problems.join('; ')} tras ${log.slice(-8).join(' > ')}`);
    const free = () => {
      // acciones libres entre turnos: curar, equipar, aprender
      const h = s.hero;
      for (const u of g.allItems()) {
        const d = g.def(u);
        if (['L5', 'P1'].includes(d.code) && h.hp <= g.maxHp() - 4 && r() < 0.8) { if (act('use', { uid: u }).ok) return true; }
        if (d.code === 'P2' && h.poison >= 2 && r() < 0.8) { if (act('use', { uid: u }).ok) return true; }
        if (['L1', 'P6', 'L20'].includes(d.code) && h.energy <= 5 && r() < 0.6) { if (act('use', { uid: u }).ok) return true; }
      }
      for (const u of s.z.hand.slice()) { if (r() < 0.7 && act('equip', { uid: u }).ok) return true; }
      for (const sk of s.z.skills) { const id = s.cards[sk].id; if (g.canLearn(id) && r() < 0.8) { if (act('learn', { id }).ok) return true; } }
      return false;
    };
    switch (pr.type) {
      case 'setup': {
        for (const u of s.z.trappings.slice()) { const d = g.def(u); if (d.price <= s.hero.gold && r() < 0.4) { act('buy', { id: d.id }); break; } }
        if (g.s.prompt.type === 'setup' && r() < 0.5) { for (const u of s.z.hand.slice()) act('equip', { uid: u }); }
        if (g.s.prompt.type === 'setup') act('begin');
        break;
      }
      case 'turn': if (!(r() < 0.4 && free())) act('draw'); break;
      case 'pair': {
        const lamp = g.allItems().find((u) => ['T3', 'L16'].includes(g.def(u).code));
        if (lamp && r() < 0.3 && act('use', { uid: lamp }).ok) break;
        act('reveal', { slot: Math.floor(r() * 2) }); break;
      }
      case 'chooseOne': act('pickOne', { slot: Math.floor(r() * 2) }); break;
      case 'decide': {
        if (pr.forced || r() < (style === 'cautious' ? 0.7 : 0.55)) act('resolve'); else act('decline'); break;
      }
      case 'choice': {
        const ok = pr.options.filter((o) => !o.disabled);
        if (!ok.length) throw new Error('choice sin opciones');
        act('choose', { id: pick(ok).id }); break;
      }
      case 'pickCards': {
        const n = pr.min + Math.floor(r() * (pr.max - pr.min + 1));
        let uids = [...pr.uids].sort(() => r() - 0.5).slice(0, n);
        if (pr.purpose === 'avoidValue') uids = [...pr.uids];
        const res = act('pickCards', { uids });
        if (!res.ok) { act('pickCards', { uids: pr.uids.slice(0, pr.min) }); }
        break;
      }
      case 'avoidCard': { const o = pick([...pr.options, { id: 'fight' }]); act('avoidCard', { id: o.id }); break; }
      case 'avoidEnemy': { const ok = pr.options.filter((o) => !o.disabled); act('avoidEnemy', { id: r() < 0.4 && ok.length ? pick(ok).id : 'fight' }); break; }
      case 'pre': {
        if (r() < 0.5 && pr.options.length) { if (act('preUse', { id: pick(pr.options).id }).ok) break; }
        act('proceed'); break;
      }
      case 'attack': {
        const h = s.hero;
        const sp = pr.specials?.[0];
        if (sp && r() < 0.3) { act('special', { id: sp.id }); break; }
        if (pr.potions.length && r() < 0.5) { act('potionAttack', { uid: pr.potions[0] }); break; }
        if (pr.throwables.length && r() < 0.3) { act('throwItem', { uid: pr.throwables[0] }); break; }
        for (const u of g.allItems()) { const d = g.def(u); if (['L5', 'P1'].includes(d.code) && h.hp <= 5 && r() < 0.9) { act('use', { uid: u }); break; } }
        if (g.s.prompt?.type !== 'attack') break;
        const e = pr.hasWeapon ? Math.min(pr.maxEnergy, 1 + Math.floor(r() * 3)) : 0;
        const res = act('attack', { energy: e, furia: pr.furia && r() < 0.3 && e > 0, mandoble: pr.mandoble && r() < 0.3 && e > 0 });
        if (!res.ok) act('attack', { energy: 0 });
        break;
      }
      case 'postRoll': {
        const o = pr.options.find((x) => !x.id.startsWith('all:blessing') || r() < 0.3);
        if (o && r() < 0.5) act('reroll', { id: o.id }); else act('accept');
        break;
      }
      case 'enemyRoll': act(r() < 0.5 ? 'luckReroll' : 'luckKeep'); break;
      case 'merchant': {
        const k = r();
        if (k < 0.3) { const u = pick(pr.stock.length ? pr.stock : [0]); if (u && g.buyPrice(u) <= s.hero.gold) { act('merchantBuy', { uid: u }); break; } }
        if (k < 0.5) { const own = g.allItems(); if (own.length) { act('merchantSell', { uid: pick(own) }); break; } }
        act('leaveMerchant'); break;
      }
      case 'overweight': { const items = g.allItems().filter((u) => !g.def(u).fx?.cursed); act('dropOver', { uid: pick(items) }); break; }
      case 'divine': act('ack'); break;
      default: throw new Error(`Prompt no manejado: ${pr.type}`);
    }
  }
  if (!g.s.over) throw new Error(`La partida no terminó en ${maxSteps} pasos: ${log.slice(-12).join(' > ')}`);
  return { steps, over: g.s.over, log };
}
