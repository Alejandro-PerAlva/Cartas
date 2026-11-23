#!/usr/bin/env node
/**
 * Genera la APK de Android de Iron Helm Digital (WebView sin conexión), sin Gradle:
 *   node tools/build-apk.mjs            (o: npm run apk)
 *
 * Pasos: (1) reconstruye app.bundle.js (tools/build.mjs), (2) prepara assets (solo lo necesario; cartas recomprimidas),
 * (3) aapt2 compile/link + javac + d8, (4) empaqueta, zipalign y firma (apksigner v1+v2+v3), (5) verifica
 * (apksigner verify, zipalign -c, aapt2 dump badging) y deja la APK en releases/.
 *
 * Opciones:
 *   --debug          APK depurable (WebView inspeccionable con chrome://inspect) en android/build/IronHelm-debug.apk; no toca releases/
 *   --install        instala con adb en el dispositivo/emulador conectado (adb install -r)
 *   --no-bundle      no ejecuta tools/build.mjs (usa el app.bundle.js que haya)
 *   --card-format X  webp (por defecto) | jpeg     --card-quality N   (por defecto 78)
 * Variables: ANDROID_HOME / ANDROID_SDK_ROOT, IRONHELM_JAVA_HOME (JDK >= 17), IRONHELM_BUILD_TOOLS (por defecto la más nueva instalada).
 * Firma: keystore personal en ~/.ironhelm/ironhelm-release.jks (se crea la primera vez; NUNCA va al repositorio).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'iron_helm_game');
const AND = path.join(ROOT, 'android');
const BUILD = path.join(AND, 'build');
const RELEASES = path.join(ROOT, 'releases');
const HOME = os.homedir();
const KS_DIR = path.join(HOME, '.ironhelm');
const KS = path.join(KS_DIR, 'ironhelm-release.jks');
const KS_PASS = path.join(KS_DIR, 'keystore.pass');
const KS_ALIAS = 'ironhelm';
const PACKAGE = 'app.ironhelm.digital';
const MIN_SDK = 24;
const TARGET_SDK = 34;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DEBUG = flag('--debug');
const CARD_FORMAT = opt('--card-format', 'webp');
const CARD_QUALITY = opt('--card-quality', '78');

const t0 = Date.now();
let stepN = 0;
const step = (msg) => console.log(`\n[${++stepN}] ${msg}`);
const fail = (msg) => { console.error(`\nERROR: ${msg}`); process.exit(1); };
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

if (flag('--help') || flag('-h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

/* ------------------------------------------------------------------ utilidades */

function run(cmd, argv, { env = {}, cwd, capture = true, okCodes = [0] } = {}) {
  const r = spawnSync(cmd, argv, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) fail(`No se pudo ejecutar ${cmd}: ${r.error.message}`);
  if (!okCodes.includes(r.status)) {
    fail(`Falló: ${path.basename(cmd)} ${argv.join(' ')}\n${r.stdout || ''}${r.stderr || ''}`);
  }
  return { out: (r.stdout || '') + (r.stderr || ''), status: r.status };
}

function walk(dir, filter = () => true, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter, base));
    else if (filter(p, e.name)) out.push(p);
  }
  return out;
}

function sha256File(p) {
  const h = crypto.createHash('sha256'); h.update(fs.readFileSync(p)); return h.digest('hex');
}

/* ------------------------------------------------------------------ herramientas */

function findSdk() {
  const c = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(HOME, 'Library/Android/sdk'), path.join(HOME, 'Android/Sdk')].filter(Boolean);
  for (const d of c) if (fs.existsSync(path.join(d, 'build-tools'))) return d;
  fail('No encuentro el Android SDK. Define ANDROID_HOME (necesita build-tools y platforms/android-34).');
}

function findBuildTools(sdk) {
  const dir = path.join(sdk, 'build-tools');
  const want = process.env.IRONHELM_BUILD_TOOLS;
  const vers = fs.readdirSync(dir).filter((v) => fs.existsSync(path.join(dir, v, 'aapt2')) && fs.existsSync(path.join(dir, v, 'd8')));
  const num = (v) => v.split('.').map(Number);
  vers.sort((a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; });
  // Por defecto, las más nuevas: el d8 de build-tools 34 se cae con las clases que genera javac 21 (MethodParameters sin nombre).
  const pick = want && vers.includes(want) ? want : vers[vers.length - 1];
  if (!pick) fail('No hay build-tools con aapt2/d8 en ' + dir);
  return path.join(dir, pick);
}

function findAndroidJar(sdk) {
  const p34 = path.join(sdk, 'platforms', `android-${TARGET_SDK}`, 'android.jar');
  if (fs.existsSync(p34)) return p34;
  const dirs = fs.readdirSync(path.join(sdk, 'platforms')).filter((d) => fs.existsSync(path.join(sdk, 'platforms', d, 'android.jar')));
  fail(`Falta platforms/android-${TARGET_SDK}/android.jar (instala con sdkmanager "platforms;android-${TARGET_SDK}"). Hay: ${dirs.join(', ') || 'ninguna'}`);
}

function jdkMajor(home) {
  const j = path.join(home, 'bin', 'javac');
  if (!fs.existsSync(j)) return 0;
  const r = spawnSync(j, ['-version'], { encoding: 'utf8' });
  const m = /(\d+)(?:\.(\d+))?/.exec((r.stdout || '') + (r.stderr || ''));
  if (!m) return 0;
  return m[1] === '1' ? Number(m[2]) : Number(m[1]);
}

function findJdk() {
  const cands = [process.env.IRONHELM_JAVA_HOME, process.env.JAVA_HOME];
  if (process.platform === 'darwin') {
    const jv = spawnSync('/usr/libexec/java_home', ['-v', '17+'], { encoding: 'utf8' });
    if (jv.status === 0) cands.push(jv.stdout.trim());
    const base = '/Library/Java/JavaVirtualMachines';
    if (fs.existsSync(base)) for (const d of fs.readdirSync(base)) cands.push(path.join(base, d, 'Contents/Home'));
  } else {
    for (const base of ['/usr/lib/jvm']) if (fs.existsSync(base)) for (const d of fs.readdirSync(base)) cands.push(path.join(base, d));
  }
  for (const c of cands.filter(Boolean)) if (jdkMajor(c) >= 17) return c;
  fail('Hace falta un JDK 17 o superior (define IRONHELM_JAVA_HOME). El `java` por defecto del shell parece ser más antiguo.');
}

const SDK = findSdk();
const BT = findBuildTools(SDK);
const ANDROID_JAR = findAndroidJar(SDK);
const JDK = findJdk();
const javaEnv = { JAVA_HOME: JDK, PATH: `${path.join(JDK, 'bin')}${path.delimiter}${process.env.PATH}` };
const tool = (n) => path.join(BT, n);
const jdkBin = (n) => path.join(JDK, 'bin', n);

/* ------------------------------------------------------------------ 0. versión */

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const versionName = opt('--version-name', pkg.version || '1.0.0');
if (!/^\d+(\.\d+){0,3}([-+][\w.]+)?$/.test(versionName)) fail(`versionName no válido: ${versionName}`);

console.log(`Iron Helm · APK ${DEBUG ? 'de depuración' : 'de producción'} · versión ${versionName}`);
console.log(`SDK: ${SDK}\nbuild-tools: ${path.basename(BT)} · android.jar: android-${TARGET_SDK} · JDK: ${JDK}`);

/* ------------------------------------------------------------------ 1. bundle */

step('Reconstruyendo app.bundle.js (tools/build.mjs)');
if (flag('--no-bundle')) console.log('  (omitido por --no-bundle)');
else {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.mjs')], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail('tools/build.mjs falló:\n' + (r.stdout || '') + (r.stderr || ''));
  console.log('  ' + ((r.stderr || '') + (r.stdout || '')).trim().split('\n').filter(Boolean).slice(-3).join('\n  '));
}
for (const f of ['index.html', 'app.bundle.js', 'css/style.css']) if (!fs.existsSync(path.join(GAME, f))) fail(`Falta iron_helm_game/${f}`);

/* ------------------------------------------------------------------ 2. assets */

step('Preparando assets (solo lo necesario)');
fs.rmSync(path.join(BUILD, 'assets'), { recursive: true, force: true });
for (const d of ['gen', 'classes', 'dex']) fs.rmSync(path.join(BUILD, d), { recursive: true, force: true });
const ASSETS = path.join(BUILD, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });
const skipFile = (p, name) => name.startsWith('.') || /\.(map|md|ts|psd|xcf|bak|orig|tmp)$/i.test(name) || name === 'Thumbs.db' || name === 'desktop.ini';
const copyTree = (srcDir, dstDir, filter = () => true) => {
  for (const f of walk(srcDir, (p, n) => !skipFile(p, n) && filter(p))) {
    const dst = path.join(dstDir, path.relative(srcDir, f));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(f, dst);
  }
};
fs.copyFileSync(path.join(GAME, 'index.html'), path.join(ASSETS, 'index.html'));
fs.copyFileSync(path.join(GAME, 'app.bundle.js'), path.join(ASSETS, 'app.bundle.js'));
copyTree(path.join(GAME, 'css'), path.join(ASSETS, 'css'));
copyTree(path.join(GAME, 'fonts'), path.join(ASSETS, 'fonts'));
const cardsSrc = path.join(GAME, 'assets', 'cards');
copyTree(path.join(GAME, 'assets'), path.join(ASSETS, 'assets'), (p) => !p.startsWith(cardsSrc + path.sep));
{
  const py = spawnSync('python3', ['-c', 'import PIL'], { encoding: 'utf8' });
  if (py.status !== 0) fail('Hace falta python3 con Pillow (pip install pillow) para recomprimir las cartas.');
  const r = run('python3', [path.join(ROOT, 'tools', 'android-optimize-images.py'), cardsSrc, path.join(ASSETS, 'assets', 'cards'), path.join(BUILD, 'cache', 'cards'), '--format', CARD_FORMAT, '--quality', CARD_QUALITY]);
  const m = /RESUMEN (\d+) (\d+) (\d+)/.exec(r.out);
  if (!m) fail('El optimizador de imágenes no devolvió resumen:\n' + r.out);
  console.log(`  cartas: ${m[1]} imágenes · ${mb(+m[2])} -> ${mb(+m[3])} (${CARD_FORMAT} q${CARD_QUALITY})`);
}
// copia del contenido sin nada que no deba ir
const staged = walk(ASSETS);
const bad = staged.filter((f) => /\.map$/.test(f) || /\/(js|data-src|docs|tests|node_modules)\//.test(path.relative(ASSETS, f) + '/'));
if (bad.length) fail('Archivos que no deberían ir en la APK: ' + bad.slice(0, 5).join(', '));
console.log(`  ${staged.length} archivos · ${mb(staged.reduce((s, f) => s + fs.statSync(f).size, 0))} en assets/`);

/* ------------------------------------------------------------------ versionCode incremental */

function contentHash() {
  const h = crypto.createHash('sha256');
  h.update('v1|' + versionName + '|' + CARD_FORMAT + CARD_QUALITY + '\n');
  const files = [
    ...staged.map((f) => ['assets/' + path.relative(ASSETS, f), f]),
    ...walk(path.join(AND, 'src')).map((f) => ['src/' + path.relative(path.join(AND, 'src'), f), f]),
    ...walk(path.join(AND, 'res')).map((f) => ['res/' + path.relative(path.join(AND, 'res'), f), f]),
    ['AndroidManifest.xml', path.join(AND, 'AndroidManifest.xml')],
  ];
  for (const [rel, f] of files) { h.update(rel + '\0'); h.update(fs.readFileSync(f)); h.update('\0'); }
  return h.digest('hex');
}
const VERSION_FILE = path.join(AND, 'version.json');
let ver = { versionCode: 1, hash: '' };
try { ver = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8')); } catch { /* primera vez */ }
const hash = contentHash();
let pendingVer = null; // se guarda en android/version.json solo si la compilación termina bien
if (ver.hash !== hash) {
  if (DEBUG) console.log(`  versionCode ${ver.versionCode} (depuración: sin incrementar)`);
  else {
    pendingVer = { versionCode: (ver.hash ? ver.versionCode : 0) + 1, hash };
    ver = pendingVer;
    console.log(`  contenido nuevo -> versionCode ${ver.versionCode}`);
  }
} else console.log(`  contenido sin cambios -> versionCode ${ver.versionCode}`);
const versionCode = ver.versionCode;

/* ------------------------------------------------------------------ 3. compilar */

step('Compilando recursos (aapt2 compile/link)');
const resZip = path.join(BUILD, 'res.zip');
const baseApk = path.join(BUILD, 'base.apk');
fs.rmSync(resZip, { force: true }); fs.rmSync(baseApk, { force: true });
run(tool('aapt2'), ['compile', '--dir', path.join(AND, 'res'), '-o', resZip]);
const noCompress = ['jpg', 'jpeg', 'png', 'webp', 'woff2', 'woff', 'mp3', 'ogg', 'mp4'].flatMap((e) => ['-0', e]);
run(tool('aapt2'), [
  'link', '-o', baseApk, '-I', ANDROID_JAR,
  '--manifest', path.join(AND, 'AndroidManifest.xml'),
  '--min-sdk-version', String(MIN_SDK), '--target-sdk-version', String(TARGET_SDK),
  '--version-code', String(versionCode), '--version-name', versionName,
  '--java', path.join(BUILD, 'gen'), '-A', ASSETS, ...noCompress,
  ...(DEBUG ? ['--debug-mode'] : []), resZip,
]);

step('Compilando Java (javac --release 8) y dex (d8)');
const javaSrc = [...walk(path.join(AND, 'src'), (p) => p.endsWith('.java')), ...walk(path.join(BUILD, 'gen'), (p) => p.endsWith('.java'))];
if (!javaSrc.length) fail('No hay código Java en android/src');
fs.mkdirSync(path.join(BUILD, 'classes'), { recursive: true });
run(jdkBin('javac'), ['--release', '8', '-Xlint:-options', '-Xlint:deprecation', '-encoding', 'UTF-8', '-classpath', ANDROID_JAR, '-d', path.join(BUILD, 'classes'), ...javaSrc], { env: javaEnv });
const classes = walk(path.join(BUILD, 'classes'), (p) => p.endsWith('.class'));
fs.mkdirSync(path.join(BUILD, 'dex'), { recursive: true });
run(tool('d8'), [...(DEBUG ? ['--debug'] : ['--release']), '--min-api', String(MIN_SDK), '--lib', ANDROID_JAR, '--output', path.join(BUILD, 'dex'), ...classes], { env: javaEnv });
console.log(`  ${javaSrc.length} fuentes · ${classes.length} clases -> classes.dex ${(fs.statSync(path.join(BUILD, 'dex', 'classes.dex')).size / 1024).toFixed(0)} KB`);

/* ------------------------------------------------------------------ 4. empaquetar, alinear, firmar */

step('Empaquetando, alineando (zipalign) y firmando (apksigner v1+v2+v3)');
run('zip', ['-q', '-X', '-j', baseApk, path.join(BUILD, 'dex', 'classes.dex')]);
const alignedApk = path.join(BUILD, 'aligned.apk');
fs.rmSync(alignedApk, { force: true });
run(tool('zipalign'), ['-f', '-p', '4', baseApk, alignedApk]);

function ensureKeystore() {
  if (fs.existsSync(KS) && fs.existsSync(KS_PASS)) return;
  if (fs.existsSync(KS) && !fs.existsSync(KS_PASS)) fail(`Existe ${KS} pero falta ${KS_PASS}.`);
  console.log(`  creando keystore personal en ${KS} (validez 30 años)`);
  fs.mkdirSync(KS_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(KS_DIR, 0o700);
  const pass = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(KS_PASS, pass + '\n', { mode: 0o600 });
  fs.chmodSync(KS_PASS, 0o600);
  run(jdkBin('keytool'), [
    '-genkeypair', '-keystore', KS, '-storetype', 'PKCS12', '-alias', KS_ALIAS,
    '-keyalg', 'RSA', '-keysize', '4096', '-sigalg', 'SHA256withRSA', '-validity', '10950',
    '-dname', 'CN=Iron Helm Digital, O=Iron Helm Digital, C=ES',
    '-storepass:file', KS_PASS, '-keypass:file', KS_PASS,
  ], { env: javaEnv });
  fs.chmodSync(KS, 0o600);
}
ensureKeystore();
for (const f of [KS, KS_PASS]) { const m = fs.statSync(f).mode & 0o777; if (m & 0o077) fs.chmodSync(f, 0o600); }

fs.mkdirSync(DEBUG ? BUILD : RELEASES, { recursive: true });
const outName = DEBUG ? 'IronHelm-debug.apk' : `IronHelm-${versionName}.apk`;
const outApk = path.join(DEBUG ? BUILD : RELEASES, outName);
fs.rmSync(outApk, { force: true }); fs.rmSync(outApk + '.idsig', { force: true });
run(tool('apksigner'), [
  'sign', '--ks', KS, '--ks-pass', `file:${KS_PASS}`, '--ks-key-alias', KS_ALIAS, // la clave usa la misma contraseña que el almacén
  '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
  '--min-sdk-version', String(MIN_SDK), '--out', outApk, alignedApk,
], { env: javaEnv });
fs.rmSync(outApk + '.idsig', { force: true });

/* ------------------------------------------------------------------ 5. verificar */

step('Verificando (apksigner verify, zipalign -c, aapt2 dump badging)');
// Con --min-sdk-version 23 apksigner también comprueba el esquema v1 (con minSdk 24 lo da por innecesario).
const v = run(tool('apksigner'), ['verify', '--verbose', '--print-certs', '--min-sdk-version', String(MIN_SDK - 1), outApk], { env: javaEnv }).out;
for (const s of ['v1 scheme (JAR signing): true', 'v2 scheme (APK Signature Scheme v2): true', 'v3 scheme (APK Signature Scheme v3): true']) {
  if (!v.includes(`Verified using ${s}`)) fail(`La firma no verifica (${s}):\n${v}`);
}
const certDigest = /certificate SHA-256 digest: ([0-9a-f]+)/.exec(v)?.[1] || '?';
console.log('  firma OK (v1+v2+v3) · certificado SHA-256 ' + certDigest);
run(tool('zipalign'), ['-c', '4', outApk]);
console.log('  zipalign -c OK');

const badging = run(tool('aapt2'), ['dump', 'badging', outApk]).out;
const must = (re, what) => { if (!re.test(badging)) fail(`aapt2 dump badging: ${what}\n${badging.split('\n').slice(0, 25).join('\n')}`); };
must(new RegExp(`package: name='${PACKAGE.replace(/\./g, '\\.')}'`), 'paquete inesperado');
must(new RegExp(`versionCode='${versionCode}'`), 'versionCode inesperado');
must(new RegExp(`versionName='${versionName.replace(/[.+]/g, '\\$&')}'`), 'versionName inesperado');
must(new RegExp(`(?:^|\\n)(?:min)?[sS]dkVersion:'${MIN_SDK}'`), 'minSdk inesperado');
must(new RegExp(`targetSdkVersion:'${TARGET_SDK}'`), 'targetSdk inesperado');
must(/application-label:'Iron Helm'/, 'nombre visible inesperado');
must(new RegExp(`launchable-activity: name='${PACKAGE.replace(/\./g, '\\.')}\\.MainActivity'`), 'actividad lanzable inesperada');
const perms = badging.split('\n').filter((l) => /^(uses-permission|uses-implied-permission)/.test(l));
if (perms.length) fail('La APK pide permisos que no debería:\n' + perms.join('\n'));
console.log(`  paquete ${PACKAGE} · versionName ${versionName} · versionCode ${versionCode} · minSdk ${MIN_SDK} · targetSdk ${TARGET_SDK}`);
console.log('  permisos: ninguno · actividad: MainActivity · nombre: Iron Helm');

const listing = run('unzip', ['-Z1', outApk]).out.split('\n').filter(Boolean);
for (const need of ['AndroidManifest.xml', 'classes.dex', 'resources.arsc', 'assets/index.html', 'assets/app.bundle.js', 'assets/css/style.css']) {
  if (!listing.includes(need)) fail(`La APK no contiene ${need}`);
}
if (listing.some((n) => /\.map$/.test(n) || /^assets\/(js|data-src|docs|tests)\//.test(n))) fail('La APK contiene archivos de desarrollo (js/, data-src/, mapas...).');
const dbg = /application-debuggable/.test(badging);
if (dbg !== DEBUG) fail(`Estado de depuración inesperado (debuggable=${dbg}).`);

/* ------------------------------------------------------------------ salida */

if (pendingVer) fs.writeFileSync(VERSION_FILE, JSON.stringify(pendingVer, null, 2) + '\n');
const size = fs.statSync(outApk).size;
const sha = sha256File(outApk);
let stable = null;
if (!DEBUG) {
  stable = path.join(RELEASES, 'IronHelm.apk');
  fs.copyFileSync(outApk, stable);
}
console.log('\n================ APK lista ================');
console.log(`Archivo : ${path.relative(ROOT, outApk)}${stable ? `  (+ copia estable ${path.relative(ROOT, stable)})` : ''}`);
console.log(`Tamaño  : ${mb(size)} (${size} bytes)${size > 60 * 1048576 ? '  AVISO: supera los 60 MB' : ''}`);
console.log(`SHA-256 : ${sha}`);
if (size > 95 * 1048576) fail('La APK supera los 95 MB: GitHub rechaza ficheros de más de 100 MB.');
console.log(`Tiempo  : ${((Date.now() - t0) / 1000).toFixed(1)} s`);

if (flag('--install')) {
  const adb = path.join(SDK, 'platform-tools', 'adb');
  console.log('\nInstalando con adb…');
  const r = spawnSync(adb, ['install', '-r', outApk], { stdio: 'inherit' });
  if (r.status !== 0) fail('adb install falló.');
}
