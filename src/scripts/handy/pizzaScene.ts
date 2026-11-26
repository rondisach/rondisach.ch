// 3D-Pizza für den Handy-Einstieg: Aus dem Pizzafoto wird ein Relief berechnet –
// der Rand wölbt sich auf, Käse, Basilikum und Belag stehen leicht vor. Seitliches Licht macht die Höhen sichtbar.
// Die Pizza dreht sich langsam; mit dem Finger lässt sie sich drehen, Antippen zeigt die nächste Sorte.
import {
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Die Pizza füllt rund 88 % des Fotos (freigestellt, mittig). */
const FILL = 0.88;
/** Auflösung des Reliefs (Ecken pro Seite) */
const GRID = 150;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Pixel eines Bildes in einer bestimmten Grösse (kleiner = weicher). */
function pixels(img: HTMLImageElement, size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, size, size);
  return g.getImageData(0, 0, size, size).data;
}

/**
 * Relief aus dem Foto: Grundwölbung + aufgewölbter Rand + Belag nach Helligkeit und Farbe.
 * Zwei Auflösungen: eine weiche (Formen) und eine feinere (Details), damit es nicht verrauscht aussieht.
 */
function buildRelief(img: HTMLImageElement) {
  const S = 96;
  const soft = pixels(img, 48);
  const fine = pixels(img, S);
  const sample = (d: Uint8ClampedArray, size: number, u: number, v: number) => {
    const x = Math.min(size - 1, Math.max(0, Math.floor(u * size)));
    const y = Math.min(size - 1, Math.max(0, Math.floor(v * size)));
    const i = (y * size + x) * 4;
    return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, d[i + 3] / 255];
  };

  // Umriss der Pizza: für jede Richtung, wie weit sie reicht (Pizzen sind nie ganz rund)
  const A = 192;
  const alpha = pixels(img, A);
  const RAYS = 180;
  const edge = Array.from({ length: RAYS }, (_, k) => {
    const a = (k / RAYS) * Math.PI * 2;
    let r = 0.3;
    while (r < 0.5) {
      const x = Math.floor((0.5 + Math.cos(a) * r) * A);
      const y = Math.floor((0.5 + Math.sin(a) * r) * A);
      if (alpha[(y * A + x) * 4 + 3] < 128) break;
      r += 0.002;
    }
    return r;
  });
  const edgeAt = (a: number) => {
    const f = ((a / (Math.PI * 2)) * RAYS + RAYS) % RAYS;
    const i = Math.floor(f);
    const t = f - i;
    return edge[i] * (1 - t) + edge[(i + 1) % RAYS] * t;
  };

  const geo = new PlaneGeometry(2, 2, GRID, GRID);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = 1 - uv.getY(i);
    // Abstand zur Mitte, 1 = Umriss der Pizza in dieser Richtung
    const r = Math.hypot(u - 0.5, v - 0.5) / edgeAt(Math.atan2(v - 0.5, u - 0.5));
    const [sr, sg, sb] = sample(soft, 48, u, v);
    const [fr, fg, fb] = sample(fine, S, u, v);
    let h: number;
    if (r >= 1) {
      // Ausserhalb der Pizza: flach auf Bodenhöhe, die Kante blendet das Material aus
      h = 0;
    } else {
      // Leichte Wölbung zur Mitte
      const dome = 0.035 * (1 - r * r);
      // Aufgegangener Rand (Cornicione): Wulst kurz vor der Kante, aussen abgerundet
      // Läuft genau am Umriss auf 0 aus, damit die Kante sauber bleibt
      const rim = 0.1 * smooth(0.7, 0.86, r) * (1 - smooth(0.9, 1, r));
      // Belag: helle, wenig farbige Stellen (Mozzarella) stehen vor, Basilikum und Fleisch leicht
      const lum = 0.6 * (0.3 * sr + 0.59 * sg + 0.11 * sb) + 0.4 * (0.3 * fr + 0.59 * fg + 0.11 * fb);
      const sat = Math.max(fr, fg, fb) - Math.min(fr, fg, fb);
      const cheese = smooth(0.62, 0.9, lum) * (1 - smooth(0.25, 0.5, sat));
      const green = smooth(0.05, 0.2, fg - Math.max(fr, fb));
      const meat = smooth(0.25, 0.45, fr - fg) * smooth(0.2, 0.45, lum);
      const inner = 1 - smooth(0.7, 0.85, r);
      const toppings = inner * (0.028 * cheese + 0.025 * green + 0.02 * meat + 0.012 * (lum - 0.5));
      h = dome + rim + toppings;
    }
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Weicher, runder Schatten als Textur. */
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(60,35,20,0.42)');
  grad.addColorStop(0.6, 'rgba(60,35,20,0.18)');
  grad.addColorStop(1, 'rgba(60,35,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export function createPizzaScene(canvas: HTMLCanvasElement, srcs: string[], onChange?: (i: number) => void) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);

  scene.add(new HemisphereLight(0xfff4e6, 0x6b4a33, 1.5));
  // Flaches, warmes Seitenlicht: so werfen Rand und Belag sichtbare Schatten auf die Pizza
  const sun = new DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(-3, 2.2, 1.5);
  scene.add(sun);

  const tilt = new Group();
  const spin = new Group();
  tilt.add(spin);
  scene.add(tilt);

  const top = new MeshStandardMaterial({ roughness: 0.78, alphaTest: 0.5 });
  const surface = new Mesh(new PlaneGeometry(2, 2), top);
  surface.visible = false;
  // Unterseite: etwas kleinerer, gebackener Boden, damit die Pizza beim Kippen Dicke hat
  const base = new Mesh(
    new CylinderGeometry(FILL * 0.95, FILL * 0.9, 0.06, 64),
    new MeshStandardMaterial({ color: 0xb37a45, roughness: 0.9 }),
  );
  base.position.y = -0.031;
  spin.add(surface, base);

  const shadow = new Mesh(
    new PlaneGeometry(2.6, 2.6),
    new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.32;
  scene.add(shadow);

  // Sorten laden: Bild → Textur und Relief (einmal pro Sorte, dann gemerkt)
  const cache = new Map<number, Promise<{ tex: Texture; geo: PlaneGeometry }>>();
  const prepare = (i: number) => {
    let job = cache.get(i);
    if (!job) {
      job = loadImage(srcs[i]).then((img) => {
        const tex = new Texture(img);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        return { tex, geo: buildRelief(img) };
      });
      cache.set(i, job);
    }
    return job;
  };

  let index = 0;
  let swap = 0; // 0..1..0: Pizza kippt kurz weg und kommt mit der neuen Sorte zurück
  let swapping = false;
  const show = async (i: number) => {
    const { tex, geo } = await prepare(i);
    surface.geometry = geo;
    top.map = tex;
    top.needsUpdate = true;
    surface.visible = true;
    index = i;
    onChange?.(i);
    // Die nächste schon vorbereiten
    if (srcs.length > 1) prepare((i + 1) % srcs.length);
  };
  show(0);

  const next = () => {
    if (swapping || srcs.length < 2) return;
    swapping = true;
    const target = (index + 1) % srcs.length;
    prepare(target);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = clamp((t - t0) / 700);
      swap = Math.sin(k * Math.PI);
      if (k >= 0.5 && index !== target) show(target);
      if (k < 1) requestAnimationFrame(step);
      else {
        swap = 0;
        swapping = false;
      }
    };
    requestAnimationFrame(step);
  };

  // Drehen mit dem Finger, mit Schwung; Antippen (ohne Ziehen) zeigt die nächste Sorte.
  // Senkrechtes Wischen scrollt weiterhin die Seite.
  let angle = 0;
  let speed = 0.25;
  let dragging = false;
  let lastX = 0;
  let moved = 0;
  let lastMove = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastMove = performance.now();
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    lastX = e.clientX;
    moved += Math.abs(dx);
    angle += dx * 0.012;
    speed = (dx * 0.012) / Math.max(0.016, (now - lastMove) / 1000);
    lastMove = now;
  });
  addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) next();
  });
  addEventListener('pointercancel', () => (dragging = false));

  let scroll = 0;
  const born = performance.now();
  let raf = 0;
  let last = performance.now();
  let running = false;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Abstand so, dass die Pizza rund 90 % der Breite füllt
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    const d = Math.max(4, FILL / 0.9 / halfW);
    const a = (40 * Math.PI) / 180;
    camera.position.set(0, Math.sin(a) * d, Math.cos(a) * d);
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    // Schwung klingt aus, bis wieder die ruhige Grunddrehung erreicht ist
    if (!dragging) {
      speed += (0.25 - speed) * (1 - Math.exp(-dt * 1.6));
      angle += speed * dt;
    }
    spin.rotation.y = angle;
    // Beim Laden sanft von oben herein; beim Wegscrollen kippt sie etwas steiler
    const enter = smooth(0, 1, (now - born) / 1100);
    tilt.position.y = (1 - enter) * 0.8 + Math.sin(t * 1.1) * 0.02 - swap * 0.25;
    tilt.rotation.x = scroll * 0.45 + swap * 0.35;
    tilt.rotation.z = Math.sin(t * 0.6) * 0.03;
    tilt.scale.setScalar((0.9 + enter * 0.1) * (1 - swap * 0.12));
    (shadow.material as MeshBasicMaterial).opacity = enter * (1 - swap * 0.4);
    renderer.render(scene, camera);
  };

  return {
    /** 0 = Einstieg ganz sichtbar, 1 = weggescrollt */
    setScroll(v: number) {
      scroll = clamp(v);
    },
    next,
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
  };
}
