# Expansiones

Las 15 expansiones del registro oficial están integradas: 7 campañas (Warren of Despair, Blackened Burrow,
Galnok's Labyrinth, Crystal Caverns, Throne of Embers, Malicia's Refuge, The Spire of Zogar) y 8 módulos (Loot & Lore,
Realms & Relics, The Lonely Troll Inn, The Fanny Pack, Beasts & Burdens, The Howling Abyss, Iron Chest, Gnome Pack #1).
A ellas se suma un **modo fanmade**, ANEMIA 4.0 (sección 6), con sus reglas variantes. Son datos más una tabla de comportamiento; solo las mecánicas totalmente nuevas tocan el motor.

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
| `rules` con `group` | `rules[]` | textos de las variantes de ANEMIA (`group`: `origin`, `epilogue`, `enchantment`…; `table`; sin imagen) |
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
- `PACKS`: `id, name, es, type ('campaign'|'module'|'mode'), number, blurb, rules[]` y, en campañas, `remove{enemies,plots}`
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

## 6. ANEMIA 4.0 (modo fanmade)

Expansión fanmade de Matthew Biddle (tradumaquetación Aizen Myo 4U, 2023): `type: 'mode'` en `PACKS` (se activa en `config.modules` pero la
interfaz la muestra en «Modos fanmade»). Datos en `data-src/anemia.json` → `js/data/packs/anemia.gen.js`; comportamiento en
`pack-fx.js` (`POWERS`, `FX`, `PLOT_OPS`, `ENV_FX`, `VARIANTS`, `FEMALE_HEROES`, `HARD_ITEMS`) y en `js/engine/anemia.js` (cartas) y
`js/engine/variants.js` (reglas variantes); el resto son ganchos en `combat.js`, `scenes.js`, `items.js`, `expansions.js` y `game.js`.

**Contenido transcrito** (imágenes `assets/cards/expansions/anemia/`, 144 archivos de los que 72 son cartas reales y el resto separadores repetidos):
5 héroes · 8 jefes (La Parca y el Señor del Tiempo fuera del mazo) · 12 enemigos (3 son peligros del mazo de enemigos: `trap:true`) ·
5 de equipo · 4 pociones · 7 habilidades · 3 aflicciones · 4 entornos · 2 esbirros · 22 tramas (21 + el minijefe Unicornio Bicéfalo). Además
44 entradas `kind:'rules'` con `group` (intro, tablas de Pueblo/Motivación/Momentos/Entornos temáticos, 21 epílogos, 10 encantamientos, 5 lugares
de retiro, Metal Inmortal y los dos desafíos): son el texto de las variantes y el motor las lee de `GENERATED.anemia.rules`.

Campos nuevos de la transcripción (los copia `gen-data.mjs`): `only:'metalInmortal'` (carta que no entra en ningún mazo: Guitarra Hacha, Chaqueta con
Tachuelas, Lírica Bestial, Señor del Tiempo; el Señor del Tiempo entra en el mazo de jefes con esa variante), `special:'parca'` (jefe fuera del mazo),
`stats` (estadísticas de un esbirro como enemigo: Gral), `weakness2` → `weaknesses[]` (Samurái de las Sombras: fuego y hielo), `encumbrance:'*'`
(La Bestia), `health/damage/treasure:'*'` (Mutante), `kind:'rules'` con `group`/`table`/`counts` y sin imagen.

### Cobertura carta a carta
| Clave | Carta | Efecto | Dónde | Test |
|---|---|---|---|---|
| `ANC1` | Gene Slash | 10/8/8/0/0, Guitarra Hacha + Chaqueta con Tachuelas, Lírica Bestial | héroe + FX | anemia: «ANC1 Gene Slash…» |
| `ANC2` | La Bestia | 14/14, carga "*" (solo armas), se come al enemigo derrotado (+2 de energía) | héroe + motor (`carryRule`, `eatEnemy`) | anemia: «ANC2 La Bestia…» (3) |
| `ANC3` | Mae | 10/10/9/1/4, Espada de Appleton, Estrategia; femenina | héroe + `FEMALE_HEROES` | anemia: «ANC3 Mae…» |
| `ANC4` | Samurái | 12/12/10/1/1, Espada Samurái, Doble Fase | héroe | anemia: «ANC4 Samurái…» |
| `ANC5` | Thorn | 7/10/11/1/2, Bastón del Cuervo, Vestiduras, Sangre Envenenada | héroe | anemia: «ANC5 Thorn…» |
| `ANB1` | La Parca | 24/4/0 no muerto; con dobles relanza ambos dados | POWERS `rerollDoubles` | anemia: «ANB1 La Parca…» |
| `ANB2` | Malnok | 20/3/2; con dobles te impacta por un dado +1 | POWERS `doublesHitDie`+`doublesHitPlus` | anemia: «ANB2 Malnok…» |
| `ANB3` | Tzxefytd | Sin salud: energía d6+10 (par), −2 por ataque; no se le puede dañar | POWERS `energyDuel`+`noDamage` + motor | anemia: «ANB3 Tzxefytd…» (2) |
| `ANB4` | El Rey de los Muertos | 24/2/2; lo que suma contra no muertos, la mitad | POWERS `halveUndeadBonus` | anemia: «ANB4 El Rey de los Muertos…» |
| `ANB5` | El Reptiliano | 21/3/1; un ataque con arma de menos de 2 destruye el arma | POWERS `loseWeaponUnder` | anemia: «ANB5 El Reptiliano…» |
| `ANB6` | Gigante de los Hielos | 22/5/2; contra manos desnudas dobla su tirada | POWERS `doubleVsBare` | anemia: «ANB6 Gigante de los Hielos…» |
| `ANB7` | Samurái de las Sombras | 17/3/2, fuego e hielo; solo impactas con 5-6 | POWERS `dodge`+`weaknesses` | anemia: «ANB7…» (2) |
| `ANB8` | El Señor del Tiempo | 20/3/2; tras cada ataque 2d6, con dobles lo aturdes (victoria) | POWERS `timeLord` + variante | anemia: «ANB8 El Señor del Tiempo…» (2) |
| `ANE1` | Mutante | Atributos del 1.º enemigo robado; habilidad y recompensa del 2.º | POWERS `mutant` + motor | anemia: «ANE1 Mutante…» (2) |
| `ANE2` | Asesino Sigiloso | 3/1/0; a 0 de salud se filtra y se baraja en el mazo | POWERS `escapeOnZero` | anemia: «ANE2…» |
| `ANE3` | Rata Gigante | 6/1/0 fuego, sin habilidad | — | anemia: «ANE3 Rata Gigante…» |
| `ANE4` | Ogro | 6/1/1 fuego, 1 de oro; tras evitar daño +1 al siguiente ataque | POWERS `avoidGrows` | anemia: «ANE4 Ogro…» |
| `ANE5` | Hombre Lobo | 7/3/1 fuego; la Daga de la Luna o la Moneda del Destino lo matan | POWERS `silverKill`+`coinKill` | anemia: «ANE5 Hombre Lobo…» |
| `ANE6` | Perro No Muerto | 4/0/0; tus tiradas de ataque restan −2 | POWERS `attackPenalty` | anemia: «ANE6 Perro No Muerto…» |
| `ANE7` | Nube Gaseosa | Peligro: se evita con Emboscada 1.ª; si no, d6−d6 de veneno | POWERS `hazard:'gas'` | anemia: «ANE7 Nube Gaseosa…» |
| `ANE8` | Arenas Movedizas | Peligro: d6 hasta 5-6 (−1 de energía por fallo; sin energía mueres) | POWERS `hazard:'sand'` | anemia: «ANE8 Arenas Movedizas…» |
| `ANE9` | Poza de Ácido | Peligro: pierdes lo que no sea de metal, cristal o piedra | POWERS `hazard:'acid'` + `HARD_ITEMS` | anemia: «ANE9 Poza de Ácido…» |
| `ANE10` | Hombre Cerdo | 3/1/1 fuego; si no es Emboscada te roba 1 ración en vez del ataque inicial | POWERS `stealRation` | anemia: «ANE10 Hombre Cerdo…» |
| `ANE11` | Centauro | 7/2/1 fuego, 2 de oro; con una heroína no ataca primero; evitable | POWERS `femaleNoInitial`+`freeAvoid` | anemia: «ANE11 Centauro…» |
| `ANE12` | Masa Ósea | 3/1/1 no muerto; si impacta se adhiere y te daña 1 al atacar | POWERS `sticky` | anemia: «ANE12 Masa Ósea…» |
| `ANT1` `ANT2` | Guitarra Hacha · Chaqueta con Tachuelas | +1 a los ataques · −1 al daño inicial | FX | anemia: «ANC1 Gene Slash…» |
| `ANT3` | La Bomba de Dios | Mueres y te llevas al enemigo | motor (`_anemiaUse`) | anemia: «ANT3 La Bomba de Dios…» |
| `ANT4` `ANT5` | Espada de Appleton · Espada Samurái | +1 a la suma · deja a 1 de salud = muere | FX | anemia: «ANT4/ANT5 Espadas…» |
| `ANP1` | Sangre de Lobo | +3 salud y energía (supera el máximo) hasta el fin del combate; moral −1 | motor | anemia: «ANP1 Sangre de Lobo…» |
| `ANP2` `ANP3` | Energía Potencial · Absorción | Combates sin atacar: +2 de energía / +2 al siguiente ataque por cada reposo | motor (`restMode`, special `rest`) | anemia: «ANP2…», «ANP3…» |
| `ANP4` | Silencio | Anula la habilidad del enemigo (no jefes) | motor | anemia: «ANP4 Silencio…» |
| `ANAF1` | Amnesia | Una habilidad aleatoria olvidada cada nivel | motor (`s.lvl.forgotten`) | anemia: «ANAF1…» (2) |
| `ANAF2` | Fiebre del Oro | Tesoro 1 = siempre la moneda | motor | anemia: «ANAF2 Fiebre del Oro…» |
| `ANAF3` | Adrenalina | 3 aventuras seguidas (la actual cuenta) sin Posada | motor (`s.chain`) | anemia: «ANAF3 Adrenalina…» |
| `ANS1` | Sangre Envenenada | Inmune al veneno; +7 de salud adicionales | FX `poisonImmune`, `maxHpBonus`, `hpOnLearn` | anemia: «ANS1…» |
| `ANS2` | Pacificador | En vez de atacar d6: 5-6 fin amistoso sin XP ni botín; 1-4 ataca | motor (special) | anemia: «ANS2 Pacificador…» |
| `ANS3` | Artes Oscuras | Moral −1, +1 poción, sin bendiciones | FX `moralityOnLearn`, `potionOnLearn`, `noBlessings` | anemia: «ANS3 Artes Oscuras…» |
| `ANS4` | Más Rápido que la Vista | Ignora una trama con ojos por nivel | motor (`_offerIgnorePlot`) | anemia: «ANS4…» |
| `ANS5` | Doble Fase | 1 de energía: d6 1-2 +1 daño · 3-4 fallas · 5-6 evitas (sin 2M) | motor (reacción `fase`) | anemia: «ANS5 Doble Fase…» |
| `ANS6` | Puños de Fuerza | 1 de energía: 3 de daño automático si derrotan (1/nivel) | motor (special `punos`) | anemia: «ANS6…» |
| `ANS7` | Lírica Bestial | Evita un no muerto (1/nivel) | motor (`avoidEnemy` `lirica`) | anemia: «ANS7…» |
| `ANEN1` | La Niebla | Combate antes de Campamento/Altar/Setas; sin cocinar; sin sumar el nivel | ENV_FX `fightBefore`, `noCook`, `noLevelBonus` | anemia: «ANEN1 La Niebla…» |
| `ANEN2` | El Reino Arborícola | Fuego +2; sin Bellota; el Claro se cambia; +2 bendiciones ante jefe/minijefe | ENV_FX | anemia: «ANEN2…» |
| `ANEN3` | Cielo Resquebrajado | 1 energía/salud por ronda; terminar el nivel en el Campamento; −1 al daño | ENV_FX `roundDrain`, `campEndLevel`, `dmgAll:-1` | anemia: «ANEN3…» (2) |
| `ANEN4` | La Ciudad Caída | Emboscada = Escaramuza; combate inicial con iniciativa; sin Buscar; 1 ración evita al jefe | ENV_FX | anemia: «ANEN4…» |
| `ANM1` | David Galahad | 1 de daño con su honda antes del daño inicial; moral −1 con 6+ de daño | FX `sling` + `_mercHurt` | anemia: «ANM1 David Galahad…» |
| `ANM2` | Gral, el Pirata | Combate en tu lugar; roba el oro con 11+ en el Campamento; moral −1 al gastar oro | motor (`_gralCamp`, special `gral`) | anemia: «ANM2…» (3) |
| `ANPT1`-`ANPT22` | Tramas | Ver la fila de cada una en `PLOT_OPS` (`js/data/pack-fx.js`); operaciones nuevas en `anemia.js · _opAnemia` | PLOT_OPS + motor | anemia: «ANPT1 La Criatura…» … «ANPT22 Necronomicón…» (una por trama) |

### Reglas variantes (reglamento 4.0)
`config.variants = { id: true }`; `listVariants()` da nombre, resumen y viñetas para el menú (`js/data/pack-fx.js · VARIANTS`).
| id | Libro | Comportamiento fiel a lo escrito | Test |
|---|---|---|---|
| `diablillo` | p. 4 | Peón sobre Botín al empezar; avanza Botín → Pociones → fuera al robar cada par; −1 carta de botín/poción si está sobre ese mazo | variants: «Diablillo…» (2) |
| `pueblo` | p. 4 | d6 al empezar: Thrawdin +1 salud · Victorsville +1 energía · Stubben +1 carga · Vandale +1 ración · Appleton +1 oro · Mucktown +1 bendición | «Pueblo de Origen…» |
| `motivacion` | p. 5 | d6 con el motivo (solo narrativa) | «Motivación…» |
| `ceroEnergia` | p. 5 | El puñetazo tira d6: 1 falla −1 salud · 2-3 impacta −1 salud · 4 falla · 5-6 impacta | «Cero Energía…» |
| `gastarXP` | p. 5 | 7 enemigos derrotados → +1 salud o energía máximas | «Gastar Puntos de Experiencia…» |
| `hogarSonado` | p. 7 | 30 de oro; el combate contra el jefe es opcional si los tienes cuando aparece | «Hogar Soñado…» |
| `sinRetorno` | p. 7 | Aventuras de nivel 1, 2 y 3 seguidas sin Posada; +25 monedas para el recuento | «Sin Retorno…» (4) |
| `justoAntesDeMorir` | p. 8 | Una vez por partida pierdes el uso de OM en vez de morir | «Justo Antes de Morir…» (2) |
| `enfrentarseParca` | p. 8 | Al morir, duelo contra La Parca con solo las armas de las manos; si ganas regresas | «Enfrentarse a La Parca…» (5) |
| `entornosTematicos` | p. 13 | d4 de rumbo; entorno de niveles 1-3 según la tabla | «Entornos Temáticos…» (2) |
| `muertesAtroces` | p. 14-21 | Epílogo de 16 jefes y 5 minijefes | «Muertes Atroces…» (2) |
| `encantamientos` | p. 22-23 | Texto de cada poción al usarla | «Encantamientos…» |
| `metalInmortal` | p. 24-25 | Gene Slash, 18 enemigos, 12 tramas (4/6/2 por ojos), Señor del Tiempo | «Metal Inmortal…» (2) |
| `lugaresRetiro` | p. 26-27 | Texto del lugar de retiro según la puntuación | «Lugares de Retiro…» |
| `momentosPaz` | p. 11 | d6 de entretenimiento de David/Gral en el Campamento | «Momentos de Paz y Descanso…» |

**No implementadas** (por no encajar en un motor de un solo héroe): *Variante de 2 Jugadores* (p. 6) y *Añadir Elementos Fanmade* (es el propio modo).

### Ambigüedades e interpretaciones (ANEMIA)
Las cartas no imprimen código (`ANxx` son claves propias) y el libro es breve; estas son las decisiones donde el texto no cierra la regla:
- **Energía máxima**: se toma el tope de 14 fichas del motor (`+1` por cada «Gastar XP»). Lo usan «toda tu energía» (Santo Grial, La Parca) y el
  «aunque se exceda la cantidad máxima» de Sangre de Lobo y Necronomicón (que puede superar 14 de forma permanente).
- **Jefes finales de ANEMIA**: entran en el sorteo por debilidad (azar entre los candidatos con esa debilidad); un jefe con dos debilidades (Samurái de
  las Sombras) cuenta en ambas y **Tzxefytd** (átomo gris, sin debilidad) es candidato siempre. Con campaña, el jefe fijo manda.
- **Tzxefytd**: su «energía» se muestra como salud del combate (`c.hp/maxHp`); gasta 2 en cada ataque (también si falla por dobles) y cae al agotarla tras resolver su
  último ataque. Atacar no gasta nada (el turno es «resistir»); las pociones de curación se pueden usar.
- **Guitarra Hacha**: «¡si te gusta el Heavy Metal!» se toma como +1 siempre. **La Bomba de Dios**: mata al héroe (con La Parca puede revivir) y al enemigo; contra el jefe final, derrota en
  lugar de victoria (salvo que La Parca te devuelva).
- **Gral**: «combatirá en tu lugar» = una vez por combate, en vez de tu ataque, 1d6 sin gastar energía (sin bonificaciones). En el robo del Campamento no se suma el nivel a su salud (8); si te mataría o si lo derrotas, se marcha (derrotado, deja su tesoro 1).
- **David Galahad**: la honda actúa antes del daño inicial incluso si tienes la iniciativa. «6 o más de daño» se evalúa por golpe.
- **Poza de Ácido**: lo «de metal, cristal o piedra» es un criterio por arte/nombre (`HARD_ITEMS` en `pack-fx.js`: armas y armaduras metálicas, pociones, esmeralda, mortero…).
- **Centauro**: «si tu personaje es femenino» se decide por el arte de cada héroe (`FEMALE_HEROES`); el Gnome Pack no define género (nunca lo es).
- **Perro No Muerto**: −2 al total de cada tirada de ataque con dados (mínimo 0), no por dado. **Ogro**: el +1 no se acumula.
- **Hombre Cerdo / Arenas / Nube / Poza**: «Emboscada robada como primera carta» = parte 1 de una Emboscada (no si se resuelve como 2.ª ni como Escaramuza).
- **Mutante**: atributos = salud, daño y debilidad del primero; habilidad, tipo de tesoro y bolsa del segundo; los peligros y otros Mutantes que salgan se descartan. Al derrotarlo cuenta con la debilidad del primero para el jefe.
- **Sangre de Lobo** termina al acabar el combate en curso (si la bebes en combate) o el siguiente; **Energía Potencial / Absorción**: «no atacar» es la acción especial `rest`.
- **Pacificador / Silencio**: no valen contra el jefe final. **Puños de Fuerza**: cuando la salud del enemigo es ≤ 3.
- **Entornos**: La Niebla quita el nivel a toda salud/daño de enemigos; Cielo Resquebrajado cobra en cada turno de ataque del héroe; evitar al jefe en La Ciudad Caída termina la partida con victoria (`ending: 'evaded'`).
- **Tramas**: *La Criatura* se resuelve con **dos** enemigos seguidos (el texto dice «a él dos veces» pero habla de «ambos»); lo de atacar primero no se aplica (no hay ningún objeto que lo permita en una trama). *El Hombre de Latón*: 3.ª tirada cuesta `r1 − r3` (el texto
  dice «igualar el primer resultado»), puedes abandonar entre tiradas y si no tienes energía suficiente se abandona. *Los Tres Túneles*: izquierda 3d6 sin 6; centro d6 3-5; derecha 2d6 descartando el mayor, resultado 1-2 (cada icono de
  dado del libro). *Alora*: el bebé ocupa 3 de carga el resto de la partida. *Cambio de Cuerpo*: eliges personaje; la salud/energía/carga que excedan los del nuevo se recortan (la salud máxima pasa a ser la suya). *Doya*: eliges cualquier habilidad del mazo.
  *Arena de Combate*: «su botín» incluye la bolsa de oro; ambos cuentan como derrotados. *Aquelarre*: el veneno se paga al empezar cada combate (aunque lo evites) hasta que mates a puñetazos. *El Portal*: relanza 6 o tu nivel; también vale a mitad de nivel. *La Horda*: sin energía solo puedes «no tirar» (daño
  = tamaño). *La Pitonisa*: la ficha pasa al final de tu próximo combate (cualquier resultado). *El Trato*: las fichas «de veneno» son las de curar el veneno y valen 1 cada una. *El Libro Prohibido*: eliges tú la habilidad perdida. *Necronomicón*: la energía extra no se pierde.
- **Adrenalina**: la aventura en curso cuenta como la primera de las 3; curarla cancela el encadenado.
- **Justo Antes de Morir**: se ofrece también si el ataque te deja exactamente a 0 (el texto dice «más puntos de los que te quedan»); el golpe aún causa sus efectos secundarios (veneno…). **Enfrentarse a La Parca**: se pierden también los objetos de la mochila, las habilidades se
  suspenden durante el duelo, los esbirros no te acompañan, el veneno se elimina, al volver conservas la salud que te quede y tu combate interrumpido continúa; la Parca no cuenta como enemigo derrotado.
- **Hogar Soñado**: solo se puede comprar al aparecer el jefe (no antes); el rango final es al menos «Mansión». **Sin Retorno**: la aventura de nivel 1 es el juego base; la campaña elegida ocupa su hueco (nivel 2 o 3) y el otro se sortea con la semilla; los enemigos derrotados
  se conservan entre aventuras; los «25 monedas de oro adicionales» se cuentan a 3 puntos cada una (+75).
- **Entornos Temáticos**: el libro solo define los niveles 1-3; en 4 y 5 se roba un entorno al azar; el Oeste de nivel 2 (Reino Arborícola o Cielo) se sortea con un d6 (1-3 / 4-6). Exige `realms`.
- **Metal Inmortal**: Gene Slash es obligatorio; las «18 enemigos al azar» pueden agotarse (entonces no hay combate); matar al Señor del Tiempo y mandarlo a 1987 son victorias distintas (`ending`).
