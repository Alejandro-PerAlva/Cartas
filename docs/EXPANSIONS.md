# Expansiones

Las 15 expansiones del registro oficial están integradas: 7 campañas (Warren of Despair, Blackened Burrow,
Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge, The Spire of Zogar) y 8 módulos (Loot & Lore,
Realms & Relics, The Lonely Troll Inn, The Fanny Pack, Beasts & Burdens, The Howling Abyss, Iron Chest, Gnome Pack #1).
Son datos más una tabla de comportamiento; solo las mecánicas totalmente nuevas tocan el motor.

## 1. Imágenes
Las cartas (480×675 JPG) van en `iron_helm_game/assets/cards/expansions/<id>/card_000.jpg … card_NNN.jpg`.

## 2. Transcribir las cartas (`iron_helm_game/data-src/<id>.json`)
Un array con un objeto por carta y **el texto literal** impreso. `kind`:

| kind | se genera en | notas |
|---|---|---|
| `hero` | `heroes` | `trappings`/`skill` por nombre ("A y B"); `null` = sin equipo/habilidad; `finalScoreBonus` |
| `boss` | `bosses` | `weakness:"*"` = sin debilidad (Zogar), `immunities` |
| `enemy` | `enemies` · `loot` (`inLootDeck`) · `plotEnemies` (`inPlotDeck`/`plotEnemy`) | `trap:true` = trampa del mazo de enemigos |
| `loot` · `trapping` · `potion` | `loot` · `trappings` · `potions` | `slot:null` = se resuelve al robarla (con `FX.instant`) |
| `artifact` | `artifacts` | Terreno y Reliquias; `other`+`subkind:"artifact"` (Cápsula Corazón) va al botín salvo con Realms |
| `skill` · `plot` | `skills` · `plots` | `plot` con `miniboss` → `plotEnemies`; `table` (plot u opción) se conserva para la interfaz |
| `environment` | `environments` | `red` / `white` / `blue` (texto rojo, blanco, azul) |
| `mercenary` | `mercenaries` | `cost`, `die` (moral inicial = máxima), `white`, `red` |
| `dungeon1` · `dungeon2` | `dungeon` | tipo por nombre (Emboscada→`ambush`…); opciones con id estable (`cook`, `bless`…) |
| `adventure` | `adventures` | mapas de Encuentros Aleatorios (`level`, `transitions[{from,to,icon}]`) |
| `race` · `class` · `sign` | `gnome.{races,classes,signs}` | creador de personajes |
| `rules` | `rules[]` | la de Encuentros Aleatorios guarda su `table` en `meta.encounterTable` |
| `campaign` | `meta.intro`, `meta.campaign{level,removes,boss}` | `removes` por NOMBRE; si falta se lee del texto ("Enemigos: …") |
| `map` · `divider` · `tracker` · `other` | `meta.map` · `meta.backs` · — | separadores útiles como dorso: `environments, artifacts, mercenaries, afflictions, dungeon` |

`npm run gen:data` regenera `js/data/packs/<id>.gen.js` (copias idénticas fusionadas con `copies` e `imgs`).

### Identificadores y claves
- `id` = código en minúsculas; si otro paquete (o el juego base) ya lo usa, se prefija: `galnok_t21`.
- `key` = código impreso o, si colisiona, `paquete:código`. **Las tablas de `pack-fx.js` y el motor usan la clave.**
  Colisiones reales de la edición española: `galnok:T21` (Mochila Grande ≠ Corcesca), `galnok:L25` (Máscara de Mizlak ≠
  Remedio de Wrenna) y `spire:PT31..PT33` (tramas de Zogar ≠ minijefes de Bestias y Trabas). Los paquetes se procesan en
  un orden fijo, así los cinco primeros conservan sus ids históricos.
- `cat.byCode.get(clave)` devuelve la carta (primero las activas, luego cualquier expansión).

## 3. Comportamiento (`js/data/pack-fx.js`)
- `PACKS`: `id, name, es, type ('campaign'|'module'), number, blurb, rules[]` y, en campañas, `remove{enemies,plots}`
  (códigos del juego base, comprobados contra los nombres de la carta de campaña por un test), `boss` (clave),
  `adventureLevel` (el "NIVEL n" impreso), `includes` (Zogar → `beasts`); `exclusive:'dungeonDeck'` (Howling).
- `POWERS[clave]`, `FX[clave]`, `PLOT_OPS[clave]` (con `pre`, `options[i]`, `req[i]`), `ENV_FX[clave]`,
  `DUNGEON_FX[clave]` (parámetros por parte de cada carta de mazmorra). Vocabulario documentado en la cabecera de cada tabla.
- Lo que no cabe en una clave declarativa se interpreta en el motor buscando la clave de la carta (`hasCode('T24')`,
  `case 'L46'`…): ver la columna «Dónde» de la tabla de cobertura.

## 4. Comprobar
`npm test`: `tests/campaigns.test.js` y `tests/modules.test.js` tienen un escenario con dados trucados (`rig`) por carta;
`tests/playthrough.test.js` juega 80 partidas por configuración (todas las campañas y módulos solos, combinaciones y
personajes del Gnome Pack) auditando en cada paso que ninguna carta se duplique ni se pierda.

## 5. Tabla de cobertura (cartas nuevas → efecto → test)
Las cartas de las cinco primeras expansiones están cubiertas por `tests/expansions.test.js`.
| Paquete | Clave | Carta | Efecto | Dónde | Test |
|---|---|---|---|---|---|
| galnok | `C7` | Azzlar | Héroe (Daga de la Luna, Sexto Sentido) | héroe | campaigns: «S15 Sexto Sentido (Azzlar): evita una emboscada o revela …» |
| galnok | `B6` | Galnok | Sus dobles no fallan: impacto = valor de un dado + daño | POWERS | campaigns: «B6 Galnok: con dobles no falla, te impacta por el valor d…» |
| galnok | `E18` | Vidente de la Muerte ×2 | Inmune a las pociones (no se ofrecen) | POWERS | campaigns: «E18 Vidente de la Muerte: inmune a las pociones (no se of…» |
| galnok | `E17` | Calavera Flotante ×3 | Moral +1 al derrotarla | POWERS | campaigns: «E17 Calavera Flotante: al derrotarla sube la moral» |
| galnok | `L27` | Alijo de Mizlak | Instantánea al robarla: botín+poción+ración o d6 oro+ración | FX + motor | campaigns: «L27 Alijo de Mizlak: se resuelve al robarlo (botín+poción…» |
| galnok | `galnok:L25` | Máscara de Mizlak | Evita no muertos de salud base ≤ 4 | FX + motor | campaigns: «L25 Máscara de Mizlak (galnok): evita a los no muertos de…» |
| galnok | `L26` | Diario de Mizlak | Revela 5 de botín, descarta las que quieras, el resto vuelve encima | motor | campaigns: «L26 Diario de Mizlak: revela 5 de botín, descarta las que…» |
| galnok | `T19` | Brebaje de Hulnot | +3 de energía | motor | campaigns: «T19 Brebaje de Hulnot: +3 de energía» |
| galnok | `galnok:T21` | Mochila Grande | +2 de carga; +1 salud al Descansar | FX | campaigns: «T21 Mochila Grande (galnok): +2 de carga y +1 de salud al…» |
| galnok | `T20` | Daga de la Luna | Daga; relanza un ataque enemigo (1/nivel) | FX + motor | campaigns: «T20 Daga de la Luna: una vez por nivel relanza la tirada …» |
| galnok | `S15` | Sexto Sentido | Evita una emboscada o revela ambas cartas (1/nivel, compartido) | motor | campaigns: «S15 Sexto Sentido (Azzlar): evita una emboscada o revela …» |
| galnok | `PT16` | El Agresor | −1 salud previo; 2 oro · moral+1 y bendición | PLOT_OPS | campaigns: «PT16 El Agresor: pierdes 1 de salud antes de elegir; 2 de…» |
| galnok | `PT18` | Comida Sospechosa | Nada · d6 par +2 energía, impar +1 energía +1 veneno · −1 ración, bendición, moral+1 | PLOT_OPS | campaigns: «PT18 Comida Sospechosa: dado par +2 de energía, impar +1 …» |
| galnok | `PT17` | Venganza | 2 oro: retira el Mimético (L8) y baraja · nada · si ya lo derrotaste +2 oro | PLOT_OPS | campaigns: «PT17 Venganza: 2 de oro para retirar al Mimético del botí…» |
| crystal | `C8` | Brazwitz | Héroe (Capa de Lana, Espada Enana, Estrategia) | héroe | campaigns: «T24 Capa de Lana (Brazwitz): una vez por nivel resta 1 a …» |
| crystal | `B7` | Dragón de Cristal | ≥ 8 de daño: destruye 1 objeto equipado a elegir | POWERS | campaigns: «B7 Dragón de Cristal: con 8 o más de daño destruye un obj…» |
| crystal | `E20` | Blizzling ×4 | ≥ 3 de daño: +1 veneno | POWERS | campaigns: «E20 Blizzling: si te inflige 3 o más de daño ganas 1 de v…» |
| crystal | `E19` | Cubo de Hielo | No falla con dobles | POWERS | campaigns: «E19 Cubo de Hielo: no falla con dobles» |
| crystal | `L33` | El Cetro | Al robar enemigo roba 2 y elige | motor | campaigns: «L33 El Cetro: al robar un enemigo robas dos y eliges» |
| crystal | `L31` | Mortero y Maja | +1 salud con pociones de salud, +2 daño con pociones | FX | campaigns: «L31 Mortero y Maja: +1 de salud con pociones de salud y +…» |
| crystal | `L34` | Excremento de Troll | Sin efecto | — | campaigns: «L34 Excremento de Troll: no tiene efecto (vale 0 y pesa 1)» |
| crystal | `L32` | Sello de Zogar | Mira el descarte de mazmorra (1/nivel, evento peekCards) | motor | campaigns: «L32 Sello de Zogar: una vez por nivel miras el descarte d…» |
| crystal | `T24` | Capa de Lana | −1 a un daño inicial (1/nivel, reacción) | motor | campaigns: «T24 Capa de Lana (Brazwitz): una vez por nivel resta 1 a …» |
| crystal | `T25` | Espada Enana | +2 contra goblins/orcos/trolls | FX | campaigns: «T25 Espada Enana: +2 contra goblins, orcos y trolls» |
| crystal | `S19` | Estrategia | Tras tirar: 1 energía para relanzar todo | motor | campaigns: «S19 Estrategia: tras tirar puedes gastar 1 de energía par…» |
| crystal | `PT22` | El Huraño | −1 ración, moral+2 · nada · poción, moral−2 | PLOT_OPS | campaigns: «PT22 El Huraño: compartir comida (−1 ración, moral +2), n…» |
| crystal | `PT23` | El Pináculo de Marfil | Moral>0: bendiciones = moral · moral<0: enemigo +3 inicial +6 salud | PLOT_OPS | campaigns: «PT23 El Pináculo de Marfil: moral positiva → bendiciones;…» |
| crystal | `PT24` | El Viejo Libro | −2 salud y habilidad aleatoria · nada | PLOT_OPS | campaigns: «PT24 El Viejo Libro: 2 de daño y una habilidad aleatoria» |
| throne | `C9` | Grimmly | Héroe (Bastón de Peregrino, Petaca, Correr) | héroe | campaigns: «T26 Petaca (Grimmly): +2 de salud, una vez; se rellena gr…» |
| throne | `B8` | Elemental de Fuego | ≥ 8 de daño: destruye lo del Cuerpo | POWERS | campaigns: «B8 Elemental de Fuego: con 8 o más de daño destruye lo qu…» |
| throne | `E21` | Piel de Lagarto ×2 | Si inflige daño: −1 energía | POWERS | campaigns: «E21 Piel de Lagarto: si te inflige daño pierdes también 1…» |
| throne | `E22` | Vampiro de Fuego ×3 | Contraataque con éxito: +2 veneno | POWERS | campaigns: «E22 Vampiro de Fuego: solo su contraataque envenena (+2)» |
| throne | `L35` | Aguijón de Grasgol | d6 antes del daño inicial (1/nivel) | FX + motor | campaigns: «L35 Aguijón de Grasgol: una vez por nivel, antes del daño…» |
| throne | `L36` | Cuerno Maldito | Maldito: no se suelta ni vende | FX | campaigns: «L36 Cuerno Maldito: no se puede tirar ni vender» |
| throne | `L37` | Cazadora de Olum | 5/6: +3 cada uno contra débiles al fuego | FX | campaigns: «L37 Cazadora de Olum: cada 5 o 6 inflige +3 contra enemig…» |
| throne | `L38` | Protección de Olum | Escudo −1/−1, −1 extra contra débiles al hielo | FX | campaigns: «L38 Protección de Olum: −1 al daño inicial y a los contra…» |
| throne | `T27` | Bastón de Peregrino | Relanza 6; +2 contra no muertos | FX | campaigns: «T27 Bastón de Peregrino: relanza los 6 y +2 contra no mue…» |
| throne | `T26` | Petaca | +2 salud; vacía hasta el Campamento | motor | campaigns: «T26 Petaca (Grimmly): +2 de salud, una vez; se rellena gr…» |
| throne | `S20` | Correr | Evita cualquier carta: d6 → mitad/1/0 de energía (1/nivel) | motor | campaigns: «S20 Correr (Grimmly): una vez por nivel evitas cualquier …» |
| throne | `PT26` | La Vieja Goblin | Poción, −2 energía, moral+2 · poción, +2 oro, moral−2 | PLOT_OPS | campaigns: «PT26 La Vieja Goblin: ayudarla (poción, −2 energía, moral…» |
| throne | `PT27` | Columna de Fuego | Descarta enemigo sin gastar → oro = su bolsa, −1 energía · nada | PLOT_OPS | campaigns: «PT27 Columna de Fuego: arroja un enemigo derrotado sin ga…» |
| throne | `PT25` | El Loco | d6: 1-2 enemigo, 3-4 +2 energía, 5-6 botín · nada | PLOT_OPS | campaigns: «PT25 El Loco: tabla d6 (1-2 enemigo, 3-4 +2 de energía, 5…» |
| malicia | `C10` | Eldra | Héroe (Bastón del Cuervo, Antorcha, Drenaje Vital) | héroe | campaigns: «T28 Bastón del Cuervo (Eldra): puedes perder salud en vez…» |
| malicia | `B9` | Malicia | Daño base + tu moral | POWERS | campaigns: «B9 Malicia: su daño se modifica con tu posición en el con…» |
| malicia | `E23` | Guerrero Maldito ×3 | Evitable con 1 bendición; +1 bendición al derrotarlo | POWERS | campaigns: «E23 Guerrero Maldito: se evita gastando una bendición; al…» |
| malicia | `E24` | Sacerdote Maldito ×2 | Daño inicial + nº de bendiciones | POWERS | campaigns: «E24 Sacerdote Maldito: daño inicial extra igual a tus ben…» |
| malicia | `L40` | Granada de Mano Sagrada | Derrota a un enemigo de salud base ≤ 6 | FX + motor | campaigns: «L40 Granada de Mano Sagrada: derrota a un enemigo de 6 o …» |
| malicia | `L39` | Mimético No Muerto | Mimético en el botín; evitable con 1 bendición | POWERS | campaigns: «L39 Mimético No Muerto: sale del mazo de botín y se evita…» |
| malicia | `L41` | Botas de la Presteza | Atacas primero en una escaramuza (1/nivel) | motor | campaigns: «L41 Botas de la Presteza: una vez por nivel atacas primer…» |
| malicia | `L42` | Látigo | Dados que coinciden: vuelves a atacar sin contraataque | FX | campaigns: «L42 Látigo: si los dados coinciden vuelves a atacar sin c…» |
| malicia | `T28` | Bastón del Cuervo | Al ganar veneno puedes perder esa salud | motor | campaigns: «T28 Bastón del Cuervo (Eldra): puedes perder salud en vez…» |
| malicia | `T29` | Pan de Bruja | Descarta bendiciones → energía | motor | campaigns: «T29 Pan de Bruja: descarta tus bendiciones y gana esa ene…» |
| malicia | `S21` | Drenaje Vital | 2 energía: d6 de daño y esa salud; no ganas bendiciones | motor | campaigns: «S21 Drenaje Vital (Eldra): 2 de energía para infligir d6 …» |
| malicia | `PT28` | La Pendiente Resbaladiza | Escalar hasta un 6 (1: −nivel−2 salud, 2-3 −1 energía, 4-5 +1 oro, 6 oro=nivel+botín+poción) | PLOT_OPS | campaigns: «PT28 La Pendiente Resbaladiza: se escala hasta sacar un 6…» |
| malicia | `PT29` | La Estatua con Alas | Tabla por moral (−5…+5) | PLOT_OPS | campaigns: «PT29 La Estatua con Alas: tabla según la moral» |
| malicia | `PT30` | El Hombre Enjaulado | −2 energía, moral+2 · poción, moral−2 | PLOT_OPS | campaigns: «PT30 El Hombre Enjaulado: liberarlo (−2 energía, moral +2…» |
| spire | `B10` | Zogar | Inmune a sagrado/fuego/hielo; sus dobles: −2 energía | POWERS | campaigns: «B10 Zogar: inmune a pociones de fuego, hielo y sagradas y…» |
| spire | `E31` | Umruss ×2 | Impacto: +1 veneno | POWERS | campaigns: «E31 Umruss (veneno al impactar), E32 Poseído (−1 bendició…» |
| spire | `E32` | Poseído ×3 | Impacto: −1 bendición | POWERS | campaigns: «E31 Umruss (veneno al impactar), E32 Poseído (−1 bendició…» |
| spire | `E33` | Señor de Huesos | Al derrotarlo: bendiciones = moral | POWERS | campaigns: «E31 Umruss (veneno al impactar), E32 Poseído (−1 bendició…» |
| spire | `L43` | Espada del Vidente | Al matar con ella revelas el siguiente enemigo | motor | campaigns: «L43 Espada del Vidente: al derrotar a un enemigo con ella…» |
| spire | `L44` | Escudo de Drenaje | Bloquea el daño inicial y +3 salud (1/nivel) | motor | campaigns: «L44 Escudo de Drenaje: una vez por nivel bloquea todo el …» |
| spire | `L45` | Capa de Cultista | Evita enemigos de salud base ≤ 5 (1/nivel) | motor | campaigns: «L45 Capa de Cultista: una vez por nivel evita a un enemig…» |
| spire | `L46` | Elixir de Helgen ×2 | +3 salud, +3 energía, −2 veneno | motor | campaigns: «L46 Elixir de Helgen: +3 de salud, +3 de energía y −2 de …» |
| spire | `spire:PT31` | El Maligno | Vender bendiciones: 1→2 oro o 1 ración; 2→poción | PLOT_OPS | campaigns: «PT31 El Maligno (spire): vende bendiciones por oro, racio…» |
| spire | `spire:PT32` | La Choza | Emboscada con iniciativa (+nivel); al ganar +1 botín +3 oro · −1 energía | PLOT_OPS | campaigns: «PT32 La Choza (spire): emboscada con iniciativa; tras la …» |
| spire | `spire:PT33` | El Ciervo Atrapado | Moral+2, bendición · +3 salud +2 energía moral−2 | PLOT_OPS | campaigns: «PT33 El Ciervo Atrapado (spire): liberarlo (moral +2, ben…» |
| spire | `PT34` | El Viejo Puente | Descarta hasta carga ≤ 8 · −2 salud −1 energía | PLOT_OPS | campaigns: «PT34 El Viejo Puente: aligerar la carga hasta 8 o cruzar …» |
| spire | `PT35` | La Pila de Huesos | Poción, +2 oro, −1 energía, moral−1 · moral+2 | PLOT_OPS | campaigns: «PT35 La Pila de Huesos: buscar (poción, 2 de oro, −1 ener…» |
| realms | `EN1` | La Ciénaga | Enemigos +1 daño; Buscar +1 ración; setas +1 | ENV_FX | modules: «EN1 La Ciénaga: enemigos +1 de daño; +1 ración al buscar …» |
| realms | `EN2` | El Yermo | Hielo +2 daño; sin forraje; Altar +2 bendiciones; hielo +1 oro | ENV_FX | modules: «EN2 El Yermo: hielo +2 de daño; sin buscar comida ni seta…» |
| realms | `EN3` | La Sombra | Emboscada 1ª = parte 2; Tesoro +2 oro; +1 poción por enemigo | ENV_FX | modules: «EN3 La Sombra: la emboscada como primera carta se resuelv…» |
| realms | `EN4` | El Glaciar | Fuego +2 daño; sin forraje; Tesoro +1 poción; fuego +1 oro | ENV_FX | modules: «EN4 El Glaciar: fuego +2 de daño; sin forraje; +1 poción …» |
| realms | `EN5` | Las Catacumbas | No muertos +2; sin Altar; tramas: roba 2 elige 1; no muertos +1 oro | ENV_FX | modules: «EN5 Las Catacumbas: no muertos +2; sin Altar; robas 2 tra…» |
| realms | `EN6` | Túnel Abandonado | Flechas +2 daño; Mercader→Emboscada; +1 oro en Tesoro/Altar/enemigos | ENV_FX | modules: «EN6 Túnel Abandonado: la trampa de flechas hace 2 de daño…» |
| realms | `EN7` | El Santuario | +1 bendición inmediata; Tesoro +1 poción; Altar +3 salud; +1 bendición por enemigo | ENV_FX | modules: «EN7 El Santuario: bendición inmediata; +1 poción en el Te…» |
| realms | `EN8` | Las Miradas | +1 ojo inmediato; Campamento +1 ojo; Tesoro +1 bendición | ENV_FX | modules: «EN8 Las Miradas: 1 ojo inmediato y otro al resolver el Ca…» |
| realms | `EN9` | El Altiplano | Laberinto +1 ración (3 de daño si falta); Altar +salud=moral; +2 contra el jefe | ENV_FX | modules: «EN9 El Altiplano: el Laberinto exige 1 ración más (3 de d…» |
| realms | `AT1` | Cinturón de Poder de Ogro | +2 daño por energía en un ataque (1/nivel) | motor | modules: «AT1 Cinturón de Poder de Ogro: una vez por nivel +2 de da…» |
| realms | `AT2` | Seta de Colmena Dorada | En el Campamento: descártala → salud al máximo | motor | modules: «AT2 Seta de Colmena Dorada: cocinarla en el Campamento re…» |
| realms | `AT3` | Armadura Divina | Armadura = moral + 1 | FX | modules: «AT3 Armadura Divina: resta tu moral +1 al daño inicial y …» |
| realms | `AT4` | Venganza | +1 salud por cada 6 | FX | modules: «AT4 Venganza: +1 de salud por cada 6 de un ataque» |
| realms | `AT5` | Estrella de Brahma | Dobles del enemigo: 5 de daño al enemigo | motor | modules: «AT5 Estrella de Brahma: cada vez que el enemigo saca dobl…» |
| realms | `AT6` | Desangradora | Cada 6 suma el nivel | FX | modules: «AT6 Desangradora: cada 6 suma el nivel de la mazmorra» |
| realms | `AT7` | Portador del Destino | Atacar pagando salud (+1) | motor | modules: «AT7 Portador del Destino: atacar gastando salud en vez de…» |
| realms | `AT8` | Boñiga de Dragón | Instantánea: 1d6 de oro | FX + motor | modules: «AT8 Boñiga de Dragón: al robarla encuentras 1d6 de oro y …» |
| troll | `C15` | Mizlak el Mendigo | Sin equipo/habilidad/raciones; +10 puntos si ganas | héroe | modules: «C15 Mizlak el Mendigo: sin equipo, habilidad ni raciones;…» |
| troll | `T36` | Dagas de Puño | Puñetazos de 2 | FX + motor | modules: «T36 Dagas de Puño: los puñetazos infligen 2 de daño» |
| troll | `T37` | Cofia Tachonada | −1 inicial; se rompe con 4+ | FX | modules: «T37 Cofia Tachonada: −1 al daño inicial; se rompe con un …» |
| troll | `T30` | Rosario de Fe | Altar +2 salud | motor | modules: «T30 Rosario de Fe: +2 de salud en el Altar» |
| troll | `T31` | Piedra de Afilar | Da la vuelta a un dado (1/nivel) | motor | modules: «T31 Piedra de Afilar: una vez por nivel da la vuelta a un…» |
| troll | `T32` | Dardo Envenenado | Arrojadiza 3d6 (accesorio) | FX | modules: «T32 Dardo Envenenado: se descarta para infligir 3d6 (desd…» |
| troll | `T33` | Ajo | Evita un ataque de un no muerto (reacción) | motor | modules: «T33 Ajo: se descarta para evitar un ataque de un no muerto» |
| troll | `T34` | Tomo de Fuego | Bomba de Mecha ×2; +1 contra fuego | FX | modules: «T34 Tomo de Fuego: duplica la Bomba de Mecha; +1 contra e…» |
| troll | `T35` | Tomo de Hielo | Esquirla de Hielo ×2; +1 contra hielo | FX | modules: «T35 Tomo de Hielo: duplica la Esquirla de Hielo; +1 contr…» |
| troll | `HM1` | Borko | Voltea un dado (1/nivel); Campamento +1 ración; comer al final del nivel o −1 moral | motor | modules: «HM1 Borko: da la vuelta a un dado (1/nivel); busca en el …» |
| troll | `HM2` | Matilda | Pociones +1 (ataque y salud); Campamento +1 energía +1 salud; −1 moral con golpes ≥ 3; sin pago | FX + motor | modules: «HM2 Matilda: +1 a las pociones de ataque y de salud; coci…» |
| troll | `HM4` | Eydis | +1 ataque, −1 a ataques enemigos; Campamento +1 ración; 1 oro por nivel o se va | FX + motor | modules: «HM4 Eydis: +1 al ataque y −1 a los ataques enemigos; +1 r…» |
| troll | `HM5` | Bogdana | Setas +1; Campamento +3 energía; −1 moral contra salud base ≥ 5 | motor | modules: «HM5 Bogdana: +1 ración en las setas; +3 de energía en el …» |
| troll | `HM6` | Farzad | Ignora el Laberinto; relanza todo (1/nivel); −1 moral por ojo | motor | modules: «HM6 Farzad: ignora el Laberinto; relanza todos tus dados …» |
| troll | `HM7` | Godfrey | +2 contra no muertos; Altar +2 energía; −1 moral al matar vivos; veta tramas que bajan la moral | FX + motor | modules: «HM7 Godfrey: +2 contra no muertos; reza en el Altar (+2 e…» |
| troll | `HM8` | Olive | Campamento: cura todo el veneno; −1 moral al matar salud base ≥ 6 | motor | modules: «HM8 Olive: cura todo el veneno en el Campamento; pierde m…» |
| troll | `HM3` | Yak | +4 carga; Descansar +1 energía; −1 moral ante no muertos | FX + motor | modules: «HM3 Yak: +4 de carga; +1 de energía si descansas en el Ca…» |
| howling | `D11` | Emboscada ×3 | P1 +3 al primer ataque; P2 salud +nivel+5 | DUNGEON_FX | modules: «D11 Emboscada (Howling): parte 1 +3 al primer ataque; par…» |
| howling | `D12` | Tesoro | P2: botín+poción o d6 oro+ración | DUNGEON_FX | modules: «D12 Tesoro (Howling): parte 2 a elegir: botín y poción, o…» |
| howling | `D13` | Laberinto | P1 +1 oro; P2 3 de daño por ración y +1 poción | DUNGEON_FX | modules: «D13 Laberinto (Howling): parte 1 ración (o 3 de daño) y +…» |
| howling | `D14` | Plantación de Setas | Tablas d6 de raciones/veneno | DUNGEON_FX | modules: «D14 Plantación de Setas (Howling): tablas de d6 por parte» |
| howling | `D15` | Trampa de Flechas | Tablas d6 de veneno | DUNGEON_FX | modules: «D15 Trampa de Flechas (Howling): tablas de d6 por parte» |
| howling | `D16` | Escaramuza ×2 | P1 +nivel; P2 +nivel+4 y +1 oro | DUNGEON_FX | modules: «D16 Escaramuza (Howling): parte 1 salud +nivel; parte 2 +…» |
| howling | `D17` | Campamento | Buscar: ración + oro; Descansar: +3 salud | DUNGEON_FX | modules: «D17 Campamento (Howling): Buscar = ración + oro; Descansa…» |
| howling | `D18` | Mercader | Bazar fijo 3+2; Comerciar | DUNGEON_FX | modules: «D18 Mercader (Howling): bazar fijo de 3 botines y 2 pocio…» |
| howling | `D19` | Altar | Bendición/Fuerza/Curación/Merced | DUNGEON_FX | modules: «D19 Altar (Howling): Bendición, Fuerza (+2 energía), Cura…» |
| howling | `D20` | Claro | Roba una trama | DUNGEON_FX | modules: «D20 Claro (Howling): roba una trama» |
| howling | `D21` | Arcángel | Salud según la moral | DUNGEON_FX | modules: «D21 Arcángel: salud según tu posición en el control de moral» |
| howling | `D22` | Ídolo Falso | 4 súplicas | DUNGEON_FX | modules: «D22 Ídolo Falso: suplicar poder, riqueza o vida (moral −1…» |
| howling | `D23` | Fuente Mística | Tabla d6 | DUNGEON_FX | modules: «D23 Fuente Mística: tabla de d6 (1 enemigo, 2 +3 salud, 3…» |
| howling | `D24` | Encuentro Salvaje ×2 | Roba 2/4 enemigos, lucha con el de más salud (+nivel+1/+3) | DUNGEON_FX | modules: «D24 Encuentro Salvaje: roba 2 (o 4) enemigos y lucha cont…» |
| iron_chest | `MAP1` | Aventura de Nivel 1 ×2 | Mapa de encuentros (nivel 1) | motor (mapa) | modules: «Iron Chest: el mapa de encuentros se elige por el nivel d…» |
| iron_chest | `MAP2` | Aventura de Nivel 2 ×2 | Mapa de encuentros (nivel 2) | motor (mapa) | modules: «Iron Chest: el mapa de encuentros se elige por el nivel d…» |
| iron_chest | `MAP3` | Aventura de Nivel 3 ×2 | Mapa de encuentros (nivel 3) | motor (mapa) | modules: «Iron Chest: el mapa de encuentros se elige por el nivel d…» |
| iron_chest | `MAP4` | Aventura de Nivel 4 ×2 | Mapa de encuentros (nivel 4) | motor (mapa) | modules: «Iron Chest: el mapa de encuentros se elige por el nivel d…» |
| gnome | `C18` | Grubrot | Héroe (Bastón del Cuervo, Vestiduras, Alquimia) | héroe | modules: «C18 Grubrot: Bastón del Cuervo (de otra expansión, inyect…» |
| gnome | — | Gnome: razas | Humano, Kroling, Enano, Elfo del Bosque, Gnomo, Mediano, Semiorco, Tritón | motor | modules: «Raza …» (8 tests) |
| gnome | — | Clases (8) y Signos Astrales (12) | Bonos, raciones, oro, habilidad inicial; competencia, moral y equipo inicial | catalog (evalCustomHero) | modules: «Gnome: creador de personajes…», «Gnome: validación…», «Gnome: el equipo…» |
