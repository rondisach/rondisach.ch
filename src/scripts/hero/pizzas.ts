// Die rondisach-Pizzen als 3D-Modelle – gleiche Sorten und Beläge wie auf der Website.
import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

export const PIZZA_KINDS = ['mortadella', 'crudo', 'margherita', 'salsiccia', 'vegi', 'marinara', 'salami'] as const;
export type PizzaKind = (typeof PIZZA_KINDS)[number];

const mat = (color: number, roughness = 0.7) => new MeshStandardMaterial({ color, roughness });

const COL = {
  dough: 0xd9a35a,
  crust: 0xc4813d,
  char: 0x2b1a10,
  tomato: 0xb8321f,
  cream: 0xf3e6c8,
  fiordilatte: 0xfbf3df,
  basil: 0x2f6b2a,
  mortadella: 0xe8a3a0,
  pistachio: 0x8fae3a,
  crudo: 0xd9827a,
  rucola: 0x4f8a2e,
  parmesan: 0xf2e2a8,
  cherry: 0xd8381f,
  salsiccia: 0x8a4a2c,
  onion: 0x8a3a6a,
  ricotta: 0xfdf8ee,
  aubergine: 0x4a2a4a,
  zucchini: 0x6f9a44,
  garlic: 0xf3ead2,
  oregano: 0x4e6b2a,
  salami: 0xa8322c,
};

/** Punkt auf der Pizza in Polarkoordinaten, gleichmässig verteilt (Goldener Winkel). */
function spot(i: number, n: number, maxR: number, jitter: () => number) {
  const r = Math.sqrt((i + 0.5) / n) * maxR;
  const a = i * 2.39996 + jitter() * 0.4;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
}

/** Fertig gebackene Pizza einer bestimmten Sorte, ca. 30 cm Durchmesser. */
export function buildVariantPizza(kind: PizzaKind, rand: () => number) {
  const g = new Group();
  const R = 0.21;
  const top = 0.018;

  const base = new Mesh(new CylinderGeometry(R, R, 0.016, 40), mat(COL.dough, 0.85));
  base.position.y = 0.008;
  base.castShadow = true;
  const rim = new Mesh(new TorusGeometry(R - 0.008, 0.03, 12, 48), mat(COL.crust, 0.8));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  rim.scale.set(1, 1, 0.85);
  g.add(base, rim);
  // Leopardenflecken auf dem Rand
  const charMat = mat(COL.char, 0.9);
  const charGeo = new SphereGeometry(0.014, 6, 4);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
    const c = new Mesh(charGeo, charMat);
    c.position.set(Math.cos(a) * (R - 0.008), 0.043, Math.sin(a) * (R - 0.008));
    c.scale.set(1, 0.35, 1);
    g.add(c);
  }

  const sauce = new Mesh(new CircleGeometry(R - 0.03, 40), mat(kind === 'mortadella' ? COL.cream : COL.tomato, 0.5));
  sauce.rotation.x = -Math.PI / 2;
  sauce.position.y = top;
  g.add(sauce);

  const add = (m: Mesh, x: number, z: number, y = top + 0.004) => {
    m.position.set(x, y, z);
    m.rotation.y = rand() * Math.PI * 2;
    g.add(m);
    return m;
  };
  const blobs = (n: number, color: number, size: number, maxR = R - 0.05, flatY = 0.25) => {
    const geo = new SphereGeometry(size, 12, 8);
    const m = mat(color, 0.5);
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(i, n, maxR, rand);
      const b = add(new Mesh(geo, m), x, z);
      b.scale.set(1 + rand() * 0.4, flatY, 1 + rand() * 0.4);
    }
  };
  const discs = (n: number, color: number, r: number, maxR = R - 0.05, h = 0.004) => {
    const geo = new CylinderGeometry(r, r, h, 16);
    const m = mat(color, 0.6);
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(i, n, maxR, rand);
      add(new Mesh(geo, m), x, z, top + 0.006 + rand() * 0.003);
    }
  };
  const leaves = (n: number, color: number, size: number, maxR = R - 0.06) => {
    const geo = new SphereGeometry(size, 8, 6);
    const m = mat(color, 0.6);
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(i, n, maxR, rand);
      const l = add(new Mesh(geo, m), x, z, top + 0.012);
      l.scale.set(1.6, 0.18, 0.7);
    }
  };
  const crumbs = (n: number, color: number, size: number) => {
    const geo = new IcosahedronGeometry(size, 0);
    const m = new MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(i, n, R - 0.04, rand);
      add(new Mesh(geo, m), x, z, top + 0.014);
    }
  };
  // Gefaltete Schinken- oder Mortadellascheiben
  const folds = (n: number, color: number, size: number) => {
    const geo = new TorusGeometry(size, size * 0.45, 6, 12);
    const m = mat(color, 0.55);
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(i, n, R - 0.06, rand);
      const f = add(new Mesh(geo, m), x, z, top + 0.01);
      f.rotation.x = Math.PI / 2;
      f.scale.set(1.2, 1, 0.45);
    }
  };

  switch (kind) {
    case 'mortadella':
      blobs(6, COL.fiordilatte, 0.03);
      folds(6, COL.mortadella, 0.035);
      {
        const burrata = add(new Mesh(new SphereGeometry(0.045, 16, 12), mat(0xfffdf5, 0.35)), 0, 0, top + 0.02);
        burrata.scale.y = 0.7;
      }
      crumbs(22, COL.pistachio, 0.008);
      break;
    case 'crudo':
      blobs(6, COL.fiordilatte, 0.028);
      folds(6, COL.crudo, 0.038);
      leaves(10, COL.rucola, 0.022);
      discs(5, COL.cherry, 0.014, R - 0.07, 0.012);
      crumbs(10, COL.parmesan, 0.012);
      break;
    case 'margherita':
      blobs(7, COL.fiordilatte, 0.034);
      leaves(5, COL.basil, 0.026);
      break;
    case 'salsiccia':
      blobs(5, COL.fiordilatte, 0.028);
      crumbs(16, COL.salsiccia, 0.016);
      {
        const ringGeo = new TorusGeometry(0.018, 0.004, 4, 12);
        const ringMat = mat(COL.onion, 0.6);
        for (let i = 0; i < 7; i++) {
          const [x, z] = spot(i, 7, R - 0.06, rand);
          const r = add(new Mesh(ringGeo, ringMat), x, z, top + 0.01);
          r.rotation.x = Math.PI / 2;
        }
      }
      blobs(5, COL.ricotta, 0.02, R - 0.07, 0.5);
      break;
    case 'vegi':
      blobs(5, COL.fiordilatte, 0.028);
      discs(7, COL.aubergine, 0.026, R - 0.05);
      discs(7, COL.zucchini, 0.02, R - 0.06);
      discs(5, COL.cherry, 0.013, R - 0.07, 0.012);
      break;
    case 'marinara':
      crumbs(14, COL.garlic, 0.008);
      crumbs(40, COL.oregano, 0.004);
      break;
    case 'salami':
      blobs(6, COL.fiordilatte, 0.03);
      discs(9, COL.salami, 0.027, R - 0.05, 0.005);
      break;
  }
  return g;
}
