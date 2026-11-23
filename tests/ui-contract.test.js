import test from 'node:test';
import assert from 'node:assert/strict';
import { start, give, discardAll } from './helpers/scenario.js';

/* Lo que la interfaz le pregunta al motor para ofrecer «USAR» en la mochila */
test('usableNow: una poción de salud se puede usar entre turnos; una espada o un escudo no', () => {
  const g = start('c1'); discardAll(g);
  const pocion = give(g, 'P1'); const hacha = give(g, 'T1');
  assert.equal(g.s.prompt.type, 'turn');
  assert.deepEqual(g.usableNow(pocion), { when: 'free' });
  assert.equal(g.usableNow(hacha), null);
  assert.equal(g.usableNow(99999), null, 'un objeto que no llevas no se puede usar');
});

test('usableNow: la Antorcha solo se puede usar justo después de robar las dos cartas', () => {
  const g = start('c1'); discardAll(g);
  const antorcha = give(g, 'T3');
  assert.equal(g.s.prompt.type, 'turn');
  assert.equal(g.usableNow(antorcha), null, 'al empezar el turno no');
  g.act('draw'); assert.equal(g.s.prompt.type, 'pair');
  assert.deepEqual(g.usableNow(antorcha), { when: 'pair' });
});

test('usableNow: la Petaca vacía no se puede usar hasta rellenarla', () => {
  const g = start('c1'); discardAll(g);
  const petaca = give(g, 'T26');
  if (!g.usableNow(petaca) && !g.def(petaca).key) return;           // (sin la expansión no hay Petaca)
  g.s.cards[petaca].empty = true;
  assert.equal(g.usableNow(petaca), null);
});
