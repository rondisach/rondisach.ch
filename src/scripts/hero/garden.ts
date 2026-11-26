// Low-Poly-Garten zur goldenen Stunde: Himmel, Wiese, Bäume, Berge, Lichterketten, Tische und Gäste.
import {
  BackSide,
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  DoubleSide,
  TorusGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Raycaster,
  BufferGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { buildVariantPizza, type PizzaKind } from './pizzas';

export const GARDEN = {
  skyTop: 0x8aa3c8,
  skyMid: 0xf6c48a,
  horizon: 0xf29a5c,
  grass: 0x7c9a45,
  grassDark: 0x5f7d34,
  trunk: 0x6b4a33,
  leaves: [0x4f7a34, 0x5d8a3a, 0x6f9a44, 0x46703a],
  mountain: 0x9b8aa6,
  wood: 0x9a6b45,
  woodDark: 0x6e4a30,
  cloth: 0xf3eee4,
  skin: [0xf1c6a1, 0xd9a47c, 0xb57b52, 0xf5d3b5, 0x8a5a3c],
  shirts: [0xb83c2e, 0xf3eee4, 0x3e5c76, 0xd9a441, 0x6d7f4f, 0x2c2925, 0xe0896b, 0x7a6aa0],
  pants: [0x2c2925, 0x4a5568, 0x6b5a48, 0x3d4b5c, 0x5a6f8c, 0xc8b89a],
  hair: [0x2b1d14, 0x5a3b22, 0x1a1a1a, 0x9c6b3c, 0xd2b48c],
  apron: 0x1f2c44,
  bulb: 0xffd38a,
};

/** Reproduzierbarer Zufall, damit der Garten bei jedem Laden gleich aussieht. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MatOptions = Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]>;
const flat = (color: number, extra: MatOptions = {}) =>
  new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
/** Weiche Schattierung für Menschen – wirkt weniger kantig als die Landschaft. */
const smooth = (color: number, extra: MatOptions = {}) => new MeshStandardMaterial({ color, roughness: 0.75, ...extra });

export function buildSky() {
  const mat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new Color(GARDEN.skyTop) },
      mid: { value: new Color(GARDEN.skyMid) },
      bottom: { value: new Color(GARDEN.horizon) },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      varying float vY;
      void main() {
        float y = clamp(vY, 0.0, 1.0);
        vec3 c = mix(bottom, mid, smoothstep(0.0, 0.12, y));
        c = mix(c, top, smoothstep(0.12, 0.6, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new Mesh(new SphereGeometry(120, 24, 16), mat);

  const sun = new Mesh(new CircleGeometry(5, 32), new MeshBasicMaterial({ color: 0xffe6b0, fog: false }));
  sun.position.set(-38, 4.5, -95);
  sun.lookAt(0, 2, 0);
  const glow = new Mesh(
    new CircleGeometry(11, 32),
    new MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.35, fog: false, depthWrite: false }),
  );
  glow.position.copy(sun.position).add(new Vector3(0, 0, 0.2));
  glow.lookAt(0, 2, 0);

  const group = new Group();
  group.add(sky, glow, sun);
  return group;
}

export function buildGround(rand: () => number) {
  const geo = new PlaneGeometry(90, 90, 45, 45);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z + 2);
    // Im Gartenbereich fast flach, weiter aussen sanfte Hügel
    const amp = d < 14 ? 0.04 : Math.min(1.6, (d - 14) * 0.08);
    pos.setY(i, (rand() - 0.5) * amp + (d > 20 ? Math.sin(x * 0.15) * Math.cos(z * 0.12) * amp : 0));
  }
  geo.computeVertexNormals();
  const ground = new Mesh(geo, flat(GARDEN.grass));
  ground.receiveShadow = true;

  const g = new Group();
  g.add(ground);
  return g;
}

export function buildMountains(rand: () => number) {
  const g = new Group();
  const mat = flat(GARDEN.mountain, { roughness: 1 });
  const snow = flat(0xf4ede6);
  for (let i = 0; i < 9; i++) {
    const h = 10 + rand() * 14;
    const r = 9 + rand() * 9;
    const m = new Mesh(new ConeGeometry(r, h, 5 + Math.floor(rand() * 3)), mat);
    m.position.set(-55 + i * 14 + (rand() - 0.5) * 6, h / 2 - 1, -70 - rand() * 12);
    m.rotation.y = rand() * Math.PI;
    g.add(m);
    if (h > 18) {
      const cap = new Mesh(new ConeGeometry(r * 0.28, h * 0.28, m.geometry.parameters.radialSegments), snow);
      cap.position.copy(m.position).setY(m.position.y + h * 0.36);
      cap.rotation.y = m.rotation.y;
      g.add(cap);
    }
  }
  return g;
}

export function buildTree(rand: () => number, scale = 1) {
  const tree = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.12, 0.18, 1.6, 6), flat(GARDEN.trunk));
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  tree.add(trunk);
  const leafColor = GARDEN.leaves[Math.floor(rand() * GARDEN.leaves.length)];
  const blobs = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < blobs; i++) {
    const c = new Mesh(new IcosahedronGeometry(0.9 + rand() * 0.4, 0), flat(leafColor));
    c.position.set((rand() - 0.5) * 0.7, 1.9 + i * 0.55, (rand() - 0.5) * 0.7);
    c.rotation.set(rand(), rand(), rand());
    c.castShadow = true;
    tree.add(c);
  }
  tree.scale.setScalar(scale);
  return tree;
}

export function buildBush(rand: () => number) {
  const b = new Mesh(new DodecahedronGeometry(0.5 + rand() * 0.3, 0), flat(GARDEN.grassDark));
  b.scale.y = 0.7;
  b.position.y = 0.25;
  b.rotation.y = rand() * Math.PI;
  b.castShadow = true;
  return b;
}

/** Kiesweg, der der Kamerafahrt folgt. */
export function buildPathStones(curve: { getPoint(t: number): Vector3 }, rand: () => number, count = 34) {
  const path = new Group();
  const stoneMat = flat(0xd8c7a8);
  const stoneGeo = new CylinderGeometry(0.32, 0.36, 0.04, 7);
  for (let i = 0; i < count; i++) {
    const p = curve.getPoint(0.04 + (i / (count - 1)) * 0.86);
    const s = new Mesh(stoneGeo, stoneMat);
    s.position.set(p.x + (rand() - 0.5) * 0.3, 0.02, p.z + (rand() - 0.5) * 0.2);
    s.rotation.y = rand() * Math.PI;
    s.scale.setScalar(0.8 + rand() * 0.4);
    s.receiveShadow = true;
    path.add(s);
  }
  return path;
}

/** Lichterkette zwischen Masten, mit durchhängenden Kabeln und leuchtenden Birnen. */
export function buildStringLights(poles: Vector3[], bulbsPerSpan = 10) {
  const g = new Group();
  const poleMat = flat(GARDEN.woodDark);
  const wireMat = new LineBasicMaterial({ color: 0x2c2925 });
  const bulbPositions: Vector3[] = [];

  for (const p of poles) {
    const pole = new Mesh(new CylinderGeometry(0.04, 0.05, p.y, 5), poleMat);
    pole.position.set(p.x, p.y / 2, p.z);
    pole.castShadow = true;
    g.add(pole);
  }
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i];
    const b = poles[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 0.6;
    const curve = new QuadraticBezierCurve3(a, mid, b);
    g.add(new Line(new BufferGeometry().setFromPoints(curve.getPoints(24)), wireMat));
    for (let k = 1; k < bulbsPerSpan; k++) bulbPositions.push(curve.getPoint(k / bulbsPerSpan).add(new Vector3(0, -0.06, 0)));
  }

  const bulbs = new InstancedMesh(
    new SphereGeometry(0.045, 8, 6),
    new MeshStandardMaterial({ color: GARDEN.bulb, emissive: GARDEN.bulb, emissiveIntensity: 2.4 }),
    bulbPositions.length,
  );
  const m = new Matrix4();
  bulbPositions.forEach((p, i) => bulbs.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  g.add(bulbs);
  return g;
}

export interface Person extends Group {
  userData: {
    /** Schultergelenke */
    armL: Object3D;
    armR: Object3D;
    /** Ellbogengelenke (Kinder der Schultern) */
    foreL: Object3D;
    foreR: Object3D;
    head: Object3D;
    phase: number;
    /** Eigenes Tempo, damit nicht alle gleichzeitig abbeissen */
    pace: number;
    sit: boolean;
    /** Gehaltenes Glas – wird aufrecht gehalten, egal wie der Arm steht */
    glass?: Object3D;
    action: 'eat' | 'drink' | 'talk' | 'work' | 'toast' | 'none';
    /** 0–1: wie stark die Figur gerade jubelt (z. B. wenn die Pizza aus dem Ofen kommt) */
    cheer?: number;
  };
}

interface PersonOptions {
  rand: () => number;
  pose?: 'stand' | 'sit';
  apron?: boolean;
  hold?: 'slice' | 'glass' | null;
  shirt?: number;
}

/** Jede Ecke einer Geometrie durch `fn` schicken – so entstehen kantige Gesichter, Schuhe und Hände aus einfachen Formen. */
function shape<T extends BufferGeometry>(geo: T, fn: (v: Vector3) => void): T {
  const pos = geo.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Drehkörper aus einem Profil (Radius, Höhe), vorne-hinten flacher als breit. */
function lathe(profile: [number, number][], segments: number, depth: number) {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    segments,
  ).scale(1, 1, depth);
}

/** Form des Kopfes: schmaleres Kinn, flachere Stirn, seitlich etwas schmaler. */
function headShape(v: Vector3, r: number, jaw: number) {
  v.y *= 1.14;
  v.x *= 0.9;
  // Nach unten zum Kinn hin schmaler
  const down = Math.min(1, Math.max(0, -v.y / (r * 1.14)));
  v.x *= 1 - 0.3 * down * jaw;
  v.z *= 1 - 0.1 * down;
  if (v.z > 0) v.z *= 0.92;
  // Kinn leicht nach vorne
  if (v.y < -r * 0.6 && v.z > 0) v.z += r * 0.08;
}

/** Facettierter Kopf wie bei einer Low-Poly-Figur. */
function headGeometry(r: number, jaw: number) {
  return shape(new SphereGeometry(r, 10, 8), (v) => headShape(v, r, jaw));
}

/**
 * Haare oder Bart als Hülle, die genau der Kopfform folgt.
 * `grow(n)` bekommt die Richtung vom Kopfmittelpunkt (Länge 1) und sagt, wie weit die Hülle dort absteht;
 * 0 heisst «keine Haare» – diese Ecken verschwinden im Kopf, so entsteht ein sauberer Haaransatz.
 */
function hairShell(r: number, jaw: number, grow: (n: Vector3) => number) {
  const n = new Vector3();
  // Feiner unterteilt als der Kopf, damit der Haaransatz sauber verläuft
  return shape(new SphereGeometry(r, 16, 13), (v) => {
    n.copy(v).divideScalar(r);
    const k = grow(n);
    headShape(v, r, jaw);
    if (k > 0) {
      v.multiplyScalar(1 + k);
    } else {
      v.multiplyScalar(0.8);
    }
  });
}

/** Wie hoch der Haaransatz liegt: vorne an der Stirn hoch, über den Ohren mittel, im Nacken tief. */
const hairline = (n: Vector3) => (n.z >= 0 ? 0.2 + 0.3 * n.z : 0.2 + 0.62 * n.z);

type Outfit = 'tee' | 'shirt' | 'jacket' | 'sweater' | 'dress';
type Hairstyle = 'short' | 'quiff' | 'long' | 'bun' | 'ponytail' | 'bald';

/**
 * Low-Poly-Figur, ca. 1.75 m gross: kantiges Gesicht mit Nase, Ohren und Brauen, schlanke, zulaufende Glieder.
 * Kleidung, Frisur, Statur, Bart und Brille sind bei jeder Person anders.
 */
export function buildPerson({ rand, pose = 'stand', apron = false, hold = null, shirt }: PersonOptions): Person {
  const p = new Group() as Person;
  const pick = (list: number[]) => list[Math.floor(rand() * list.length)];
  // Genau so viele Aufrufe von `rand` wie früher, damit der restliche Garten gleich bleibt.
  // Alles Weitere fürs Aussehen kommt aus einem eigenen Zufall pro Person.
  const skinColor = pick(GARDEN.skin);
  const topColor = shirt ?? pick(GARDEN.shirts);
  const pantsColor = pick(GARDEN.pants);
  const hairColor = pick(GARDEN.hair);
  const look = rng(Math.floor(rand() * 2 ** 31));
  const phase = rand() * Math.PI * 2;
  const pace = 0.75 + rand() * 0.5;
  const choose = <T,>(list: readonly T[]) => list[Math.floor(look() * list.length)];

  const sit = pose === 'sit';
  const hip = sit ? 0.47 : 0.88;
  const skin = flat(skinColor, { roughness: 0.8 });
  const topMat = flat(topColor, { roughness: 0.85 });
  const pantsMat = flat(pantsColor);
  const hairMat = flat(look() < 0.12 ? 0x9a948c : hairColor, { roughness: 0.8 });
  const shoeMat = flat(choose([0x2a2522, 0x3b2a20, 0x5a4636, 0xe9e4da]), { roughness: 0.7 });
  const dark = flat(0x2b221d);

  // Aussehen auswürfeln
  const feminine = look() < 0.5;
  const hairstyle: Hairstyle = feminine
    ? choose(['long', 'long', 'bun', 'ponytail', 'short'] as const)
    : choose(['short', 'short', 'quiff', 'quiff', 'bald'] as const);
  let outfit: Outfit = apron ? 'shirt' : choose(['tee', 'tee', 'shirt', 'jacket', 'sweater'] as const);
  if (!apron && !sit && feminine && look() < 0.35) outfit = 'dress';
  const shorts = !apron && outfit === 'tee' && look() < 0.4;
  const beard = !feminine && look() < 0.35;
  const glasses = look() < 0.18;
  const build = 0.9 + look() * 0.22;
  const jaw = feminine ? 1.15 : 0.75 + look() * 0.3;
  const innerMat = flat(choose([0xf3eee4, 0xdfe6ee, 0xf3eee4]));
  const shoulderX = 0.19 * build + 0.015;

  // Beine: Oberschenkel, Unterschenkel und Schuh (vorne flacher und schmaler)
  const shinMat = shorts || outfit === 'dress' ? skin : pantsMat;
  const shoeGeo = shape(new BoxGeometry(0.09, 0.07, 0.21, 1, 1, 2), (v) => {
    if (v.z > 0.02) {
      v.x *= 0.82;
      if (v.y > 0) v.y -= 0.028;
    }
  });
  for (const side of [-1, 1]) {
    const x = side * 0.095 * build;
    const thigh = new Mesh(new CylinderGeometry(0.078, 0.06, 0.44, 7), pantsMat);
    const shin = new Mesh(new CylinderGeometry(0.058, 0.045, 0.42, 7), shinMat);
    const shoe = new Mesh(shoeGeo, shoeMat);
    if (sit) {
      // Liegt waagrecht, das breite Ende an der Hüfte
      thigh.rotation.x = -Math.PI / 2;
      thigh.position.set(x, hip, 0.2);
      shin.position.set(x, 0.25, 0.42);
      shoe.position.set(x, 0.035, 0.47);
    } else {
      thigh.position.set(x, hip - 0.2, 0);
      shin.position.set(x, 0.27, 0);
      shoe.position.set(x, 0.035, 0.04);
    }
    thigh.castShadow = shin.castShadow = true;
    if (outfit === 'dress') p.add(shin, shoe);
    else p.add(thigh, shin, shoe);
  }

  // Becken, Oberkörper mit abfallenden Schultern
  const hips = new Mesh(new CylinderGeometry(0.15 * build, 0.145 * build, 0.17, 8).scale(1, 1, 0.66), outfit === 'dress' ? topMat : pantsMat);
  hips.position.y = hip + 0.04;
  p.add(hips);
  const torso = new Mesh(
    lathe(
      [
        [0.15, 0],
        [0.155, 0.12],
        [0.185, 0.34],
        [0.2, 0.45],
        [0.17, 0.51],
        [0.07, 0.545],
      ],
      8,
      0.62,
    ).scale(build, 1, 1),
    topMat,
  );
  torso.position.y = hip + 0.06;
  torso.castShadow = true;
  p.add(torso);
  if (outfit === 'dress') {
    const skirt = new Mesh(lathe([[0.15, 0], [0.2, -0.2], [0.25, -0.43], [0, -0.43]], 9, 0.75).scale(build, 1, 1), topMat);
    skirt.position.y = hip + 0.1;
    skirt.castShadow = true;
    p.add(skirt);
  }

  // Kragen und Ausschnitt
  const collar = new Mesh(new CylinderGeometry(0.062, 0.078, 0.035, 8), outfit === 'jacket' ? innerMat : topMat);
  collar.position.y = hip + 0.595;
  p.add(collar);
  if (outfit === 'jacket') {
    // Beim Sakko schaut vorne das Hemd heraus, manchmal mit Krawatte
    const v = new Mesh(new CircleGeometry(0.055, 3).scale(0.75, 1.3, 1), innerMat);
    v.rotation.z = -Math.PI / 2;
    v.position.set(0, hip + 0.52, 0.122);
    v.rotation.x = -0.3;
    p.add(v);
    if (outfit === 'jacket' && look() < 0.5) {
      const tie = new Mesh(new CircleGeometry(0.03, 3).scale(0.6, 2.2, 1), flat(choose([0x2c2925, 0x7a2a22, 0x1f2c44])));
      tie.rotation.z = -Math.PI / 2;
      tie.rotation.x = -0.3;
      tie.position.set(0, hip + 0.505, 0.127);
      p.add(tie);
    }
  }
  if (apron) {
    const apronMat = flat(GARDEN.apron);
    const a = new Mesh(
      shape(new BoxGeometry(0.3, 0.72, 0.02), (v) => {
        if (v.y > 0.1) v.x *= 0.8;
      }),
      apronMat,
    );
    a.position.set(0, hip + 0.2, 0.14);
    const strap = new Mesh(new TorusGeometry(0.09, 0.012, 4, 10, Math.PI), apronMat);
    strap.position.set(0, hip + 0.56, 0.12);
    p.add(a, strap);
  }

  // Hals und Kopf
  const neck = new Mesh(new CylinderGeometry(0.05, 0.06, 0.1, 6), skin);
  neck.position.y = hip + 0.65;
  p.add(neck);
  const head = new Group();
  head.position.y = hip + 0.815;
  const face = new Group();
  face.scale.setScalar(0.95 + look() * 0.1);
  head.add(face);
  const R = 0.12;
  const skull = new Mesh(headGeometry(R, jaw), skin);
  skull.castShadow = true;
  face.add(skull);
  // Gesichtsteile direkt auf die Oberfläche setzen – so schwebt nichts und nichts versinkt, egal wie das Kinn geformt ist
  const ray = new Raycaster();
  const from = new Vector3();
  const back = new Vector3(0, 0, -1);
  const surface = (x: number, y: number) => {
    ray.set(from.set(x, y, 1), back);
    const hit = ray.intersectObject(skull)[0];
    return hit ? hit.point.z : R * 0.85;
  };
  // Nase als kleiner Keil
  const nose = new Mesh(new ConeGeometry(0.022, 0.056, 4).scale(0.8, 1, 1), skin);
  nose.rotation.x = Math.PI / 2 + 0.35;
  nose.position.set(0, -0.014, surface(0, -0.014) - 0.002);
  // Mund: schmaler, dunkler Strich, manche lächeln leicht
  const lips = flat(feminine ? 0x9c4a42 : 0x7a3e34);
  const mouthY = -0.05;
  const mouth = new Mesh(new BoxGeometry(0.034, 0.007, 0.006), lips);
  mouth.position.set(0, mouthY, surface(0, mouthY) + 0.001);
  face.add(nose, mouth);
  const smile = look() < 0.5;
  for (const side of [-1, 1]) {
    const ear = new Mesh(new BoxGeometry(0.018, 0.045, 0.032), skin);
    ear.position.set(side * 0.1, -0.004, -0.005);
    // Augen und Brauen folgen der Rundung des Gesichts, damit sie von der Seite nicht abstehen
    const eye = new Mesh(new BoxGeometry(0.021, 0.009, 0.006), dark);
    eye.position.set(side * 0.037, 0.016, surface(side * 0.037, 0.016) + 0.001);
    eye.rotation.y = side * 0.35;
    const brow = new Mesh(new BoxGeometry(0.036, 0.009, 0.008), hairMat);
    brow.position.set(side * 0.037, 0.038, surface(side * 0.037, 0.038) + 0.002);
    brow.rotation.set(0, side * 0.35, side * -0.12);
    face.add(ear, eye, brow);
    if (smile) {
      // Mundwinkel leicht nach oben
      const corner = new Mesh(new BoxGeometry(0.01, 0.006, 0.006), lips);
      corner.position.set(side * 0.021, mouthY + 0.003, surface(side * 0.021, mouthY + 0.003) + 0.0005);
      corner.rotation.set(0, side * 0.2, side * 0.6);
      face.add(corner);
    }
  }
  if (glasses) {
    // Sonnenbrille: zwei Gläser mit Steg
    const frame = flat(0x1c1a18, { roughness: 0.4 });
    for (const side of [-1, 1]) {
      const lens = new Mesh(new BoxGeometry(0.036, 0.024, 0.006), frame);
      lens.position.set(side * 0.037, 0.014, surface(side * 0.037, 0.014) + 0.004);
      lens.rotation.y = side * 0.25;
      // Bügel bis zum Ohr
      const arm = new Mesh(new BoxGeometry(0.004, 0.005, 0.1), frame);
      arm.position.set(side * 0.084, 0.018, 0.045);
      arm.rotation.y = -side * 0.5;
      face.add(lens, arm);
    }
    const bridge = new Mesh(new BoxGeometry(0.04, 0.006, 0.006), frame);
    bridge.position.set(0, 0.02, surface(0, 0.02) + 0.004);
    face.add(bridge);
  }
  if (beard) {
    // Vollbart (Kiefer, Kinn, Koteletten und Schnauz) oder nur ein Kinnbart; der Mund bleibt frei
    const full = look() < 0.6;
    const b = new Mesh(
      hairShell(R, jaw, (n) => {
        if (n.z < -0.1) return 0;
        const chin = n.y < -0.6 && n.z > 0.3;
        const jawline = full && n.y < -0.55;
        const sideburn = full && n.y < 0.15 && Math.abs(n.x) > 0.6;
        return chin || jawline || sideburn ? 0.03 : 0;
      }),
      hairMat,
    );
    face.add(b);
    if (full) {
      const stache = new Mesh(new BoxGeometry(0.05, 0.012, 0.012), hairMat);
      stache.position.set(0, mouthY + 0.013, surface(0, mouthY + 0.013) + 0.002);
      face.add(stache);
    }
  }

  // Frisur: Hülle über dem Kopf mit Haaransatz, je nach Stil mit Volumen, langen Haaren, Dutt oder Pferdeschwanz
  const top = (n: Vector3) => Math.max(0, n.y);
  let hair: BufferGeometry;
  if (hairstyle === 'bald') {
    // Kurzer Haarkranz über den Ohren und im Nacken
    hair = hairShell(R, jaw, (n) => (n.z < 0.25 && n.y > -0.35 && n.y < 0.15 ? 0.03 : 0));
  } else if (hairstyle === 'quiff') {
    // Vorne oben mehr Volumen, leicht zur Seite gekämmt
    hair = hairShell(R, jaw, (n) =>
      n.y > hairline(n) ? 0.05 + 0.05 * top(n) + 0.16 * Math.max(0, n.y - 0.3) * Math.max(0, n.z + 0.1) + 0.02 * n.x : 0,
    );
  } else if (hairstyle === 'long') {
    // Bob: rahmt das Gesicht und endet auf Kinnhöhe, unten etwas ausgestellt
    hair = hairShell(R, jaw, (n) =>
      n.y > hairline(n) || (n.z < 0.35 && n.y > -0.6) ? 0.06 + 0.03 * top(n) + 0.1 * Math.max(0, -n.y) : 0,
    );
  } else {
    // Kurz, oder eng anliegend bei Dutt und Pferdeschwanz
    const tight = hairstyle === 'bun' || hairstyle === 'ponytail';
    hair = hairShell(R, jaw, (n) => (n.y > hairline(n) ? (tight ? 0.035 : 0.05) + 0.04 * top(n) : 0));
  }
  face.add(new Mesh(hair, hairMat));
  if (hairstyle === 'bun') {
    const bun = new Mesh(new DodecahedronGeometry(0.05), hairMat);
    bun.position.set(0, 0.1, -0.1);
    face.add(bun);
  } else if (hairstyle === 'ponytail') {
    const knot = new Mesh(new DodecahedronGeometry(0.036), hairMat);
    knot.position.set(0, 0.03, -0.13);
    const tail = new Mesh(new CylinderGeometry(0.036, 0.018, 0.15, 6), hairMat);
    tail.position.set(0, -0.05, -0.14);
    tail.rotation.x = 0.15;
    face.add(knot, tail);
  }
  p.add(head);

  // Arme mit Schulter- und Ellbogengelenk, damit Essen und Trinken natürlich aussehen
  const shortSleeves = outfit === 'tee' || outfit === 'dress';
  const upperGeo = new CylinderGeometry(0.052, 0.043, 0.29, 6).translate(0, -0.135, 0);
  const sleeveGeo = new CylinderGeometry(0.056, 0.053, 0.14, 6).translate(0, -0.055, 0);
  const foreGeo = new CylinderGeometry(0.043, 0.033, 0.27, 6).translate(0, -0.135, 0);
  const cuffGeo = new CylinderGeometry(0.036, 0.036, 0.025, 6);
  const handGeo = shape(new BoxGeometry(0.05, 0.085, 0.03), (v) => {
    if (v.y < 0) v.x *= 0.75;
  });
  const joints = [-1, 1].map((side) => {
    const shoulder = new Object3D();
    shoulder.position.set(side * shoulderX, hip + 0.56, 0);
    const upper = new Mesh(upperGeo, shortSleeves ? skin : topMat);
    upper.castShadow = true;
    shoulder.add(upper);
    if (shortSleeves) shoulder.add(new Mesh(sleeveGeo, topMat));
    const elbow = new Object3D();
    elbow.position.y = -0.28;
    const fore = new Mesh(foreGeo, shortSleeves ? skin : topMat);
    fore.castShadow = true;
    const hand = new Mesh(handGeo, skin);
    hand.position.y = -0.3;
    elbow.add(fore, hand);
    if (outfit === 'jacket') {
      // Hemdmanschette schaut unter dem Ärmel hervor
      const cuff = new Mesh(cuffGeo, innerMat);
      cuff.position.y = -0.26;
      elbow.add(cuff);
    }
    shoulder.add(elbow);
    p.add(shoulder);
    return { shoulder, elbow };
  });

  // Stehende Gäste sind unterschiedlich gross
  if (!sit && !apron) p.scale.setScalar(0.94 + look() * 0.12);

  let glass: Object3D | undefined;
  if (hold) {
    const item = hold === 'slice' ? buildSlice() : buildGlass();
    if (hold === 'glass') glass = item;
    item.position.set(0, -0.32, 0.06);
    joints[1].elbow.add(item);
  }

  p.userData = {
    armL: joints[0].shoulder,
    armR: joints[1].shoulder,
    foreL: joints[0].elbow,
    foreR: joints[1].elbow,
    head,
    phase,
    pace,
    sit,
    glass,
    action: hold === 'slice' ? 'eat' : hold === 'glass' ? 'drink' : 'talk',
  };
  return p;
}

/** Ein gut sichtbares Pizzastück: Boden, Tomate, Käse und ein Basilikumblatt. */
function buildSlice() {
  const g = new Group();
  const wedge = (r: number, h: number, color: number, y: number) => {
    const m = new Mesh(new CylinderGeometry(r, r, h, 12, 1, false, 0, 0.75), smooth(color));
    m.position.y = y;
    return m;
  };
  g.add(wedge(0.17, 0.02, 0xd49a52, 0), wedge(0.145, 0.006, 0xc23a22, 0.012), wedge(0.12, 0.006, 0xf6ead0, 0.016));
  const crust = new Mesh(new CylinderGeometry(0.17, 0.17, 0.035, 12, 1, true, 0, 0.75), smooth(0xc4813d, { side: DoubleSide }));
  crust.position.y = 0.008;
  const leaf = new Mesh(new SphereGeometry(0.02, 8, 6), smooth(0x2f6b2a));
  leaf.scale.set(1.4, 0.3, 0.8);
  leaf.position.set(0.07, 0.022, 0.06);
  g.add(crust, leaf);
  // Spitze zur Hand, flach in der Hand gehalten
  g.rotation.set(Math.PI / 2, 0, -0.37);
  g.position.z = 0.04;
  return g;
}

function buildGlass() {
  const g = new Group();
  const glass = new Mesh(new CylinderGeometry(0.035, 0.03, 0.12, 12), smooth(0xd98b3a, { transparent: true, opacity: 0.85 }));
  const foam = new Mesh(new CylinderGeometry(0.035, 0.035, 0.02, 12), smooth(0xfbf6ea));
  foam.position.y = 0.065;
  g.add(glass, foam);
  return g;
}

const ease = (x: number) => x * x * (3 - 2 * x);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Hüllkurve für eine Handlung, die ab und zu vorkommt (abbeissen, trinken, anstossen):
 * meistens 0, dann sanft auf 1, kurz halten und sanft zurück. `len` ist der Anteil eines Durchgangs.
 */
function now(s: number, rate: number, len: number) {
  const u = s * rate - Math.floor(s * rate);
  if (u > len) return 0;
  const x = u / len;
  return ease(Math.min(1, x / 0.3)) * (1 - ease(Math.max(0, (x - 0.65) / 0.35)));
}

/** Wie lange die letzte Handlung her ist, als Anteil eines Durchgangs (zum Kauen danach). */
function since(s: number, rate: number, len: number) {
  const u = s * rate - Math.floor(s * rate);
  return u > len ? u - len : 1;
}

/** Ruhige, natürliche Bewegungen: essen, trinken, plaudern – die Arme bleiben meistens unten. */
export function animatePerson(p: Person, t: number) {
  const { armL, armR, foreL, foreR, head, phase, action, sit } = p.userData;
  const pace = p.userData.pace ?? 1;
  const cheer = p.userData.cheer ?? 0;
  const s = t * 0.001 + phase;
  // 'none': Die Haltung wird von aussen gesetzt (Helfer mit Tablett, Andrin an der Schaufel), nur der Kopf bewegt sich.
  if (action === 'none') {
    head.rotation.y = Math.sin(s * 0.31 * pace) * 0.2;
    return;
  }

  let sipping = 0;

  // Kopf: langsam umherschauen, mit den Nachbarn reden
  let yaw = Math.sin(s * 0.31 * pace) * 0.3 + Math.sin(s * 0.83 + 1.3) * 0.06;
  let pitch = Math.sin(s * 0.57) * 0.04;

  // Grundhaltung: Arme locker, leicht vom Körper weg
  armL.rotation.set(0.02, 0, -0.07);
  armR.rotation.set(0.02, 0, 0.07);
  foreL.rotation.set(-0.15, 0, 0);
  foreR.rotation.set(-0.15, 0, 0);

  if (action === 'eat' || action === 'drink') {
    const eat = action === 'eat';
    // Stück bzw. Glas vor dem Körper, die andere Hand liegt auf dem Tisch oder hängt locker
    armR.rotation.x = sit ? -0.38 : -0.22;
    foreR.rotation.x = eat ? -1.0 : -1.3;
    if (sit) {
      armL.rotation.x = -0.32;
      foreL.rotation.x = -1.0;
    }
    // Ab und zu abbeissen oder einen Schluck nehmen – jede Person in ihrem eigenen Takt
    const rate = (eat ? 0.1 : 0.075) * pace;
    const len = eat ? 0.24 : 0.3;
    const lift = now(s, rate, len);
    if (!eat) sipping = lift;
    armR.rotation.x = mix(armR.rotation.x, -1.12, lift);
    armR.rotation.z = mix(armR.rotation.z, -0.32, lift);
    foreR.rotation.x = mix(foreR.rotation.x, eat ? -2.25 : -2.35, lift);
    yaw *= 1 - lift;
    // Beim Abbeissen leicht nach vorne, beim Trinken den Kopf etwas zurück
    pitch += eat ? lift * 0.14 : -lift * 0.2;
    if (eat) {
      // Danach kurz kauen
      const after = since(s, rate, len);
      if (after < 0.2) pitch += Math.sin(s * 11) * 0.025 * (1 - after / 0.2);
    }
  } else if (action === 'toast') {
    // Glas vor der Brust, ab und zu anstossen (nach vorne, nicht in die Luft)
    armR.rotation.x = -0.25;
    foreR.rotation.x = -1.3;
    const clink = now(s, 0.085 * pace, 0.22);
    armR.rotation.x = mix(armR.rotation.x, -0.95, clink);
    foreR.rotation.x = mix(foreR.rotation.x, -0.85, clink);
    yaw *= 1 - clink;
    // Und danach ein Schluck
    const sip = now(s + 4.5 / pace, 0.085 * pace, 0.2);
    sipping = sip;
    armR.rotation.x = mix(armR.rotation.x, -1.1, sip);
    armR.rotation.z = mix(armR.rotation.z, -0.3, sip);
    foreR.rotation.x = mix(foreR.rotation.x, -2.35, sip);
    pitch -= sip * 0.2;
  } else if (action === 'talk') {
    // Beim Erzählen bewegen sich vor allem die Unterarme, sanft und unregelmässig
    const g1 = Math.sin(s * 1.1) * Math.sin(s * 0.37 + 0.8);
    const g2 = Math.sin(s * 0.9 + 2) * Math.sin(s * 0.29);
    if (sit) {
      // Am Tisch: Unterarme liegen auf, eine Hand erzählt mit
      armR.rotation.x = -0.34 + g1 * 0.08;
      foreR.rotation.x = -1.0 + Math.max(0, g1) * 0.5;
      armL.rotation.x = -0.32;
      foreL.rotation.x = -1.0 + Math.max(0, g2) * 0.2;
      yaw *= 1.4;
    } else {
      armR.rotation.x = -0.12 + g1 * 0.1;
      foreR.rotation.x = -0.65 + g1 * 0.35;
      armL.rotation.x = -0.06 + g2 * 0.06;
      foreL.rotation.x = -0.35 + g2 * 0.25;
    }
  } else if (action === 'work') {
    // Teig ausziehen, Hände vor dem Körper über dem Tisch
    const k = Math.sin(s * 3.2);
    armL.rotation.set(-0.6, 0, -0.18 - k * 0.08);
    armR.rotation.set(-0.6, 0, 0.18 - k * 0.08);
    foreL.rotation.x = -0.75 + k * 0.12;
    foreR.rotation.x = -0.75 - k * 0.12;
    pitch += 0.25;
    yaw *= 0.3;
  }

  // Wenn die Pizza aus dem Ofen kommt: aufschauen und kurz nicken – keine hochgerissenen Arme
  if (cheer > 0) {
    yaw *= 1 - cheer;
    pitch = mix(pitch, -0.12 + Math.sin(s * 6) * 0.05, cheer);
  }
  const { glass } = p.userData;
  if (glass) {
    // Glas aufrecht halten (Arm- und Ellbogenwinkel ausgleichen), beim Trinken zum Mund kippen
    glass.rotation.x = -(armR.rotation.x + foreR.rotation.x) - sipping * 0.9;
    glass.rotation.z = -armR.rotation.z;
  }
  head.rotation.y = yaw;
  head.rotation.x = pitch;
}

export function buildTable(rand: () => number, kinds: PizzaKind[] = []) {
  const g = new Group();
  const wood = flat(GARDEN.wood);
  const top = new Mesh(new BoxGeometry(1.9, 0.06, 0.8), flat(GARDEN.cloth));
  top.position.y = 0.76;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  for (const [x, z] of [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]]) {
    const leg = new Mesh(new BoxGeometry(0.06, 0.74, 0.06), wood);
    leg.position.set(x, 0.37, z);
    g.add(leg);
  }
  for (const z of [-0.62, 0.62]) {
    const bench = new Mesh(new BoxGeometry(1.9, 0.05, 0.3), wood);
    bench.position.set(0, 0.45, z);
    bench.castShadow = true;
    g.add(bench);
  }
  if (kinds.length) {
    const board = flat(GARDEN.woodDark);
    kinds.forEach((kind, i) => {
      const x = -0.6 + i * 0.6;
      // Erhöhter Pizzaständer, damit die Pizza gut zu sehen ist
      const stem = new Mesh(new CylinderGeometry(0.025, 0.06, 0.16, 10), board);
      stem.position.set(x, 0.87, 0.05);
      const b = new Mesh(new CylinderGeometry(0.27, 0.27, 0.025, 24), board);
      b.position.set(x, 0.96, 0.05);
      // Ständer und Pizza leicht zum Weg geneigt, damit man den Belag sieht
      const pizza = buildVariantPizza(kind, rand);
      pizza.rotation.y = rand() * Math.PI;
      const tilt = new Group();
      tilt.position.set(x, 0.96, 0.05);
      tilt.rotation.x = 0.28;
      b.position.set(0, 0, 0);
      pizza.position.set(0, 0.015, 0);
      tilt.add(b, pizza);
      g.add(stem, tilt);
    });
    const glassMat = flat(0xd98b3a, { transparent: true, opacity: 0.8 });
    for (let i = 0; i < 4; i++) {
      const gl = new Mesh(new CylinderGeometry(0.035, 0.03, 0.12, 6), glassMat);
      gl.position.set(-0.75 + rand() * 1.5, 0.85, (rand() > 0.5 ? 1 : -1) * 0.28);
      g.add(gl);
    }
  }
  return g;
}

/** Schriftzug als Textur. Die Schrift wird nachgezeichnet, sobald sie geladen ist. */
function labelTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const paint = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
    tex.needsUpdate = true;
  };
  paint();
  document.fonts?.load('800 100px "Bricolage Grotesque Variable"').then(paint).catch(() => {});
  return tex;
}

const DISPLAY_FONT = '"Bricolage Grotesque Variable", "Arial Black", sans-serif';

/** Grosser Stand mit Markise, Schild «rondisach», Zutaten und Gasflasche. Der Ofen wird separat daraufgestellt. */
export function buildStand() {
  const g = new Group();
  const W = 3.6;
  const wood = flat(GARDEN.wood);
  const top = new Mesh(new BoxGeometry(W, 0.06, 0.95), flat(0xe9e1d5));
  top.position.y = 0.9;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  // Front mit Schriftzug
  const frontTex = labelTexture(1600, 360, (ctx) => {
    ctx.fillStyle = '#b83c2e';
    ctx.fillRect(0, 0, 1600, 360);
    ctx.fillStyle = '#f3eee4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 190px ${DISPLAY_FONT}`;
    ctx.fillText('rondisach', 800, 150);
    ctx.font = `700 54px ${DISPLAY_FONT}`;
    ctx.fillText('P I Z Z A   C A T E R I N G', 800, 290);
  });
  const front = new Mesh(new BoxGeometry(W, 0.84, 0.04), [
    flat(0xb83c2e), flat(0xb83c2e), flat(0xb83c2e), flat(0xb83c2e),
    new MeshStandardMaterial({ map: frontTex, roughness: 0.8 }),
    flat(0xb83c2e),
  ]);
  front.position.set(0, 0.46, 0.48);
  front.castShadow = true;
  g.add(front);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) {
    const leg = new Mesh(new BoxGeometry(0.06, 0.88, 0.85), wood);
    leg.position.set(x, 0.44, 0);
    g.add(leg);
  }

  // Markise auf vier Pfosten, rot-cremig gestreift, vorne tiefer als hinten
  const postMat = flat(GARDEN.woodDark);
  const frontH = 2.35;
  const backH = 2.65;
  for (const [x, z, h] of [[-W / 2, 0.75, frontH], [W / 2, 0.75, frontH], [-W / 2, -1.05, backH], [W / 2, -1.05, backH]]) {
    const post = new Mesh(new CylinderGeometry(0.045, 0.05, h, 8), postMat);
    post.position.set(x, h / 2, z);
    post.castShadow = true;
    g.add(post);
  }
  const stripes = 9;
  const depth = 1.95;
  const tilt = Math.atan2(backH - frontH, depth);
  for (let i = 0; i < stripes; i++) {
    const sw = (W + 0.3) / stripes;
    const stripe = new Mesh(new BoxGeometry(sw, 0.03, depth / Math.cos(tilt) + 0.1), flat(i % 2 ? 0xf3eee4 : 0xb83c2e));
    stripe.position.set(-W / 2 - 0.15 + sw * (i + 0.5), (frontH + backH) / 2 + 0.03, (0.75 - 1.05) / 2);
    stripe.rotation.x = -tilt;
    stripe.castShadow = true;
    g.add(stripe);
    // Bogenkante vorne
    const scallop = new Mesh(new CylinderGeometry(sw / 2, sw / 2, 0.02, 12, 1, false, 0, Math.PI), flat(i % 2 ? 0xf3eee4 : 0xb83c2e));
    scallop.rotation.set(Math.PI / 2, 0, Math.PI);
    scallop.position.set(stripe.position.x, frontH - 0.02, 0.82);
    g.add(scallop);
  }

  // Schild über der Markise
  const signTex = labelTexture(1400, 360, (ctx) => {
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.roundRect(0, 0, 1400, 360, 60);
    ctx.fill();
    ctx.fillStyle = '#f3eee4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 230px ${DISPLAY_FONT}`;
    ctx.fillText('rondisach', 700, 170);
  });
  // Massives Brett, deutlich über der höchsten Stelle der Markise, mit zwei Haltern
  const signY = backH + 0.5;
  const board = new Mesh(new BoxGeometry(2.5, 0.68, 0.07), flat(0x121212));
  board.position.set(0, signY, 0.2);
  board.castShadow = true;
  g.add(board);
  const sign = new Mesh(new PlaneGeometry(2.4, 0.62), new MeshStandardMaterial({ map: signTex, transparent: true, roughness: 0.6 }));
  sign.position.set(0, signY, 0.24);
  g.add(sign);
  for (const x of [-0.9, 0.9]) {
    const holder = new Mesh(new CylinderGeometry(0.025, 0.025, signY - 0.34 - (frontH + backH) / 2 + 0.15, 6), postMat);
    holder.position.set(x, ((frontH + backH) / 2 + signY - 0.34) / 2 + 0.05, 0.2);
    g.add(holder);
  }
  // Kleine Lampen unter der Markise
  for (let i = 0; i < 5; i++) {
    const bulb = new Mesh(new SphereGeometry(0.05, 10, 8), new MeshStandardMaterial({ color: GARDEN.bulb, emissive: GARDEN.bulb, emissiveIntensity: 2.5 }));
    bulb.position.set(-1.4 + i * 0.7, frontH - 0.18, 0.7);
    g.add(bulb);
  }

  // Teigkugeln und Schüsseln
  const dough = flat(0xf0dfbf);
  for (let i = 0; i < 9; i++) {
    const d = new Mesh(new IcosahedronGeometry(0.07, 1), dough);
    d.scale.y = 0.7;
    d.position.set(-1.6 + (i % 3) * 0.17, 0.97, -0.3 + Math.floor(i / 3) * 0.17);
    g.add(d);
  }
  const bowlColors = [0xb8321f, 0xfbf6ea, 0x2f6b2a, 0xd9a441, 0xc76a8a];
  bowlColors.forEach((c, i) => {
    const bowl = new Mesh(new CylinderGeometry(0.1, 0.07, 0.07, 10), flat(0xf3eee4));
    bowl.position.set(-0.95 + i * 0.24, 0.965, -0.3);
    const fill = new Mesh(new CylinderGeometry(0.085, 0.085, 0.01, 10), flat(c));
    fill.position.set(bowl.position.x, 1.0, bowl.position.z);
    g.add(bowl, fill);
  });
  // Teig, der gerade ausgezogen wird
  const base = new Mesh(new CylinderGeometry(0.17, 0.17, 0.015, 16), dough);
  base.position.set(-0.55, 0.94, 0.05);
  g.add(base);
  // Stapel Pizzakartons
  for (let i = 0; i < 4; i++) {
    const box = new Mesh(new BoxGeometry(0.4, 0.05, 0.4), flat(0xe8d6b5));
    box.position.set(1.5, 0.955 + i * 0.052, 0.18);
    box.rotation.y = (i % 2) * 0.08;
    g.add(box);
  }
  // Gasflasche unter dem Tisch
  const gas = new Mesh(new CylinderGeometry(0.15, 0.15, 0.55, 10), flat(0xd9d9d9, { metalness: 0.3 }));
  gas.position.set(0.9, 0.28, -0.1);
  g.add(gas);
  return g;
}

/** Wimpelkette in den Markenfarben zwischen den Masten. */
export function buildBunting(poles: Vector3[], perSpan = 14) {
  const colors = [0xb83c2e, 0xf3eee4, 0x121212, 0xd9a441];
  const tri = new BufferGeometry().setFromPoints([new Vector3(-0.11, 0, 0), new Vector3(0.11, 0, 0), new Vector3(0, -0.24, 0)]);
  tri.computeVertexNormals();
  const total = (poles.length - 1) * perSpan;
  const flags = new InstancedMesh(tri, new MeshStandardMaterial({ side: DoubleSide, roughness: 0.8 }), total);
  const m = new Matrix4();
  const up = new Vector3(0, 1, 0);
  const tangent = new Vector3();
  const normal = new Vector3();
  const color = new Color();
  let n = 0;
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i].clone().setY(poles[i].y - 0.25);
    const b = poles[i + 1].clone().setY(poles[i + 1].y - 0.25);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 0.55;
    const curve = new QuadraticBezierCurve3(a, mid, b);
    for (let k = 0; k < perSpan; k++) {
      const t = (k + 0.5) / perSpan;
      const p = curve.getPoint(t);
      curve.getTangent(t, tangent);
      normal.crossVectors(tangent, up).normalize();
      m.makeBasis(tangent, up, normal).setPosition(p);
      flags.setMatrixAt(n, m);
      flags.setColorAt(n, color.set(colors[n % colors.length]));
      n++;
    }
  }
  const g = new Group();
  g.add(flags);
  return g;
}

/** Goldene Lichtpunkte, die langsam durch die Abendluft schweben. */
export function buildFireflies(count: number, rand: () => number) {
  const geo = new BufferGeometry();
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (rand() - 0.5) * 14;
    base[i * 3 + 1] = 0.4 + rand() * 2.6;
    base[i * 3 + 2] = 14 - rand() * 26;
  }
  geo.setAttribute('position', new Float32BufferAttribute(base.slice(), 3));
  const points = new Points(
    geo,
    new PointsMaterial({ color: 0xffd58a, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending }),
  );
  const update = (t: number) => {
    const pos = geo.attributes.position as Float32BufferAttribute;
    for (let i = 0; i < count; i++) {
      const s = t * 0.0004 + i;
      pos.setXYZ(i, base[i * 3] + Math.sin(s * 1.3) * 0.4, base[i * 3 + 1] + Math.sin(s * 2.1) * 0.25, base[i * 3 + 2] + Math.cos(s) * 0.4);
    }
    pos.needsUpdate = true;
  };
  return { points, update };
}
