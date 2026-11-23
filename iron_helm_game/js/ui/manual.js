/**
 * Manual de instrucciones integrado: se usa igual en el menú (ficha emergente) y dentro de la partida (pestaña del diario).
 * Tres apartados: juego original, ANEMIA 4.0 (modo fanmade) y controles de esta adaptación digital.
 */
import { h } from './dom.js';
import * as E from '../engine/index.js';
import { sound } from './audio.js';

const sec = (title, ...body) => [h('h4', title), ...body];
const p = (...c) => h('p.man-p', ...c);
const ul = (items) => h('ul.rules', ...items.map((t) => h('li', ...(Array.isArray(t) ? t : [t]))));
const b = (t) => h('b', t);

/* ------------------------------------------------------------------------------------------ juego original */
function original() {
  return [
    h('p.narr', 'Iron Helm es un juego en solitario de Jason Glover (Grey Gnome Games): un aventurero veterano busca un último botín antes de colgar la espada. Reglas según el reglamento 2.4.'),
    ...sec('Objetivo',
      p('Sobrevive a cinco niveles de mazmorra, derrota al jefe final y reúne el mayor ', b('fondo de jubilación'), ' posible. Si tu salud llega a 0, o el veneno la iguala, la aventura termina.')),
    ...sec('Preparación',
      ul(['Eliges héroe: parte con sus marcadores de salud, energía, raciones y oro, y con su equipo y habilidad iniciales.',
        'Con el oro inicial puedes comprar más equipo en la posada (recomendado) antes de entrar.',
        'Las 12 fichas de bendición se barajan boca abajo: 5 de salud, 5 de energía y 2 que curan el veneno.',
        'El peón empieza en el nivel 1 del mapa y el marcador de moral en 0.'])),
    ...sec('Un nivel y sus turnos',
      p('Cada nivel tiene ', b('8 turnos'), ' (el mazo de mazmorra, de 16 cartas, se roba de dos en dos).'),
      ul([[b('1. Robar'), ' dos cartas de mazmorra boca abajo.'],
        [b('2. Revelar'), ' una de ellas. Puedes ', b('afrontarla'), ' (parte 1) y la otra se descarta sin mirar, o ', b('descartarla'), ' y estar obligado a resolver la otra con su ', b('parte 2'), ' (más arriesgada).'],
        [b('3. Entre turnos'), ' puedes equiparte, comer una ración (+1 de energía) y aprender habilidades. Nunca durante una carta.']]),
      p('Cartas de mazmorra: Emboscada, Tesoro, Laberinto, Plantación de Setas, Trampa de Flechas y Escaramuza, además de narrativas como Campamento, Mercader, Altar o Claro.')),
    ...sec('Combate',
      ul([[b('Salud del enemigo'), ' = la de su carta + nivel + el ajuste de la carta de mazmorra.'],
        [b('Daño inicial'), ' (salvo emboscada del héroe): lanza 2d6, mayor − menor + daño base − tu armadura. ', b('Con dobles, falla.')],
        [b('Tu turno'), ': gastas de 0 a 3 de energía, un d6 por ficha, y sumas las bonificaciones del arma (hace falta un arma en la mano principal o a dos manos). Sin energía das un puñetazo de 1. Pociones ofensivas y armas arrojadizas sustituyen al ataque.'],
        [b('Contraataque'), ' del enemigo con la misma fórmula; se alterna hasta que uno cae.'],
        [b('Debilidades'), ': fuego, hielo y no muerto dan bonificación con las armas y pociones específicas.'],
        [b('Bendición'), ': puedes gastar una ficha de bendición en combate para relanzar todos tus dados.']])),
    ...sec('Botín tras vencer',
      ul(['Tesoro 0: nada.', 'Tesoro 1: una carta de botín ', b('o'), ' una moneda de oro, a elegir.', 'Tesoro 2: una carta de botín y una poción.', 'Bolsa de oro: monedas.', 'El enemigo derrotado va al cementerio.'])),
    ...sec('Equipo y mochila',
      p('Ranuras: ', b('MP'), ' mano principal · ', b('OM'), ' otra mano · ', b('2M'), ' dos manos · ', b('CP'), ' cuerpo · ', b('CA'), ' cabeza · ', b('AC'), ' accesorios (sin límite).'),
      p('No puedes superar tu ', b('carga'), ' máxima: si te pasas, hay que soltar objetos. Los objetos malditos no se quitan. Solo se cambia de equipo entre turnos.')),
    ...sec('Fin de nivel (en este orden)',
      ul(['Se baraja el mazo de mazmorra.', 'Comes una ración o pierdes 3 de salud.', 'Por cada 2 de veneno, el veneno crece en 1.', 'El peón sube un nivel (máximo 5).', 'Se roba y resuelve una trama.'])),
    ...sec('Tramas, moral y ojos del jefe',
      p('Cada trama suma de 1 a 3 ', b('ojos'), '. Al llegar a ', b('10 ojos'), ' despierta el jefe; tras el nivel 5 aparece aunque no los haya. Las decisiones de las tramas suben o bajan el marcador de ', b('moral'), ' (−5 a +5), que cuenta para la puntuación.')),
    ...sec('Aprender habilidades',
      p('Derrotar enemigos te da «experiencia»: tres enemigos (cinco si la habilidad es de otra competencia) se gastan para aprender una habilidad entre turnos. Se hace desde el Diario → Cementerio / Habilidades.')),
    ...sec('Jefe final',
      ul(['El jefe lo decide la ', b('debilidad más común'), ' de los enemigos derrotados (empates: fuego > no muerto > hielo > fuego). Las campañas fijan su propio jefe.', [b('Visita divina'), ': se voltean todas las fichas de bendición (salud, energía o curar el veneno).'], 'Se combate como contra cualquier otro enemigo.'])),
    ...sec('Puntuación: fondo de jubilación',
      p('1 punto por cada salud y energía restantes · 3 por moneda de oro · 2 por enemigo derrotado · valor de tus objetos · nivel de mazmorra × 2 · posición en el marcador de moral.'),
      p(b('Rango: '), '0–30 Tugurio · 31–40 Cabaña · 41–50 Granja · 51–60 Mansión · 61 o más Fortaleza.')),
    ...sec('Expansiones y reglas variantes',
      p('En el menú puedes elegir una ', b('campaña'), ' (otra mazmorra con su propio jefe), añadir ', b('expansiones modulares'), ' y activar ', b('reglas variantes'), ' opcionales. El botón ⓘ de cada una explica qué incluye y cómo cambia la partida.')),
  ];
}

/* ------------------------------------------------------------------------------------------ ANEMIA 4.0 */
function anemia() {
  const pack = E.listPacks().packs.find((x) => x.id === 'anemia');
  const variants = E.listVariants?.() || [];
  const heroes = (pack?.heroes || []).map((x) => [b(x.name), ` — salud ${x.health}, energía ${x.energy}${x.rations ? `, ${x.rations} ración` + (x.rations > 1 ? 'es' : '') : ''}${x.gold ? `, ${x.gold} de oro` : ''}.`]);
  const groups = []; for (const v of variants) { let g = groups.find((x) => x.name === (v.groupName || v.group)); if (!g) groups.push(g = { name: v.groupName || v.group || 'Otras', items: [] }); g.items.push(v); }
  return [
    h('p.narr', 'ANEMIA 4.0 es una expansión fanmade de Matthew Biddle (traducción y maquetación de Aizen Myo 4U, 2023). Es un «modo»: se activa desde el menú junto a cualquier aventura y suma contenido nuevo al juego.'),
    ...sec('Cómo se activa',
      p('En el menú, pestaña ', b('Aventura'), ' → «Modos fanmade» → Anemia 4.0. Sus cartas se mezclan con las de la partida; las reglas variantes se activan por separado en «Reglas variantes».')),
    ...sec('Qué añade',
      ul(pack?.rules?.length ? pack.rules : ['Nuevos héroes, jefes, enemigos, tramas, entornos, equipo, pociones, habilidades y aflicciones.'])),
    heroes.length ? [h('h4', 'Héroes'), ul(heroes)] : null,
    ...sec('Reglas que cambian la partida',
      ul([[b('Energía sin tope'), ': con la Sangre de Lobo y el Necronomicón la energía puede superar 14.'],
        [b('Dos debilidades'), ': el Samurái de las Sombras es débil al fuego y al hielo.'],
        [b('Jefes nuevos'), ' entran en el sorteo por debilidad: La Parca, Malnok, Tzxefytd, el Rey de los Muertos, el Reptiliano, el Gigante de los Hielos, el Samurái de las Sombras y el Señor del Tiempo (La Parca y el Señor del Tiempo solo aparecen con sus reglas variantes).'],
        [b('La Bestia'), ' solo puede llevar armas (dos de una mano o una a dos manos) y puede comerse al enemigo derrotado para ganar 2 de energía.'],
        [b('Peligros'), ' en el mazo de enemigos (Nube Gaseosa, Arenas Movedizas, Poza de Ácido): se evitan o se sufren como las trampas del juego base.'],
        [b('Aflicciones'), ' nuevas: Amnesia, Fiebre del Oro y Adrenalina, que se resuelven como las del juego base.'],
        [b('Enemigos especiales'), ': el Mutante mezcla a dos enemigos, el Asesino Sigiloso huye al llegar a 0 de salud, el Hombre Lobo solo cae ante la Daga de la Luna o la Moneda del Destino…']])),
    ...sec('Reglas variantes opcionales',
      p('Son independientes: activa las que quieras. Algunas requieren Anemia 4.0 y otras funcionan con cualquier partida. Toca ⓘ en el menú para ver el detalle de cada una.'),
      ...groups.map((g) => [h('h5.man-sub', g.name), ul(g.items.map((v) => [b(v.name), v.blurb ? ` — ${v.blurb}` : '']))])),
    p('Texto de las cartas con erratas de imprenta se conserva tal cual. Contenido no oficial hecho por la comunidad, sin relación con el editor original.'),
  ];
}

/* ------------------------------------------------------------------------------------------ controles */
function controls() {
  return [
    h('p.narr', 'Cómo se maneja esta adaptación digital, en pantalla táctil y en ordenador.'),
    ...sec('La mesa',
      ul([[b('Dos tableros'), ': las pestañas inferiores alternan entre ', b('Mazmorra'), ' y ', b('Personaje'), '. Arrastra la mesa y pellizca (o usa la rueda) para acercar; el botón de encuadre la recoloca.'],
        [b('Robar'), ': toca la puerta grande del mazo de mazmorra.'],
        [b('Revelar'), ': la primera carta se revela sola (se puede desactivar en Ajustes); elige después AFRONTAR o ARRIESGAR.'],
        [b('Combatir'), ': toca el fieltro para lanzar los dados y elige cuánta energía gastas.'],
        [b('Ver una carta'), ': toca cualquier carta para actuar; mantén pulsado (o clic derecho) para verla grande.']])),
    ...sec('Mochila y personaje',
      ul(['La ', b('Mochila'), ' guarda tus objetos. En la pestaña Personaje arrastras objetos entre la mochila y las ranuras del tapete, o a «SOLTAR AQUÍ».',
        'Toca una ficha del marcador superior (salud, energía, oro, raciones, veneno, bendiciones, carga, moral, ojos) para saber qué hace.'])),
    ...sec('Diario',
      p('El botón del libro abre el diario: mapa y moral, tramas resueltas, cementerio, habilidades, registro de la aventura y este manual.')),
    ...sec('Pausas y ajustes',
      p('En ', b('Ajustes'), ' eliges si las cartas esperan a que toques, un tiempo o nada; también el sonido, animaciones rápidas, robo automático y la cámara automática en móvil. La partida se guarda al inicio de cada turno y se continúa desde el menú.')),
    ...sec('Atajos de teclado',
      p(h('kbd', 'J'), ' diario · ', h('kbd', 'I'), ' mochila · ', h('kbd', '1'), '/', h('kbd', '2'), ' tableros · ', h('kbd', 'F'), ' encuadrar · ', h('kbd', 'M'), ' sonido · ', h('kbd', 'Espacio'), '/', h('kbd', 'Intro'), ' acción principal · ', h('kbd', 'Esc'), ' cerrar.')),
    ...sec('En el móvil',
      p('El botón «atrás» cierra lo último que hayas abierto; si no hay nada que cerrar, te pregunta si quieres volver al menú.')),
  ];
}

const TABS = [['original', 'Juego original', original], ['anemia', 'Anemia 4.0', anemia], ['controls', 'Controles', controls]];
export const MANUAL_TABS = TABS.map(([id, label]) => ({ id, label }));

/** Construye el manual con sus pestañas. `onTab` avisa del apartado visible (para recordarlo). */
export function manualBody({ tab = 'original', onTab } = {}) {
  const body = h('div.man-body'); const bar = h('div.man-tabs');
  const show = (id) => {
    const t = TABS.find((x) => x[0] === id) || TABS[0];
    bar.querySelectorAll('button').forEach((el) => el.classList.toggle('on', el.dataset.id === t[0]));
    body.replaceChildren(...t[2]().flat(Infinity).filter(Boolean)); body.scrollTop = 0; onTab?.(t[0]);
  };
  for (const [id, label] of TABS) bar.append(h('button.man-tab' + (id === tab ? '.on' : ''), { dataset: { id }, onclick: () => { sound.tap(); show(id); } }, label));
  show(tab);
  return h('div.manual', bar, body);
}
