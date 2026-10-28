// Alles, was einen echten Garten ausmacht: Haus mit Terrasse, Zaun, Apfelbaum mit Schaukel,
// Hochbeet, Blumenbeete, Gartenhaus, Trampolin, Schubkarre und Grasbüschel.
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

type MatOptions = Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]>;
const flat = (color: number, extra: MatOptions = {}) =>
  new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });

const C = {
  plaster: 0xefe8dc,
  roof: 0x6b4f43,
  shutter: 0x3f5f3a,
  frame: 0xf8f4ec,
  glass: 0x2b3440,
  warmWindow: 0xffc27a,
  deck: 0xa67a52,
  wood: 0x9a6b45,
  woodDark: 0x6e4a30,
  fence: 0xd8cbb4,
  soil: 0x5a3d2b,
  leaf: [0x4f7a34, 0x5d8a3a, 0x6f9a44, 0x46703a],
  flowers: [0xd9536a, 0xf3eee4, 0xe58aa0, 0xd9a441, 0x8a6ac0, 0xb83c2e, 0xf2c14e],
  terracotta: 0xb8643e,
};

function gableRoof(width: number, depth: number, height: number, color: number) {
  const s = new Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const roof = new Mesh(geo, flat(color));
  roof.castShadow = true;
  return roof;
}

function windowPane(w: number, h: number, lit: boolean, shutters: boolean) {
  const g = new Group();
  const frame = new Mesh(new BoxGeometry(w + 0.12, h + 0.12, 0.06), flat(C.frame));
  const glass = new Mesh(
    new BoxGeometry(w, h, 0.07),
    lit
      ? new MeshStandardMaterial({ color: C.warmWindow, emissive: C.warmWindow, emissiveIntensity: 0.9 })
      : flat(C.glass, { roughness: 0.3 }),
  );
  const cross = new Mesh(new BoxGeometry(0.04, h, 0.08), flat(C.frame));
  g.add(frame, glass, cross);
  if (shutters) {
    for (const side of [-1, 1]) {
      const sh = new Mesh(new BoxGeometry(w / 2 + 0.05, h + 0.1, 0.05), flat(C.shutter));
      sh.position.set(side * (w / 2 + w / 4 + 0.12), 0, 0.02);
      g.add(sh);
    }
  }
  return g;
}

/** Einfamilienhaus mit Satteldach, Fensterläden und Terrasse. Die Längsseite zeigt in +x Richtung. */
export function buildHouse(rand: () => number, { length = 10, depth = 7, floors = 2, terrace = true } = {}) {
  const g = new Group();
  const wallH = floors * 2.8;
  const body = new Mesh(new BoxGeometry(depth, wallH, length), flat(C.plaster));
  body.position.y = wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = gableRoof(depth + 1.2, length + 1.0, 2.6, C.roof);
  roof.position.y = wallH;
  g.add(roof);
  const chimney = new Mesh(new BoxGeometry(0.6, 1.6, 0.6), flat(0x8c7b6e));
  chimney.position.set(-1, wallH + 1.9, length * 0.25);
  g.add(chimney);

  // Fenster auf der Gartenseite (+x)
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 4; i++) {
      const z = -length / 2 + 1.4 + i * ((length - 2.8) / 3);
      const isDoor = f === 0 && (i === 1 || i === 2);
      const w = windowPane(isDoor ? 1.5 : 1.0, isDoor ? 2.1 : 1.2, rand() > 0.35, !isDoor);
      w.rotation.y = Math.PI / 2;
      w.position.set(depth / 2 + 0.03, f * 2.8 + (isDoor ? 1.1 : 1.6), z);
      g.add(w);
    }
  }

  if (terrace) {
    // Holzterrasse mit Sonnenschirm, Liegestuhl und Pflanzentöpfen
    const deckW = 3;
    const deck = new Group();
    for (let i = 0; i < 12; i++) {
      const plank = new Mesh(new BoxGeometry(deckW, 0.06, length * 0.75 / 12 - 0.02), flat(i % 2 ? C.deck : 0x9c7049));
      plank.position.set(depth / 2 + deckW / 2, 0.22, -length * 0.375 + (i + 0.5) * (length * 0.75 / 12));
      plank.receiveShadow = true;
      deck.add(plank);
    }
    const base = new Mesh(new BoxGeometry(deckW, 0.2, length * 0.75), flat(C.woodDark));
    base.position.set(depth / 2 + deckW / 2, 0.1, 0);
    deck.add(base);
    g.add(deck);

    const pole = new Mesh(new CylinderGeometry(0.03, 0.03, 2.4, 6), flat(0xdddddd));
    pole.position.set(depth / 2 + 1.6, 1.4, -1.5);
    const shade = new Mesh(new ConeGeometry(1.5, 0.5, 8, 1, true), flat(0xf3eee4, { side: DoubleSide }));
    shade.position.set(depth / 2 + 1.6, 2.5, -1.5);
    shade.castShadow = true;
    g.add(pole, shade);

    const lounger = new Group();
    const seat = new Mesh(new BoxGeometry(0.6, 0.08, 1.7), flat(0xf3eee4));
    seat.position.y = 0.45;
    const back = new Mesh(new BoxGeometry(0.6, 0.08, 0.7), flat(0xf3eee4));
    back.position.set(0, 0.7, -0.75);
    back.rotation.x = 0.9;
    lounger.add(seat, back);
    lounger.position.set(depth / 2 + 1.5, 0.2, 1.6);
    g.add(lounger);

    for (const z of [-length * 0.36, length * 0.36, 0.5]) {
      g.add(potPlant(rand, depth / 2 + 2.7, 0.25, z));
    }
  }
  return g;
}

export function potPlant(rand: () => number, x: number, y: number, z: number) {
  const g = new Group();
  const pot = new Mesh(new CylinderGeometry(0.22, 0.16, 0.38, 10), flat(C.terracotta));
  pot.position.y = 0.19;
  const plant = new Mesh(new IcosahedronGeometry(0.32 + rand() * 0.12, 0), flat(C.leaf[Math.floor(rand() * 4)]));
  plant.position.y = 0.6;
  plant.castShadow = true;
  g.add(pot, plant);
  g.position.set(x, y, z);
  return g;
}

/** Holzlattenzaun entlang einer Linie von a nach b. */
export function buildFence(points: Vector3[]) {
  const pickets: Matrix4[] = [];
  const rails = new Group();
  const railMat = flat(C.fence);
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    const angle = Math.atan2(dir.x, dir.z);
    q.setFromAxisAngle(up, angle);
    for (const h of [0.35, 0.85]) {
      const rail = new Mesh(new BoxGeometry(0.04, 0.07, len), railMat);
      rail.position.copy(a).add(b).multiplyScalar(0.5).setY(h);
      rail.quaternion.copy(q);
      rails.add(rail);
    }
    const n = Math.floor(len / 0.2);
    for (let k = 0; k <= n; k++) {
      const p = a.clone().lerp(b, k / n);
      const m = new Matrix4().compose(p.setY(0.55), q, new Vector3(1, 1, 1));
      pickets.push(m);
    }
  }
  const picketGeo = new BoxGeometry(0.03, 1.1, 0.1);
  const inst = new InstancedMesh(picketGeo, railMat, pickets.length);
  pickets.forEach((m, i) => inst.setMatrixAt(i, m));
  inst.castShadow = true;
  const g = new Group();
  g.add(inst, rails);
  return g;
}

/** Thuja-Hecke als Grundstücksgrenze. */
export function buildHedgeRow(a: Vector3, b: Vector3, rand: () => number, height = 1.8) {
  const g = new Group();
  const len = a.distanceTo(b);
  const n = Math.ceil(len / 0.9);
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, (i + 0.5) / n);
    const h = height * (0.85 + rand() * 0.3);
    const c = new Mesh(new ConeGeometry(0.55, h, 7), flat(C.leaf[3]));
    c.position.set(p.x + (rand() - 0.5) * 0.15, h / 2, p.z + (rand() - 0.5) * 0.15);
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

/** Gartenhaus aus Holz. */
export function buildShed() {
  const g = new Group();
  const walls = new Mesh(new BoxGeometry(2.2, 2.0, 1.8), flat(0x8a5a3a));
  walls.position.y = 1;
  walls.castShadow = true;
  g.add(walls);
  // Senkrechte Bretterfugen
  for (let i = 0; i < 8; i++) {
    const line = new Mesh(new BoxGeometry(0.02, 1.9, 0.01), flat(0x5e3b25));
    line.position.set(-0.95 + i * 0.27, 1, 0.905);
    g.add(line);
  }
  const roof = gableRoof(2.6, 2.2, 0.8, 0x4a3a32);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 2.0;
  g.add(roof);
  const door = new Mesh(new BoxGeometry(0.8, 1.6, 0.05), flat(0x6e4a30));
  door.position.set(-0.4, 0.8, 0.92);
  g.add(door);
  const win = windowPane(0.5, 0.45, false, false);
  win.position.set(0.55, 1.3, 0.92);
  g.add(win);
  return g;
}

/** Trampolin mit Sicherheitsnetz. */
export function buildTrampoline() {
  const g = new Group();
  const R = 1.8;
  const H = 0.9;
  const steel = flat(0x9aa1a8, { metalness: 0.4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new Mesh(new CylinderGeometry(0.03, 0.03, H, 6), steel);
    leg.position.set(Math.cos(a) * R, H / 2, Math.sin(a) * R);
    g.add(leg);
    const netPole = new Mesh(new CylinderGeometry(0.025, 0.025, 1.7, 6), flat(0x2c2925));
    netPole.position.set(Math.cos(a) * R, H + 0.85, Math.sin(a) * R);
    g.add(netPole);
  }
  const mat = new Mesh(new CylinderGeometry(R - 0.15, R - 0.15, 0.02, 32), flat(0x1a1a1a));
  mat.position.y = H;
  const pad = new Mesh(new TorusGeometry(R - 0.05, 0.09, 6, 32), flat(0x3e6fa8));
  pad.rotation.x = Math.PI / 2;
  pad.position.y = H + 0.03;
  const net = new Mesh(
    new CylinderGeometry(R, R, 1.6, 32, 1, true),
    new MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }),
  );
  net.position.y = H + 0.85;
  g.add(mat, pad, net);
  return { group: g, mat: H, radius: R };
}

/** Alter Apfelbaum mit Schaukel. Gibt die Schaukel zurück, damit sie sich bewegen kann. */
export function buildSwingTree(rand: () => number) {
  const g = new Group();
  const bark = flat(0x5e4230);
  const trunk = new Mesh(new CylinderGeometry(0.22, 0.34, 2.6, 8), bark);
  trunk.position.y = 1.3;
  trunk.castShadow = true;
  g.add(trunk);
  const branch = new Mesh(new CylinderGeometry(0.09, 0.14, 2.2, 7), bark);
  branch.rotation.z = Math.PI / 2 - 0.15;
  branch.position.set(1.0, 2.45, 0);
  branch.castShadow = true;
  g.add(branch);
  for (let i = 0; i < 6; i++) {
    const c = new Mesh(new IcosahedronGeometry(1.0 + rand() * 0.5, 1), flat(C.leaf[i % 4]));
    c.position.set((rand() - 0.3) * 2.4, 3.1 + rand() * 1.0, (rand() - 0.5) * 2.0);
    c.castShadow = true;
    g.add(c);
    for (let k = 0; k < 4; k++) {
      const apple = new Mesh(new SphereGeometry(0.06, 8, 6), flat(0xc2362a));
      const dir = new Vector3(rand() - 0.5, rand() - 0.7, rand() - 0.5).normalize();
      apple.position.copy(c.position).addScaledVector(dir, 1.0);
      g.add(apple);
    }
  }
  // Schaukel: dreht sich um den Ast
  const swing = new Object3D();
  swing.position.set(1.4, 2.4, 0);
  const ropeMat = flat(0xd9c7a0);
  for (const z of [-0.25, 0.25]) {
    const rope = new Mesh(new CylinderGeometry(0.012, 0.012, 1.85, 4), ropeMat);
    rope.position.set(0, -0.93, z);
    swing.add(rope);
  }
  const seat = new Mesh(new BoxGeometry(0.25, 0.04, 0.6), flat(C.wood));
  seat.position.y = -1.86;
  swing.add(seat);
  g.add(swing);
  return { group: g, swing };
}

/** Hochbeet aus Holz mit Salat, Tomaten und Kräutern. */
export function buildRaisedBed(rand: () => number) {
  const g = new Group();
  const box = new Mesh(new BoxGeometry(2.2, 0.6, 0.9), flat(C.wood));
  box.position.y = 0.3;
  box.castShadow = true;
  const soil = new Mesh(new BoxGeometry(2.1, 0.02, 0.8), flat(C.soil));
  soil.position.y = 0.6;
  g.add(box, soil);
  for (let i = 0; i < 6; i++) {
    const lettuce = new Mesh(new IcosahedronGeometry(0.13, 1), flat(0x8fbf4f));
    lettuce.scale.y = 0.6;
    lettuce.position.set(-0.85 + i * 0.3, 0.66, -0.2);
    g.add(lettuce);
  }
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + i * 0.6;
    const stake = new Mesh(new CylinderGeometry(0.012, 0.012, 1.0, 4), flat(0xc8b48a));
    stake.position.set(x, 1.1, 0.2);
    const bush = new Mesh(new IcosahedronGeometry(0.22, 0), flat(C.leaf[1]));
    bush.position.set(x, 1.0, 0.2);
    bush.scale.y = 1.4;
    g.add(stake, bush);
    for (let k = 0; k < 3; k++) {
      const tomato = new Mesh(new SphereGeometry(0.04, 8, 6), flat(0xd8381f));
      tomato.position.set(x + (rand() - 0.5) * 0.3, 0.8 + rand() * 0.4, 0.2 + (rand() - 0.5) * 0.25);
      g.add(tomato);
    }
  }
  return g;
}

/** Blumenbeet als Streifen entlang von a nach b. */
export function buildFlowerBed(a: Vector3, b: Vector3, rand: () => number, width = 0.9) {
  const g = new Group();
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const angle = Math.atan2(b.x - a.x, b.z - a.z);
  const bed = new Mesh(new BoxGeometry(width, 0.05, len), flat(C.soil));
  bed.position.set(mid.x, 0.025, mid.z);
  bed.rotation.y = angle;
  bed.receiveShadow = true;
  g.add(bed);
  const n = Math.floor(len * 4);
  const side = new Vector3(Math.cos(angle), 0, -Math.sin(angle));
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, rand()).addScaledVector(side, (rand() - 0.5) * width * 0.8);
    const h = 0.25 + rand() * 0.45;
    const leaves = new Mesh(new IcosahedronGeometry(0.12 + rand() * 0.08, 0), flat(C.leaf[Math.floor(rand() * 4)]));
    leaves.position.set(p.x, 0.12, p.z);
    leaves.scale.y = 0.8;
    g.add(leaves);
    const bloom = new Mesh(new IcosahedronGeometry(0.06 + rand() * 0.04, 0), flat(C.flowers[Math.floor(rand() * C.flowers.length)]));
    bloom.position.set(p.x + (rand() - 0.5) * 0.08, h, p.z + (rand() - 0.5) * 0.08);
    g.add(bloom);
  }
  return g;
}

export function buildWheelbarrow() {
  const g = new Group();
  const tray = new Mesh(new BoxGeometry(0.6, 0.3, 0.9), flat(0x3e6f4f));
  tray.position.set(0, 0.55, 0);
  tray.rotation.x = -0.1;
  tray.castShadow = true;
  const dirt = new Mesh(new DodecahedronGeometry(0.25, 0), flat(C.soil));
  dirt.scale.set(1, 0.4, 1.4);
  dirt.position.set(0, 0.72, 0);
  const wheel = new Mesh(new TorusGeometry(0.18, 0.05, 6, 16), flat(0x1a1a1a));
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(0, 0.2, 0.6);
  g.add(tray, dirt, wheel);
  for (const x of [-0.25, 0.25]) {
    const handle = new Mesh(new CylinderGeometry(0.02, 0.02, 1.3, 5), flat(C.woodDark));
    handle.rotation.x = Math.PI / 2 - 0.25;
    handle.position.set(x, 0.55, -0.4);
    const leg = new Mesh(new CylinderGeometry(0.02, 0.02, 0.45, 5), flat(0x555555));
    leg.position.set(x, 0.22, -0.25);
    g.add(handle, leg);
  }
  return g;
}

/** Grasbüschel, damit der Rasen nicht wie eine Fläche aus Plastik wirkt. */
export function buildGrassTufts(count: number, rand: () => number, inside: (x: number, z: number) => boolean) {
  const geo = new ConeGeometry(0.05, 0.11, 4);
  geo.translate(0, 0.055, 0);
  const inst = new InstancedMesh(geo, flat(0xffffff), count);
  const m = new Matrix4();
  const q = new Quaternion();
  const s = new Vector3();
  const p = new Vector3();
  const colors = [0x7c9a45, 0x86a64a, 0x739140, 0x8aa84e];
  const col = new Color();
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < count * 10) {
    const x = (rand() - 0.5) * 18;
    const z = 18 - rand() * 31;
    if (!inside(x, z)) continue;
    q.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI);
    const k = 0.7 + rand() * 0.9;
    m.compose(p.set(x, 0, z), q, s.set(k, k, k));
    inst.setMatrixAt(n, m);
    inst.setColorAt(n, col.set(colors[Math.floor(rand() * colors.length)]));
    n++;
  }
  inst.count = n;
  return inst;
}
