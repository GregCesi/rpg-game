// Le diagnostic des lenteurs (DIAGNOSTIC.md) : mesure le vrai jeu dans le vrai Google Chrome, fenêtre visible, GPU de la machine (pas le
// SwiftShader des scénarios), à x1, sur une partie neuve. Il ne change rien au jeu : tout se mesure de dehors, par la page (les
// événements de Phaser, des fonctions enveloppées à chaud, le Performance API) et par le profileur de Chrome (CDP).
//
// Usage :
//   npm run diagnostic                                    le dépôt courant, en dev (vite), rapport dans docs/diagnostic/<label>-dev.json
//   npm run diagnostic -- --root <dossier> --label avant  un autre arbre du jeu (un worktree d'un commit plus ancien, art et maps faits)
//   npm run diagnostic -- --build                         le build (vite build + vite preview) au lieu du serveur de dev
//   npm run diagnostic -- --only boot,zones,situations    une partie des mesures (boot, zones, chargements, situations, maison, bord, memoire)
//   npm run diagnostic -- --report a.json b.json …        les tableaux Markdown comparant plusieurs rapports
// CHROME=<exécutable> : un autre Chrome. Les mesures sont celles de DIAGNOSTIC.md : à refaire après chaque correction, mêmes chemins.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type CDPSession } from 'playwright-core';
import { createServer, preview } from 'vite';
import { walker } from './lib/walk';

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const HERE = resolve(import.meta.dirname, '..');

// ---------------------------------------------------------------------------------------------------------------------------------
// L'instrumentation dans la page (posée avant le jeu, active dès que `window.game` existe)
// ---------------------------------------------------------------------------------------------------------------------------------

const INSTRUMENT = `
(() => {
  const now = () => performance.now();
  const D = (window.__diag = {
    recording: false,
    images: [],          // une ligne par image dessinée pendant l'enregistrement
    frames: [],          // les instants des requestAnimationFrame pendant l'enregistrement
    creates: [],         // chaque create() de la scène du monde : la carte, sa durée, les textures nées
    contextLost: [],     // les pertes du contexte WebGL
    longTasks: [],
    canvases: 0,         // les <canvas> créés depuis le début
    cur: null,
  });
  // les canevas fabriqués (un pan de pierre de taille, un terrain peint : chacun en fait un, puis une texture)
  const ce = document.createElement.bind(document);
  document.createElement = (tag, o) => {
    if (String(tag).toLowerCase() === 'canvas') D.canvases++;
    return ce(tag, o);
  };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) D.longTasks.push({ t: e.startTime, ms: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  const fresh = () => ({ steps: 0, stepMs: 0, physMs: 0, scenes: {}, subs: {}, sortMs: 0, renderMs: 0, draws: 0, binds: 0, uploads: 0, uploadPx: 0 });
  D.cur = fresh();
  let t0 = 0, r0 = 0, lastDrawn = 0;
  const add = (o, k, v) => (o[k] = (o[k] || 0) + v);
  const timed = (obj, name, bucket, key) => {
    const f = obj[name];
    if (typeof f !== 'function' || f.__diag) return;
    const w = function (...a) {
      const s = now();
      try { return f.apply(this, a); } finally { add(D.cur[bucket], key, now() - s); }
    };
    w.__diag = true;
    obj[name] = w;
  };
  // les scènes : leur update, leur tri, leur physique ; la scène du monde : ses sous-systèmes (toute propriété qui a un update)
  const wrapScenes = (g) => {
    for (const sc of g.scene.getScenes(true)) {
      const sys = sc.sys;
      if (sys.sceneUpdate && !sys.sceneUpdate.__diag) {
        const f = sys.sceneUpdate;
        const key = sys.settings.key;
        const w = function (...a) {
          const s = now();
          try { return f.apply(this, a); } finally { add(D.cur.scenes, key, now() - s); }
        };
        w.__diag = true;
        sys.sceneUpdate = w;
      }
      if (sys.depthSort && !sys.depthSort.__diag) {
        const f = sys.depthSort.bind(sys);
        const w = () => { const s = now(); try { return f(); } finally { D.cur.sortMs += now() - s; } };
        w.__diag = true;
        sys.depthSort = w;
      }
      const world = sc.physics?.world;
      if (world && !world.__diag) {
        world.__diag = true;
        for (const m of ['update', 'postUpdate']) {
          const f = world[m].bind(world);
          world[m] = (...a) => { const s = now(); try { return f(...a); } finally { D.cur.physMs += now() - s; } };
        }
      }
      if (sys.settings.key === 'world') {
        for (const k of Object.keys(sc)) {
          if (k === 'sys' || k === 'game' || k === 'children' || k === 'physics') continue;
          const v = sc[k];
          if (v && typeof v === 'object' && typeof v.update === 'function' && !('displayList' in v) && !('scene' in v && 'type' in v && 'active' in v)) timed(v, 'update', 'subs', k);
        }
      }
    }
  };
  const wrapCreate = (g) => {
    const sc = g.scene.getScene('world');
    if (!sc) return;
    const proto = Object.getPrototypeOf(sc);
    if (proto.__diagCreate) return;
    proto.__diagCreate = true;
    const f = proto.create;
    proto.create = function (...a) {
      const before = new Set(g.textures.getTextureKeys());
      const c0 = D.canvases;
      const s = now();
      try { return f.apply(this, a); } finally {
        const ms = now() - s;
        const born = g.textures.getTextureKeys().filter((k) => !before.has(k));
        let px = 0;
        const big = [];
        for (const k of born) {
          const src = g.textures.get(k).source[0];
          const n = (src?.width || 0) * (src?.height || 0);
          px += n;
          big.push([k, src?.width, src?.height]);
        }
        big.sort((a, b) => b[1] * b[2] - a[1] * a[2]);
        D.creates.push({ map: this.map?.def?.id, at: s, ms, born: born.length, bornMB: (px * 4) / 1048576, biggest: big.slice(0, 8), canvases: D.canvases - c0, textures: g.textures.getTextureKeys().length });
        wrapScenes(g);
      }
    };
  };
  const wrapGL = () => {
    const c = window.game?.renderer?.gl;
    if (!c || c.__diag) return;
    c.__diag = true;
    for (const [m, k] of [['drawElements', 'draws'], ['drawArrays', 'draws'], ['bindTexture', 'binds']]) {
      const f = c[m].bind(c);
      c[m] = (...a) => { D.cur[k]++; return f(...a); };
    }
    for (const m of ['texImage2D', 'texSubImage2D']) {
      const f = c[m].bind(c);
      c[m] = (...a) => {
        D.cur.uploads++;
        const src = a.find((x) => x && typeof x === 'object' && 'width' in x);
        if (src) D.cur.uploadPx += (src.width || 0) * (src.height || 0);
        else if (typeof a[3] === 'number' && typeof a[4] === 'number') D.cur.uploadPx += a[3] * a[4];
        return f(...a);
      };
    }
  };
  const install = () => {
    const g = window.game;
    if (!g?.events || !g.canvas) return false;
    if (g.__diag) return true;
    g.__diag = true;
    g.canvas.addEventListener('webglcontextlost', (e) => D.contextLost.push({ t: now(), map: g.scene.getScene('world')?.map?.def?.id, textures: g.textures.getTextureKeys().length, why: e.statusMessage || '' }));
    g.canvas.addEventListener('webglcontextrestored', () => D.contextLost.push({ t: now(), restored: true }));
    g.events.on('prestep', () => { wrapCreate(g); wrapScenes(g); wrapGL(); t0 = now(); });
    g.events.on('poststep', () => { D.cur.steps++; D.cur.stepMs += now() - t0; });
    g.events.on('prerender', (r) => { if (r) r0 = now(); });
    g.events.on('postrender', (r) => {
      if (!r) return;
      const t = now();
      D.cur.renderMs += t - r0;
      if (D.recording) D.images.push({ t, dt: lastDrawn ? t - lastDrawn : 0, ...D.cur, scenes: { ...D.cur.scenes }, subs: { ...D.cur.subs } });
      lastDrawn = t;
      D.cur = fresh();
    });
    const raf = (t) => { if (D.recording) D.frames.push(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    return true;
  };
  // au plus tôt : la scène du monde est créée au premier pas, avant que l'intervalle ne passe ; son create est enveloppé dès le suivant
  const poll = setInterval(() => { try { if (install()) clearInterval(poll); } catch (e) { console.error('diag', e); } }, 5);
  // ce que le jeu gère et dessine : la liste d'affichage de la scène du monde, ce qui est visible, ce qui tombe dans la caméra
  D.census = () => {
    const g = window.game;
    const w = g.scene.getScene('world');
    let all = 0, visible = 0, inView = 0, containers = 0, zones = 0, images = 0, graphics = 0, tilemaps = 0, texts = 0, renderTextures = 0;
    const cam = w.cameras.main;
    const v = cam.worldView;
    const walk = (list, depth) => {
      for (const o of list) {
        all++;
        const t = o.type;
        if (t === 'Container') containers++;
        else if (t === 'Zone') zones++;
        else if (t === 'Image' || t === 'Sprite') images++;
        else if (t === 'Graphics') graphics++;
        else if (t === 'TilemapLayer' || t === 'TilemapGPULayer') tilemaps++;
        else if (t === 'Text' || t === 'BitmapText') texts++;
        else if (t === 'RenderTexture' || t === 'DynamicTexture') renderTextures++;
        if (o.visible && o.alpha !== 0 && t !== 'Zone') {
          visible++;
          if (depth === 0 && typeof o.getBounds === 'function' && t !== 'Container') {
            try {
              const b = o.getBounds();
              if (b.right >= v.x && b.x <= v.right && b.bottom >= v.y - 200 && b.y <= v.bottom + 200) inView++;
            } catch {}
          }
        }
        if (o.list) walk(o.list, depth + 1);
      }
    };
    walk(w.children.list, 0);
    const pw = w.physics.world;
    return { all, visible, inView, containers, zones, images, graphics, tilemaps, texts, renderTextures, bodies: pw.bodies.size, statics: pw.staticBodies.size, colliders: pw.colliders.length, renderList: cam.renderList?.length, tweens: w.tweens.getTweens?.().length };
  };
  D.textures = () => {
    const g = window.game;
    let n = 0, px = 0, canvas = 0, canvasPx = 0;
    const big = [];
    for (const k of g.textures.getTextureKeys()) {
      const t = g.textures.get(k);
      for (const s of t.source) {
        n++;
        const p = (s.width || 0) * (s.height || 0);
        px += p;
        if (s.isCanvas || s.image instanceof HTMLCanvasElement) { canvas++; canvasPx += p; }
        big.push([k, s.width, s.height]);
      }
    }
    big.sort((a, b) => b[1] * b[2] - a[1] * a[2]);
    return { keys: g.textures.getTextureKeys().length, sources: n, MB: (px * 4) / 1048576, canvas, canvasMB: (canvasPx * 4) / 1048576, biggest: big.slice(0, 12) };
  };
})();
`;

// ---------------------------------------------------------------------------------------------------------------------------------
// Le banc : un serveur (dev ou build) sur l'arbre du jeu, le vrai Chrome
// ---------------------------------------------------------------------------------------------------------------------------------

async function serve(root: string, build: boolean): Promise<{ url: string; close: () => Promise<void> }> {
  const cacheDir = mkdtempSync(join(tmpdir(), 'xeros-diag-'));
  if (build) {
    const outDir = join(cacheDir, 'dist');
    execFileSync(join(HERE, 'node_modules/.bin/vite'), ['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { cwd: root, stdio: 'inherit' });
    const server = await preview({ root, configFile: join(root, 'vite.config.ts'), build: { outDir }, preview: { port: 0 }, logLevel: 'error' });
    return { url: server.resolvedUrls!.local[0], close: async () => { await server.close(); rmSync(cacheDir, { recursive: true, force: true }); } };
  }
  const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'error', server: { port: 0 }, cacheDir, optimizeDeps: { include: ['phaser', 'zod'], noDiscovery: true } });
  await server.listen();
  return { url: server.resolvedUrls!.local[0], close: async () => { await server.close(); rmSync(cacheDir, { recursive: true, force: true }); } };
}

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------------------------------------------------------------------------
// Les outils de mesure côté Node
// ---------------------------------------------------------------------------------------------------------------------------------

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

interface ProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  children?: number[];
}

/** Le profil CPU de Chrome résumé : les fonctions où le temps passe (propre et cumulé), fichier:ligne. */
function summarizeProfile(p: { nodes: ProfileNode[]; samples: number[]; timeDeltas: number[] }) {
  const parent = new Map<number, number>();
  const byId = new Map<number, ProfileNode>();
  for (const n of p.nodes) {
    byId.set(n.id, n);
    for (const c of n.children ?? []) parent.set(c, n.id);
  }
  const keyOf = (n: ProfileNode) => {
    const u = n.callFrame.url.replace(/^.*?\/(src|node_modules|assets)\//, '$1/').replace(/\?.*$/, '');
    return `${n.callFrame.functionName || '(anonyme)'} ${u ? `${u}:${n.callFrame.lineNumber + 1}` : ''}`.trim();
  };
  const self = new Map<string, number>();
  const total = new Map<string, number>();
  let all = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const dt = (p.timeDeltas[i + 1] ?? 0) / 1000;
    all += dt;
    let n = byId.get(p.samples[i]);
    if (!n) continue;
    const k = keyOf(n);
    self.set(k, (self.get(k) ?? 0) + dt);
    const seen = new Set<string>();
    while (n) {
      const kk = keyOf(n);
      if (!seen.has(kk)) {
        seen.add(kk);
        total.set(kk, (total.get(kk) ?? 0) + dt);
      }
      const up = parent.get(n.id);
      n = up === undefined ? undefined : byId.get(up);
    }
  }
  const top = (m: Map<string, number>, f: (k: string) => boolean, n: number) =>
    [...m].filter(([k]) => f(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, ms]) => ({ fn: k, ms: Math.round(ms), share: r1((100 * ms) / Math.max(1, all)) }));
  return {
    ms: Math.round(all),
    idleMs: Math.round(self.get('(idle)') ?? 0),
    gcMs: Math.round(self.get('(garbage collector)') ?? 0),
    self: top(self, (k) => !/^\((idle|program|root)\)/.test(k), 25),
    gameTotal: top(total, (k) => / src\//.test(k), 40),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Le parcours
// ---------------------------------------------------------------------------------------------------------------------------------

/** La maison du coq sur la ferme du riche (le rectangle Plan de la carte du dépôt courant), en px : la même place pour toutes les versions. */
function coqHouse(): { x: number; y: number } {
  const m = JSON.parse(readFileSync(join(HERE, 'tiled/maps/ferme-du-riche.tmj'), 'utf8'));
  for (const l of m.layers) for (const o of l.objects ?? []) if (o.type === 'Plan' && o.properties?.some((p: any) => p.value === 'maison-coq')) return { x: o.x, y: o.y };
  throw new Error('la maison du coq n’est pas sur la ferme du riche');
}

async function main() {
  if (argv[0] === '--report') return report(argv.slice(1));
  const root = resolve(opt('root') ?? HERE);
  const build = argv.includes('--build');
  const label = opt('label') ?? 'apres';
  const only = new Set((opt('only') ?? 'boot,zones,chargements,situations,maison,bord,memoire').split(','));
  const outFile = resolve(opt('out') ?? join(HERE, 'docs/diagnostic', `${label}-${build ? 'build' : 'dev'}.json`));
  mkdirSync(resolve(outFile, '..'), { recursive: true });
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  console.log(`diagnostic ${label} (${commit}, ${build ? 'build' : 'dev'}) : ${root}`);
  const srv = await serve(root, build);
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--window-size=1400,900'],
  });
  const context = await browser.newContext({ viewport: { width: 1360, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const consoleLines: string[] = [];
  page.on('console', (m) => {
    if (/context|webgl|gl_|GPU/i.test(m.text())) consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript(INSTRUMENT);
  await page.addInitScript(`
    window.__diagUntil = async (cond, label, ms = 180000) => {
      const t = performance.now();
      while (!cond()) {
        if (performance.now() - t > ms) throw new Error('attente trop longue : ' + label);
        await new Promise((r) => { requestAnimationFrame(r); setTimeout(r, 50); });
      }
    };
    window.__diagIdle = (label) => window.__diagUntil(() => {
      const w = window.game?.scene?.getScene('world');
      return !!w && !!w.player && w.mode === 'play' && w.time.now >= (w.interaction?.lockedUntil ?? 0);
    }, label);
    window.__diagKey = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true }));
  `);
  const cdp: CDPSession = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  const out: any = { label, commit, mode: build ? 'build' : 'dev', root, date: new Date().toISOString(), zones: [], situations: {}, maison: {} };
  // un échec en route garde ce qui est mesuré (écrit avec l'erreur), et ferme le navigateur et le serveur
  partial = { out, outFile, close: async () => { await browser.close().catch(() => {}); await srv.close().catch(() => {}); } };

  const E = <T = any>(fn: string | ((arg: any) => T | Promise<T>), arg?: any) => page.evaluate(fn as any, arg) as Promise<T>;
  const metrics = async () => {
    const m = (await cdp.send('Performance.getMetrics')).metrics as { name: string; value: number }[];
    const g = (n: string) => m.find((x) => x.name === n)?.value ?? 0;
    return { heapMB: r1(g('JSHeapUsedSize') / 1048576), heapTotalMB: r1(g('JSHeapTotalSize') / 1048576), nodes: g('Nodes'), listeners: g('JSEventListeners') };
  };
  const idle = (label: string) => E(`window.__diagIdle(${JSON.stringify(label)})`);
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Une période mesurée : `ms` ms d'images, pendant que `during` agit ; le profil CPU en même temps. */
  const sample = async (name: string, ms: number, during?: () => Promise<void>) => {
    // le profileur d'abord : son démarrage fige une image, qui ne doit pas compter dans la période (deux images passent avant)
    await cdp.send('Profiler.start');
    await E(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const D = (window as any).__diag;
      D.images = [];
      D.frames = [];
      D.recording = true;
    });
    const t0 = Date.now();
    const m0 = await metrics();
    if (during) await during();
    const left = ms - (Date.now() - t0);
    if (left > 0) await pause(left);
    const prof = (await cdp.send('Profiler.stop')).profile as any;
    const m1 = await metrics();
    const raw = await E(() => {
      const D = (window as any).__diag;
      D.recording = false;
      const w = (window as any).game.scene.getScene('world');
      return { images: D.images, frames: D.frames, census: D.census(), tex: D.textures(), map: w.map.def.id, storey: w.storeys?.current };
    });
    const im = raw.images as any[];
    const fr = raw.frames as number[];
    const gaps = fr.slice(1).map((t, i) => t - fr[i]);
    const secs = fr.length > 1 ? (fr[fr.length - 1] - fr[0]) / 1000 : ms / 1000;
    const subs: Record<string, number> = {};
    const scenes: Record<string, number> = {};
    for (const i of im) {
      for (const [k, v] of Object.entries(i.subs as Record<string, number>)) subs[k] = (subs[k] ?? 0) + v;
      for (const [k, v] of Object.entries(i.scenes as Record<string, number>)) scenes[k] = (scenes[k] ?? 0) + v;
    }
    const per = (x: number) => r1(x / Math.max(1, im.length));
    const sum = (f: (i: any) => number) => im.reduce((a, i) => a + f(i), 0);
    const steps = im.map((i) => i.steps as number);
    const totalSteps = steps.reduce((a, b) => a + b, 0);
    const res = {
      map: raw.map,
      storey: raw.storey,
      seconds: r1(secs),
      rafPerSec: r1((fr.length - 1) / secs),
      imagesPerSec: r1(im.length / secs),
      image: { avg: r1(avg(gaps)), p50: r1(pct(gaps, 50)), p95: r1(pct(gaps, 95)), p99: r1(pct(gaps, 99)), max: r1(Math.max(0, ...gaps)), over20: gaps.filter((g) => g > 20).length, over33: gaps.filter((g) => g > 33.4).length, over50: gaps.filter((g) => g > 50).length, count: gaps.length },
      cpuPerImage: {
        step: per(sum((i) => i.stepMs)),
        physics: per(sum((i) => i.physMs)),
        world: per(scenes.world ?? 0),
        hud: per(scenes.hud ?? 0),
        sort: per(sum((i) => i.sortMs)),
        render: per(sum((i) => i.renderMs)),
        renderP95: r1(pct(im.map((i) => i.renderMs), 95)),
        stepP95: r1(pct(im.map((i) => i.stepMs), 95)),
        busyP95: r1(pct(im.map((i) => i.stepMs + i.renderMs), 95)),
      },
      stepsPerImage: { avg: r1(totalSteps / Math.max(1, im.length)), max: Math.max(0, ...steps), dist: Object.fromEntries([...new Set(steps)].sort((a, b) => a - b).map((s) => [s, steps.filter((x) => x === s).length])) },
      stepCost: r1(sum((i) => i.stepMs) / Math.max(1, totalSteps)),
      gl: { draws: per(sum((i) => i.draws)), binds: per(sum((i) => i.binds)), uploads: per(sum((i) => i.uploads)), uploadKpx: per(sum((i) => i.uploadPx) / 1000) },
      subsystems: Object.fromEntries(Object.entries(subs).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => [k, r1(v / Math.max(1, totalSteps))])),
      census: raw.census,
      textures: { keys: raw.tex.keys, MB: r1(raw.tex.MB), canvas: raw.tex.canvas, canvasMB: r1(raw.tex.canvasMB), biggest: raw.tex.biggest },
      memory: { before: m0, after: m1 },
      profile: summarizeProfile(prof),
    };
    console.log(`  ${name} : ${res.imagesPerSec} img/s, image p50 ${res.image.p50} p95 ${res.image.p95} max ${res.image.max} ms ; ${res.stepsPerImage.avg} pas/img (${res.stepCost} ms le pas) ; dessin ${res.cpuPerImage.render} ms ; ${res.gl.draws} draws ; ${res.census.all} objets`);
    return res;
  };

  /** Tenir une touche pendant `ms` (la marche d'un joueur), puis la lâcher. */
  const hold = async (code: string, ms: number) => {
    await E(`window.__diagKey('keydown', '${code}')`);
    await pause(ms);
    await E(`window.__diagKey('keyup', '${code}')`);
  };
  const walkBackAndForth = async (ms: number, a = 'KeyA', b = 'KeyD') => {
    const t = Date.now();
    let k = 0;
    while (Date.now() - t < ms - 150) await hold(k++ % 2 ? b : a, Math.min(900, ms - (Date.now() - t)));
  };
  /** Une commande ?dieu qui recharge la scène (une autre carte) : le temps jusqu'au monde prêt, et jusqu'à la première image de la carte. */
  const restart = (cmd: object) =>
    E(async (cmd: any) => {
      const g = (window as any).game;
      const D = (window as any).__diag;
      const n = D.creates.length;
      const old = g.scene.getScene('world').map;
      // les images de toute l'arrivée : de la commande à 1,5 s après le monde prêt (la peinture du terrain par petits pas comprise)
      D.images = [];
      D.recording = true;
      const t = performance.now();
      g.events.emit('dieu', cmd);
      await (window as any).__diagUntil(() => {
        const w = g.scene.getScene('world');
        return !!w && w.map && w.map !== old && !!w.player && D.creates.length > n;
      }, 'la carte ' + (cmd.map ?? cmd.kind));
      const ready = performance.now() - t;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const drawn = performance.now() - t;
      await new Promise((r) => setTimeout(r, 1500));
      D.recording = false;
      const gaps = D.images.map((i: any) => i.dt).filter((x: number) => x > 0);
      const c = D.creates.at(-1);
      // les trois pires images : leur durée, le temps du pas de jeu (la création de la scène y est), du dessin, le nombre de pas
      const top = [...D.images].sort((a: any, b: any) => b.dt - a.dt).slice(0, 3).map((i: any) => [Math.round(i.dt), Math.round(i.stepMs), Math.round(i.renderMs), i.steps]);
      return { ready: Math.round(ready), drawn: Math.round(drawn), create: Math.round(c.ms), worst: Math.round(Math.max(0, ...gaps)), top, over100: gaps.filter((x: number) => x > 100).length, born: c.born, bornMB: Math.round(c.bornMB * 10) / 10, canvases: c.canvases, textures: c.textures, biggest: c.biggest.slice(0, 4) };
    }, cmd);

  // --- 1. Le démarrage
  const t0 = Date.now();
  await page.goto(`${srv.url}?dieu&reset`);
  await E(`window.__diagUntil(() => !!window.game?.scene?.getScene('world')?.player, 'le monde')`);
  const bootReady = Date.now() - t0;
  await idle('le réveil');
  const bootIdle = Date.now() - t0;
  out.gpu = await E(() => {
    const gl = (window as any).game.renderer.gl as WebGLRenderingContext;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE), units: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), canvas: [(window as any).game.canvas.width, (window as any).game.canvas.height], dpr: devicePixelRatio, ua: navigator.userAgent };
  });
  console.log(`  GPU : ${out.gpu.renderer}`);
  if (only.has('boot')) {
    out.boot = await E((times: number[]) => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const png = res.filter((r) => /\.png/.test(r.name));
      const js = res.filter((r) => /\.(ts|js|mjs|json)(\?|$)/.test(r.name.split('#')[0]));
      const D = (window as any).__diag;
      return {
        readyMs: times[0],
        idleMs: times[1],
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        requests: res.length,
        png: png.length,
        pngKB: Math.round(png.reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0) / 1024),
        pngFirst: Math.round(Math.min(...png.map((r) => r.startTime))),
        pngLast: Math.round(Math.max(0, ...png.map((r) => r.responseEnd))),
        js: js.length,
        jsKB: Math.round(js.reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0) / 1024),
        jsLast: Math.round(Math.max(0, ...js.map((r) => r.responseEnd))),
        biggestJs: js.sort((a, b) => (b.encodedBodySize || 0) - (a.encodedBodySize || 0)).slice(0, 6).map((r) => [r.name.replace(/^.*?\/(src|node_modules|assets)\//, '$1/').replace(/\?.*$/, ''), Math.round((r.encodedBodySize || 0) / 1024), Math.round(r.duration)]),
        firstCreate: D.creates[0],
        longTasks: D.longTasks.filter((l: any) => l.ms > 200).map((l: any) => [Math.round(l.t), Math.round(l.ms)]).slice(0, 12),
      };
    }, [bootReady, bootIdle]);
    out.boot.textures = await E(() => (window as any).__diag.textures());
    out.boot.memory = await metrics();
    console.log(`  démarrage : monde prêt en ${bootReady} ms (${out.boot.requests} requêtes, ${out.boot.png} png, ${out.boot.js} scripts)`);
  }

  // --- 2. Chaque zone, la première fois puis la suivante ; d'abord, ce que le jeu prépare d'avance (les textures des pièces posées
  // d'alentour, systems/prewarm.ts) a fini, comme pour un joueur qui marche d'une zone à l'autre (les versions d'avant n'en ont pas)
  const prepared = Date.now();
  await E(`window.__diagUntil(() => !window.game.scene.getScene('world').preparing, 'la préparation d’avance')`);
  out.preparedMs = Date.now() - prepared;
  const ZONES = [...readFileSync(join(root, 'tiled/maps/monde.world'), 'utf8').matchAll(/"fileName": "([^"]+)\.tmj"/g)].map((m) => m[1]);
  if (only.has('zones')) {
    for (const pass of [1, 2]) {
      for (const z of ZONES) {
        const r = await restart({ kind: 'map', map: z });
        await idle(z);
        const m = await metrics();
        const census = await E(() => (window as any).__diag.census());
        out.zones.push({ zone: z, pass, ...r, heapMB: m.heapMB, objects: census.all, statics: census.statics });
        console.log(`  zone ${z} (${pass}) : ${r.ready} ms (pire image ${r.worst} ms ${JSON.stringify(r.top)}, create ${r.create} ms, ${r.born} textures nées, ${r.bornMB} Mo, ${r.canvases} canevas), ${census.all} objets, tas ${m.heapMB} Mo`);
      }
    }
  }

  // --- 2 bis. Les chargements qui coûtent, profilés (où passe le temps du create) : la ferme, la ferme du riche, le village
  if (only.has('chargements')) {
    out.chargements = {};
    for (const z of ['ferme', 'ferme-du-riche', 'village', 'ferme-du-riche']) {
      await cdp.send('Profiler.start');
      const r = await restart({ kind: 'map', map: z });
      const prof = summarizeProfile((await cdp.send('Profiler.stop')).profile as any);
      await idle(z);
      const k = out.chargements[z] ? `${z} (retour)` : z;
      out.chargements[k] = { ...r, profile: prof };
      console.log(`  chargement profilé ${k} : ${r.ready} ms ; ${prof.gameTotal.slice(0, 6).map((f) => `${f.fn.split(' ')[0]} ${f.ms}`).join(', ')}`);
    }
  }

  // --- 3. Les situations : dehors loin du coq, devant le coq
  const { goTo, where } = walker(page);
  const house = coqHouse();
  const front = { x: house.x + 134, y: house.y + 166 };
  if (only.has('situations')) {
    await restart({ kind: 'map', map: 'ferme' });
    await idle('ferme');
    await pause(1500);
    out.situations.loin = await sample('dehors loin du coq (ferme), immobile', 5000);
    out.situations.loinMarche = await sample('dehors loin du coq (ferme), en marchant', 5000, () => walkBackAndForth(5000));
  }
  const toFront = async () => {
    await restart({ kind: 'map', map: 'ferme-du-riche' });
    await idle('ferme du riche');
    await E(([x, y]: number[]) => {
      const w = (window as any).game.scene.getScene('world');
      w.player.actor.body.reset(x, y);
      w.player.actor.face('up');
    }, [front.x, front.y]);
    await idle('devant la maison');
    await pause(1500);
  };
  if (only.has('situations')) {
    await toFront();
    out.situations.devant = await sample('devant la maison du coq, immobile', 5000);
    out.situations.devantMarche = await sample('devant la maison du coq, en marchant', 5000, () => walkBackAndForth(5000));
  }

  // --- 4. La maison : la porte, dedans en bas, l'escalier, dedans en haut, une porte du palier, ressortir
  if (only.has('maison')) {
    await toFront();
    out.maison.present = await E(() => !!(window as any).game.scene.getScene('world').map.builds?.some((b: any) => /^oak-arch-door/.test(b.piece?.piece?.prop ?? '')));
  }
  if (only.has('maison') && out.maison.present) {
    await E(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);
    const w0 = await where();
    await goTo(w0.wx, w0.wy - 16, 'y', 2);
    await E(`(() => { const a = window.game.scene.getScene('world').player.actor; if (a.facing !== 'up') a.face('up'); })()`);
    const doorOpen = () => E(() => /open/.test((window as any).game.scene.getScene('world').map.builds.find((b: any) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''))?.piece.piece.prop ?? ''));
    const pressE = () => E(`(async () => { window.__diagKey('keydown', 'KeyE'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); window.__diagKey('keyup', 'KeyE'); })()`);
    // ouvrir la porte en arc : l'image la plus longue autour du geste, et ce qui a coûté
    out.maison.porteDehors = await sample('ouvrir la porte en arc (E)', 2500, async () => {
      await pause(300);
      if (!(await doorOpen())) await pressE();
    });
    out.maison.porteDehorsOuverte = await doorOpen();
    // entrer : le passage de la porte (la scène recharge l'intérieur calculé)
    const passage = (code: string, test: string) =>
      E(
        async ([code, test]: string[]) => {
          const g = (window as any).game;
          const D = (window as any).__diag;
          const n = D.creates.length;
          const t = performance.now();
          const ok = new Function('id', `return ${test}`);
          D.images = [];
          D.recording = true;
          (window as any).__diagKey('keydown', code);
          await (window as any).__diagUntil(() => ok(g.scene.getScene('world').map?.def?.id ?? '') && D.creates.length > n && !!g.scene.getScene('world').player, 'passer ' + test);
          (window as any).__diagKey('keyup', code);
          const ready = performance.now() - t;
          await new Promise((r) => setTimeout(r, 1000));
          D.recording = false;
          const c = D.creates.at(-1);
          const worst = Math.round(Math.max(0, ...D.images.map((i: any) => i.dt)));
          return { ready: Math.round(ready), create: Math.round(c.ms), worst, born: c.born, bornMB: Math.round(c.bornMB * 10) / 10, canvases: c.canvases, textures: c.textures, biggest: c.biggest };
        },
        [code, test],
      );
    await cdp.send('Profiler.start');
    out.maison.entrer = await passage('KeyW', `id.startsWith('interieur:')`);
    out.maison.entrer.profile = summarizeProfile((await cdp.send('Profiler.stop')).profile as any);
    console.log(`  entrer : ${out.maison.entrer.ready} ms (pire image ${out.maison.entrer.worst} ms, create ${out.maison.entrer.create} ms, ${out.maison.entrer.born} textures nées, ${out.maison.entrer.bornMB} Mo)`);
    await idle('dedans');
    await pause(1500);
    out.maison.basImmobile = await sample('dedans en bas, immobile', 5000);
    const state = () =>
      E(() => {
        const w = (window as any).game.scene.getScene('world');
        const steps = w.map.builds.filter((b: any) => b.piece.piece.prop === 'stone-step').map((b: any) => b.piece);
        const first = steps.sort((a: any, b: any) => a.z - b.z)[0];
        return { ox: (first.x - 680) / 5, oy: (first.y - 470) / 5, z: w.player.mobility.z as number };
      });
    let s = await state();
    const at = (cx: number, cy: number) => ({ x: s.ox + cx / 5, y: s.oy + cy / 5 });
    const foot = at(730, 540);
    await goTo(foot.x, foot.y, 'y', 3);
    out.maison.basMarche = await sample('dedans en bas, en marchant', 4000, () => walkBackAndForth(4000));
    await goTo(foot.x, foot.y, 'x', 3);
    await goTo(foot.x, foot.y, 'y', 3);
    // l'escalier : chaque image pendant la montée (le niveau qui change à mi-hauteur)
    out.maison.escalier = await sample("monter l'escalier", 6000, async () => {
      await E(`window.__diagKey('keydown', 'KeyW')`);
      await E(`window.__diagUntil(() => window.game.scene.getScene('world').player.mobility.z >= 280, 'monter')`);
      await E(`window.__diagKey('keyup', 'KeyW')`);
    });
    out.maison.escalierLongues = await E(() => (window as any).__diag.images.filter((i: any) => i.dt > 25).map((i: any) => ({ dt: Math.round(i.dt), step: Math.round(i.stepMs), render: Math.round(i.renderMs), steps: i.steps, subs: Object.fromEntries(Object.entries(i.subs).filter(([, v]: any) => v > 2).map(([k, v]: any) => [k, Math.round(v)])) })));
    await idle('en haut');
    await pause(1500);
    out.maison.hautImmobile = await sample('dedans en haut, immobile', 5000);
    s = await state();
    const palier = at(740, 167);
    await goTo(palier.x, palier.y, 'y', 2);
    await E(`(() => { const a = window.game.scene.getScene('world').player.actor; if (a.facing !== 'right') a.face('right'); })()`);
    out.maison.portePalier = await sample('ouvrir une porte du palier (E)', 2500, async () => {
      await pause(300);
      await pressE();
    });
    out.maison.hautMarche = await sample('dedans en haut, en marchant (palier)', 4000, () => walkBackAndForth(4000, 'KeyW', 'KeyS'));
    const top = at(730, 150);
    await goTo(palier.x, palier.y, 'y', 3);
    await goTo(top.x, top.y, 'x', 2);
    out.maison.descendre = await sample("descendre l'escalier", 6000, async () => {
      await E(`window.__diagKey('keydown', 'KeyS')`);
      await E(`window.__diagUntil(() => window.game.scene.getScene('world').player.mobility.z <= 1, 'descendre')`);
      await E(`window.__diagKey('keyup', 'KeyS')`);
    });
    await idle('en bas');
    const exit = at(670, 600);
    await goTo(exit.x, exit.y, 'x', 2);
    await cdp.send('Profiler.start');
    out.maison.sortir = await passage('KeyS', `id === 'ferme-du-riche'`);
    out.maison.sortir.profile = summarizeProfile((await cdp.send('Profiler.stop')).profile as any);
    console.log(`  sortir : ${out.maison.sortir.ready} ms (pire image ${out.maison.sortir.worst} ms, create ${out.maison.sortir.create} ms)`);
  }

  // --- 5. Le bord : passer à pied de la ferme du riche (la maison au sud) au village, puis revenir
  if (only.has('bord')) {
    await toFront();
    const H = await E(() => (window as any).game.scene.getScene('world').map.height);
    const cross = (code: string, to: string) =>
      E(
        async ([code, to]: string[]) => {
          const g = (window as any).game;
          const D = (window as any).__diag;
          const n = D.creates.length;
          D.images = [];
          D.recording = true;
          const t = performance.now();
          (window as any).__diagKey('keydown', code);
          await (window as any).__diagUntil(() => g.scene.getScene('world').map?.def?.id === to && D.creates.length > n && !!g.scene.getScene('world').player, 'passer à ' + to);
          const ready = performance.now() - t;
          await new Promise((r) => setTimeout(r, 400));
          (window as any).__diagKey('keyup', code);
          D.recording = false;
          const c = D.creates.at(-1);
          const worst = Math.max(0, ...D.images.map((i: any) => i.dt));
          return { ready: Math.round(ready), create: Math.round(c.ms), born: c.born, bornMB: Math.round(c.bornMB * 10) / 10, textures: c.textures, worstImage: Math.round(worst) };
        },
        [code, to],
      );
    // une colonne libre jusqu'au bord sud, au plus près de la maison (à l'ouest de sa porte, puis de plus en plus loin)
    const col = await E(([x0, H]: number[]) => {
      const m = (window as any).game.scene.getScene('world').map;
      for (let d = 0; d < 1200; d += 4)
        for (const x of [x0 - d, x0 + d]) {
          let free = true;
          for (let y = H - 60; y <= H && free; y += 4) free = m.areaFree({ left: x - 6, right: x + 6, top: y - 9, bottom: Math.min(H, y) });
          if (free) return x;
        }
      return x0;
    }, [front.x, H]);
    try {
      await E(([x, y]: number[]) => (window as any).game.scene.getScene('world').player.actor.body.reset(x, y), [col, H - 30]);
      await idle('au bord sud');
      const south = await cross('KeyS', 'village');
      await idle('le village');
      await pause(500);
      const north = await cross('KeyW', 'ferme-du-riche');
      out.bord = { colonne: col - house.x, versVillage: south, versFerme: north };
      console.log(`  bord : vers le village ${south.ready} ms (create ${south.create}, pire image ${south.worstImage} ms), retour ${north.ready} ms (create ${north.create})`);
    } catch (e) {
      out.bord = { colonne: col - house.x, echec: String(e) };
      console.log(`  bord : échec (${String(e).slice(0, 200)})`);
      await E(`['KeyS', 'KeyW'].forEach((k) => window.__diagKey('keyup', k))`);
    }
  }

  // --- 6. La mémoire après tout le parcours
  if (only.has('memoire')) {
    await E(`window.gc?.()`);
    await pause(500);
    out.memoire = { ...(await metrics()), textures: await E(() => (window as any).__diag.textures()), creates: await E(() => (window as any).__diag.creates.length) };
    console.log(`  mémoire : tas ${out.memoire.heapMB} Mo, ${out.memoire.textures.keys} textures (${r1(out.memoire.textures.MB)} Mo, dont ${out.memoire.textures.canvas} canevas ${r1(out.memoire.textures.canvasMB)} Mo)`);
  }
  out.creates = await E(() => (window as any).__diag.creates.map((c: any) => ({ map: c.map, ms: Math.round(c.ms), born: c.born, bornMB: Math.round(c.bornMB * 10) / 10, canvases: c.canvases, textures: c.textures })));
  out.contextLost = await E(() => (window as any).__diag.contextLost);
  out.longTasks = await E(() => (window as any).__diag.longTasks.filter((l: any) => l.ms > 100).map((l: any) => [Math.round(l.t), Math.round(l.ms)]));
  out.errors = errors;
  out.console = consoleLines.slice(0, 40);
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`rapport : ${outFile}${out.contextLost.length ? ` ; CONTEXTE WEBGL PERDU ${out.contextLost.length} fois` : ''}${errors.length ? ` ; ${errors.length} erreurs de la page` : ''}`);
  await browser.close();
  await srv.close();
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les tableaux comparés (Markdown)
// ---------------------------------------------------------------------------------------------------------------------------------

function report(files: string[]) {
  const rs = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const head = (cols: string[]) => `| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|`;
  const name = (r: any) => `${r.label} ${r.commit} (${r.mode})`;
  const lines: string[] = [];
  lines.push('### Démarrage\n', head(['', ...rs.map(name)]));
  const bootRow = (l: string, f: (r: any) => unknown) => lines.push(`| ${l} | ${rs.map((r) => (r.boot ? f(r) : '—')).join(' | ')} |`);
  bootRow('monde prêt (ms)', (r) => r.boot.readyMs);
  bootRow('requêtes (dont png, scripts)', (r) => `${r.boot.requests} (${r.boot.png}, ${r.boot.js})`);
  bootRow('png (Ko)', (r) => r.boot.pngKB);
  bootRow('scripts (Ko)', (r) => r.boot.jsKB);
  bootRow('1er create (ms)', (r) => Math.round(r.boot.firstCreate?.ms ?? 0));
  bootRow('textures après le démarrage (Mo)', (r) => `${r.boot.textures.keys} (${r1(r.boot.textures.MB)})`);
  bootRow('tas JS (Mo)', (r) => r.boot.memory.heapMB);
  lines.push('\n### Zones : prêt (ms), entre parenthèses le create de la scène (ms)\n', head(['zone', ...rs.flatMap((r) => [`${r.label} 1re`, `${r.label} 2e`])]));
  const zones = [...new Set(rs.flatMap((r) => r.zones.map((z: any) => z.zone)))];
  for (const z of zones)
    lines.push(`| ${z} | ${rs.flatMap((r) => [1, 2].map((p) => { const e = r.zones.find((x: any) => x.zone === z && x.pass === p); return e ? `${e.ready} (${e.create})` : '—'; })).join(' | ')} |`);
  const sit = (title: string, get: (r: any) => any) => {
    lines.push(`\n### ${title}\n`, head(['', ...rs.map(name)]));
    const row = (l: string, f: (s: any) => unknown) => lines.push(`| ${l} | ${rs.map((r) => { const s = get(r); return s ? f(s) : '—'; }).join(' | ')} |`);
    row('images/s', (s) => s.imagesPerSec);
    row('image p50 / p95 / max (ms)', (s) => `${s.image.p50} / ${s.image.p95} / ${s.image.max}`);
    row('images > 20 ms / > 33 ms', (s) => `${s.image.over20} / ${s.image.over33} (sur ${s.image.count})`);
    row('pas par image (moy / max)', (s) => `${s.stepsPerImage.avg} / ${s.stepsPerImage.max}`);
    row("coût d'un pas (ms)", (s) => s.stepCost);
    row('physique / monde / HUD (ms par image)', (s) => `${s.cpuPerImage.physics} / ${s.cpuPerImage.world} / ${s.cpuPerImage.hud}`);
    row('tri / dessin (ms par image)', (s) => `${s.cpuPerImage.sort} / ${s.cpuPerImage.render}`);
    row('appels de dessin par image', (s) => s.gl.draws);
    row('envois de texture par image (k px)', (s) => `${s.gl.uploads} (${s.gl.uploadKpx})`);
    row('objets / visibles / dans la vue', (s) => `${s.census.all} / ${s.census.visible} / ${s.census.inView}`);
    row('corps statiques / dynamiques', (s) => `${s.census.statics} / ${s.census.bodies}`);
    row('textures (Mo)', (s) => `${s.textures.keys} (${s.textures.MB})`);
    row('tas JS (Mo)', (s) => s.memory.after.heapMB);
    row('GC (ms sur la période)', (s) => s.profile.gcMs);
  };
  sit('Dehors loin du coq (ferme), immobile', (r) => r.situations.loin);
  sit('Dehors loin du coq (ferme), en marchant', (r) => r.situations.loinMarche);
  sit('Devant la maison du coq, immobile', (r) => r.situations.devant);
  sit('Devant la maison du coq, en marchant', (r) => r.situations.devantMarche);
  for (const [k, t] of [['porteDehors', 'Ouvrir la porte en arc'], ['basImmobile', 'Dedans en bas, immobile'], ['basMarche', 'Dedans en bas, en marchant'], ['escalier', "Monter l'escalier"], ['hautImmobile', 'Dedans en haut, immobile'], ['portePalier', 'Ouvrir une porte du palier'], ['hautMarche', 'Dedans en haut, en marchant'], ['descendre', "Descendre l'escalier"]] as const)
    if (rs.some((r) => r.maison?.[k])) sit(t, (r) => r.maison?.[k]);
  console.log(lines.join('\n'));
}

/** Ce qui est mesuré jusqu'ici, écrit si le parcours échoue. */
let partial: { out: any; outFile: string; close: () => Promise<void> } | undefined;

try {
  await main();
} catch (e) {
  console.error(`échec : ${String(e).slice(0, 400)}`);
  if (partial) {
    partial.out.failure = String(e);
    writeFileSync(partial.outFile, JSON.stringify(partial.out, null, 1));
    console.log(`rapport partiel : ${partial.outFile}`);
    await partial.close();
  }
  process.exit(1);
}
