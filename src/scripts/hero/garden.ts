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
  CapsuleGeometry,
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
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  QuadraticBezierCurve3,
  BufferGeometry,
  ShaderMaterial,
  SphereGeometry,
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
  pants: [0x2c2925, 0x4a5568, 0x6b5a48, 0x3d4b5c],
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
    armL: Object3D;
    armR: Object3D;
    head: Object3D;
    phase: number;
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

/** Gesichtslose Figur mit weichen Formen, ca. 1.75 m gross. */
export function buildPerson({ rand, pose = 'stand', apron = false, hold = null, shirt }: PersonOptions): Person {
  const p = new Group() as Person;
  const pick = (list: number[]) => list[Math.floor(rand() * list.length)];
  const skin = smooth(pick(GARDEN.skin));
  const shirtMat = smooth(shirt ?? pick(GARDEN.shirts));
  const pantsMat = smooth(pick(GARDEN.pants));
  const hairMat = smooth(pick(GARDEN.hair), { roughness: 0.6 });
  const shoeMat = smooth(0x2a2522);
  const sit = pose === 'sit';
  const hip = sit ? 0.47 : 0.88;

  // Beine mit Schuhen
  for (const side of [-1, 1]) {
    if (sit) {
      const thigh = new Mesh(new CapsuleGeometry(0.07, 0.34, 4, 10), pantsMat);
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(side * 0.1, hip, 0.2);
      const shin = new Mesh(new CapsuleGeometry(0.06, 0.34, 4, 10), pantsMat);
      shin.position.set(side * 0.1, 0.25, 0.42);
      const shoe = new Mesh(new CapsuleGeometry(0.05, 0.1, 4, 8), shoeMat);
      shoe.rotation.x = Math.PI / 2;
      shoe.position.set(side * 0.1, 0.04, 0.47);
      p.add(thigh, shin, shoe);
    } else {
      const leg = new Mesh(new CapsuleGeometry(0.07, 0.7, 4, 10), pantsMat);
      leg.position.set(side * 0.1, 0.45, 0);
      leg.castShadow = true;
      const shoe = new Mesh(new CapsuleGeometry(0.05, 0.1, 4, 8), shoeMat);
      shoe.rotation.x = Math.PI / 2;
      shoe.position.set(side * 0.1, 0.04, 0.05);
      p.add(leg, shoe);
    }
  }

  // Oberkörper mit runden Schultern
  const torso = new Mesh(new CapsuleGeometry(0.18, 0.3, 6, 16), shirtMat);
  torso.scale.set(1, 1, 0.72);
  torso.position.y = hip + 0.34;
  torso.castShadow = true;
  p.add(torso);
  if (apron) {
    const a = new Mesh(new BoxGeometry(0.3, 0.72, 0.02), smooth(GARDEN.apron));
    a.position.set(0, hip + 0.2, 0.14);
    const strap = new Mesh(new TorusGeometry(0.09, 0.012, 6, 16, Math.PI), smooth(GARDEN.apron));
    strap.position.set(0, hip + 0.56, 0.12);
    p.add(a, strap);
  }

  // Hals, Kopf und Haare
  const neck = new Mesh(new CylinderGeometry(0.05, 0.06, 0.1, 10), skin);
  neck.position.y = hip + 0.68;
  p.add(neck);
  const head = new Group();
  head.position.y = hip + 0.83;
  const skull = new Mesh(new SphereGeometry(0.115, 20, 14), skin);
  skull.scale.set(0.92, 1.08, 1);
  skull.castShadow = true;
  const hair = new Mesh(new SphereGeometry(0.122, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.scale.set(0.95, 1.1, 1.04);
  hair.position.set(0, 0.012, -0.012);
  head.add(skull, hair);
  if (rand() > 0.6) {
    // Manche haben einen Dutt oder Pferdeschwanz
    const bun = new Mesh(new SphereGeometry(0.05, 12, 10), hairMat);
    bun.position.set(0, 0.06, -0.12);
    head.add(bun);
  }
  p.add(head);

  // Arme mit Drehpunkt an der Schulter
  const armGeo = new CapsuleGeometry(0.045, 0.46, 4, 10);
  armGeo.translate(0, -0.27, 0);
  const arms = [-1, 1].map((side) => {
    const pivot = new Object3D();
    pivot.position.set(side * 0.22, hip + 0.56, 0);
    const arm = new Mesh(armGeo, shirtMat);
    arm.castShadow = true;
    const hand = new Mesh(new SphereGeometry(0.045, 12, 10), skin);
    hand.position.y = -0.56;
    pivot.add(arm, hand);
    p.add(pivot);
    return pivot;
  });

  if (hold) {
    const item = hold === 'slice' ? buildSlice() : buildGlass();
    item.position.set(0, -0.6, 0.06);
    arms[1].add(item);
  }

  p.userData = {
    armL: arms[0],
    armR: arms[1],
    head,
    phase: rand() * Math.PI * 2,
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

/** Kleine Bewegungen, damit die Gäste lebendig wirken. */
export function animatePerson(p: Person, t: number) {
  const { armL, armR, head, phase, action } = p.userData;
  const cheer = p.userData.cheer ?? 0;
  const s = t * 0.001 + phase;
  head.rotation.y = Math.sin(s * 0.7) * 0.35 * (1 - cheer);
  head.rotation.x = Math.sin(s * 1.3) * 0.05 - cheer * 0.15;
  if (action === 'eat' || action === 'drink') {
    // Ab und zu zum Mund führen
    const lift = Math.pow(Math.max(0, Math.sin(s * 0.9)), 3);
    armR.rotation.x = -0.9 - lift * 1.5;
    armR.rotation.z = lift * 0.25;
    armL.rotation.x = Math.sin(s) * 0.05;
  } else if (action === 'toast') {
    // Gläser heben und anstossen
    const up = Math.pow(Math.max(0, Math.sin(s * 0.8)), 2);
    armR.rotation.x = -0.7 - up * 1.6;
    armL.rotation.x = Math.sin(s * 1.3) * 0.1;
  } else if (action === 'talk') {
    armR.rotation.x = -0.4 + Math.sin(s * 2.1) * 0.35;
    armL.rotation.x = -0.2 + Math.sin(s * 1.7 + 1) * 0.2;
  } else if (action === 'work') {
    // Teig ausziehen
    armL.rotation.x = -1.05 + Math.sin(s * 4) * 0.12;
    armR.rotation.x = -1.05 + Math.sin(s * 4 + Math.PI) * 0.12;
    armL.rotation.z = -0.25 + Math.sin(s * 4) * 0.1;
    armR.rotation.z = 0.25 - Math.sin(s * 4) * 0.1;
  }
  if (cheer > 0 && action !== 'work' && action !== 'none') {
    // Arme in die Luft
    const wave = Math.sin(s * 9) * 0.15;
    armL.rotation.x += (-2.8 + wave - armL.rotation.x) * cheer;
    armR.rotation.x += (-2.8 - wave - armR.rotation.x) * cheer;
    armL.rotation.z += (-0.35 - armL.rotation.z) * cheer;
    armR.rotation.z += (0.35 - armR.rotation.z) * cheer;
  }
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
