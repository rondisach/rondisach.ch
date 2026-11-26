// 3D-Pizza für den Handy-Einstieg: eine echte Pizza (Foto als Oberfläche) schwebt, dreht sich und dampft.
// Beim Scrollen wendet sie sich wie eine Münze zur nächsten Sorte; am Schluss fällt sie in Stücke auseinander.
// Zeitplan: siehe timeline.ts.
import {
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from 'three';
import { END, INTRO } from './timeline';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => x * x * (3 - 2 * x);
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

/** Weicher, runder Fleck als Textur (für Dampf und Schatten). */
function blob(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export function createPizzaScene(canvas: HTMLCanvasElement, srcs: string[]) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 50);

  scene.add(new HemisphereLight(0xfff3e2, 0x5a3a24, 2.1));
  const sun = new DirectionalLight(0xffffff, 1.5);
  sun.position.set(2.5, 5, 3);
  scene.add(sun);

  // Texturen der Sorten; bis sie geladen sind, ist die Oberfläche teigfarben
  const loader = new TextureLoader();
  const textures: (Texture | null)[] = srcs.map(() => null);
  const topMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, alphaTest: 0.4 });
  const bottomMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, alphaTest: 0.4 });
  const crustMat = new MeshStandardMaterial({ color: 0xa8703c, roughness: 0.9, side: DoubleSide });
  let shown = -1;
  const show = (i: number) => {
    if (i === shown) return;
    shown = i;
    const t = textures[i];
    topMat.map = bottomMat.map = t;
    topMat.color.set(t ? 0xffffff : 0xe8c48c);
    bottomMat.color.copy(topMat.color);
    topMat.needsUpdate = bottomMat.needsUpdate = true;
  };
  srcs.forEach((src, i) => {
    loader.load(src, (t) => {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      // Die Pizza füllt rund 88 % des Fotos: so weit hineinzoomen, dass sie die Scheibe ganz bedeckt
      t.repeat.set(0.84, 0.84);
      t.offset.set(0.08, 0.08);
      textures[i] = t;
      if (i === shown) {
        shown = -1;
        show(i);
      }
    });
  });

  // Pizza aus 8 Stücken, damit sie am Schluss auseinanderfallen kann.
  // holder: Position und Wenden · spinner: Drehung um die eigene Achse
  const holder = new Group();
  const spinner = new Group();
  holder.add(spinner);
  scene.add(holder);
  const N = 8;
  const step = (Math.PI * 2) / N;
  const slices = Array.from({ length: N }, (_, i) => {
    const geo = new CylinderGeometry(1, 1, 0.05, 8, 1, false, i * step, step);
    const m = new Mesh(geo, [crustMat, topMat, bottomMat]);
    const mid = i * step + step / 2;
    spinner.add(m);
    return { m, dx: Math.sin(mid), dz: Math.cos(mid), lift: 0.4 + ((i * 37) % 5) * 0.12, tw: (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.2) };
  });

  // Weicher Schatten unter der Pizza
  const shadow = new Mesh(
    new PlaneGeometry(2.6, 2.6),
    new MeshBasicMaterial({ map: blob('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.7;
  scene.add(shadow);

  // Dampf steigt auf
  const steamTex = blob('rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
  const steam = Array.from({ length: 7 }, (_, i) => {
    const s = new Sprite(new SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    scene.add(s);
    return { s, x: (((i * 53) % 7) / 7 - 0.5) * 1.1, z: (((i * 29) % 5) / 5 - 0.5) * 0.8, off: i / 7 };
  });

  let p = 0;
  let target = 0;
  let born = performance.now();
  let raf = 0;
  let last = performance.now();
  let running = false;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Abstand so wählen, dass die Pizza rund 84 % der Breite füllt
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    const d = Math.max(5.2, 1 / 0.84 / halfW);
    const a = (52 * Math.PI) / 180;
    camera.position.set(0, Math.sin(a) * d, Math.cos(a) * d);
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Dem Scrollen weich folgen
    p += (target - p) * (1 - Math.exp(-dt * 7));
    const t = now / 1000;
    const n = srcs.length;

    // Beim Laden fliegt die Pizza von unten herein
    const enter = ease(clamp((now - born) / 1300));
    const rise = seg(p, 0, INTRO);
    holder.position.y = -0.55 + rise * 0.6 - (1 - enter) * 3 + Math.sin(t * 1.3) * 0.04;
    holder.scale.setScalar(0.82 + rise * 0.18);

    // Wenden zwischen den Sorten: je eine halbe Umdrehung um die Querachse, Textur wechselt, wenn die Pizza auf der Kante steht
    const len = (END - INTRO) / n;
    let flip = 0;
    let idx = 0;
    for (let k = 1; k < n; k++) {
      const b = INTRO + k * len;
      const f = seg(p, b - len * 0.22, b + len * 0.22);
      flip += f;
      if (f >= 0.5) idx = k;
    }
    show(idx);
    holder.rotation.x = flip * Math.PI;
    holder.rotation.z = Math.sin(t * 0.7) * 0.05;
    spinner.rotation.y = t * 0.25 + p * 7;

    // Schluss: Stücke fliegen nach aussen und oben weg
    const burst = seg(p, END, 0.98);
    for (const s of slices) {
      const r = burst * 2.6;
      s.m.position.set(s.dx * r, burst * s.lift * 2, s.dz * r);
      s.m.rotation.set(burst * s.tw, 0, burst * s.tw * 0.6);
      // Gegen Ende schrumpfen, damit kein Stück (z. B. eines, das nach hinten fliegt) stehen bleibt
      s.m.scale.setScalar(1 - seg(burst, 0.55, 1));
    }

    const sm = shadow.material as MeshBasicMaterial;
    sm.opacity = (1 - burst) * enter * (0.75 - Math.abs(Math.sin(flip * Math.PI)) * 0.25);
    shadow.scale.setScalar(holder.scale.x * (1 + (holder.position.y + 0.55) * 0.15));

    // Dampf nur, solange die Pizza ganz und flach daliegt
    const calm = (1 - burst) * enter * (1 - Math.abs(Math.sin(flip * Math.PI)));
    for (const s of steam) {
      const k = (t * 0.28 + s.off) % 1;
      s.s.position.set(s.x + Math.sin(t + s.off * 9) * 0.12, holder.position.y + 0.15 + k * 1.7, s.z);
      s.s.scale.setScalar(0.18 + k * 0.55);
      (s.s.material as SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.28 * calm;
    }

    renderer.render(scene, camera);
  };

  return {
    /** Ziel-Fortschritt 0..1 aus dem Scrollen */
    setProgress(v: number) {
      target = clamp(v);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    /** Nur für Tests: sofort an eine Stelle springen */
    jump(v: number) {
      target = p = clamp(v);
      born = 0;
    },
  };
}
