// Bausteine für den Pizzastand: Ofen, Schaufel und Pizza – alles aus einfachen Formen, ohne externe Modelle.
import {
  BackSide,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';

export const COLORS = {
  ovenBody: 0xebe2d3,
  ovenTrim: 0x1d1b19,
  ovenInside: 0x2a211c,
  stone: 0x8c6f5a,
  ledge: 0xd6cab7,
  steel: 0x3a3836,
  handle: 0x121212,
  doughRaw: 0xf0dfbf,
  doughBaked: 0xd49a52,
  crustRaw: 0xf4e4c6,
  crustBaked: 0xc4813d,
  sauce: 0xb8321f,
  cheeseRaw: 0xfbf6ea,
  cheeseBaked: 0xf2dcae,
  basil: 0x2f6b2a,
  char: 0x2b1a10,
  flame: 0xff7a2e,
  flameCore: 0xffd27a,
};



export const ease = (t: number) => t * t * (3 - 2 * t);
export const seg = (p: number, a: number, b: number) => ease(MathUtils.clamp((p - a) / (b - a), 0, 1));

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Seitenprofil-unabhängiger Ofen im Stil eines modernen Gas-Pizzaofens (gewölbte Haube, breite Öffnung). */
export function buildOven() {
  const oven = new Group();
  const W = 1.7;
  const D = 1.35;
  const wallH = 0.5;
  const domeH = 0.42;
  const mouthW = 1.12;
  const mouthBottom = 0.17;
  const mouthTop = 0.46;

  // Frontprofil: unten gerade, seitlich senkrecht, oben eine flache Kuppel.
  const outer = new Shape();
  const r = 0.12;
  outer.moveTo(-W / 2 + r, 0);
  outer.lineTo(W / 2 - r, 0);
  outer.quadraticCurveTo(W / 2, 0, W / 2, r);
  outer.lineTo(W / 2, wallH);
  outer.bezierCurveTo(W / 2, wallH + domeH * 0.75, W * 0.22, wallH + domeH, 0, wallH + domeH);
  outer.bezierCurveTo(-W * 0.22, wallH + domeH, -W / 2, wallH + domeH * 0.75, -W / 2, wallH);
  outer.lineTo(-W / 2, r);
  outer.quadraticCurveTo(-W / 2, 0, -W / 2 + r, 0);

  // Öffnung: breit und niedrig, mit leicht gewölbter Oberkante.
  const mouth = new Shape();
  const mr = 0.06;
  mouth.moveTo(-mouthW / 2 + mr, mouthBottom);
  mouth.lineTo(mouthW / 2 - mr, mouthBottom);
  mouth.quadraticCurveTo(mouthW / 2, mouthBottom, mouthW / 2, mouthBottom + mr);
  mouth.lineTo(mouthW / 2, mouthTop - 0.06);
  mouth.quadraticCurveTo(0, mouthTop + 0.07, -mouthW / 2, mouthTop - 0.06);
  mouth.lineTo(-mouthW / 2, mouthBottom + mr);
  mouth.quadraticCurveTo(-mouthW / 2, mouthBottom, -mouthW / 2 + mr, mouthBottom);
  outer.holes.push(mouth);

  const bodyMat = new MeshStandardMaterial({ color: COLORS.ovenBody, roughness: 0.62, metalness: 0.05 });
  const shellGeo = new ExtrudeGeometry(outer, {
    depth: D,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 32,
  });
  shellGeo.translate(0, 0, -D / 2);
  const shell = new Mesh(shellGeo, bodyMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  oven.add(shell);

  // Innenraum: Box mit BackSide-Material → von aussen durch die Öffnung sichtbar, Frontfläche wird ausgeblendet.
  const insideMat = new MeshStandardMaterial({ color: COLORS.ovenInside, roughness: 0.9, side: BackSide });
  const cavity = new Mesh(new BoxGeometry(W - 0.16, mouthTop + 0.08 - mouthBottom + 0.12, D - 0.1), insideMat);
  cavity.position.set(0, (mouthBottom + mouthTop + 0.08) / 2 + 0.02, -0.02);
  oven.add(cavity);

  // Pizzastein
  const stoneMat = new MeshStandardMaterial({ color: COLORS.stone, roughness: 0.95, emissive: 0x3a1608, emissiveIntensity: 0.35 });
  const stone = new Mesh(new BoxGeometry(W - 0.2, 0.03, D - 0.16), stoneMat);
  stone.position.set(0, mouthBottom + 0.005, -0.03);
  stone.receiveShadow = true;
  oven.add(stone);

  // Dunkler Rahmen um die Öffnung
  const trimMat = new MeshStandardMaterial({ color: COLORS.ovenTrim, roughness: 0.5 });
  const trimShape = new Shape();
  const tw = mouthW + 0.12;
  trimShape.moveTo(-tw / 2, mouthBottom - 0.05);
  trimShape.lineTo(tw / 2, mouthBottom - 0.05);
  trimShape.lineTo(tw / 2, mouthTop - 0.02);
  trimShape.quadraticCurveTo(0, mouthTop + 0.14, -tw / 2, mouthTop - 0.02);
  trimShape.closePath();
  trimShape.holes.push(mouth);
  const trim = new Mesh(new ExtrudeGeometry(trimShape, { depth: 0.03, bevelEnabled: false, curveSegments: 24 }), trimMat);
  trim.position.z = D / 2 + 0.035;
  oven.add(trim);

  // Vordere Ablage
  const ledgeMat = new MeshStandardMaterial({ color: COLORS.ledge, roughness: 0.8 });
  const ledge = new Mesh(new BoxGeometry(mouthW + 0.1, 0.045, 0.2), ledgeMat);
  ledge.position.set(0, mouthBottom - 0.025, D / 2 + 0.13);
  ledge.castShadow = true;
  ledge.receiveShadow = true;
  oven.add(ledge);

  // Drehregler rechts
  const knob = new Mesh(new CylinderGeometry(0.075, 0.075, 0.06, 32), trimMat);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(W / 2 + 0.06, 0.28, D / 2 - 0.25);
  oven.add(knob);
  const knobMark = new Mesh(new BoxGeometry(0.012, 0.012, 0.09), new MeshStandardMaterial({ color: 0xffffff }));
  knobMark.position.set(W / 2 + 0.095, 0.3, D / 2 - 0.25);
  knobMark.rotation.x = 0.6;
  oven.add(knobMark);

  // Füsse
  const footGeo = new CylinderGeometry(0.06, 0.07, 0.06, 20);
  for (const [x, z] of [
    [-W / 2 + 0.2, -D / 2 + 0.2],
    [W / 2 - 0.2, -D / 2 + 0.2],
    [-W / 2 + 0.2, D / 2 - 0.2],
    [W / 2 - 0.2, D / 2 - 0.2],
  ]) {
    const foot = new Mesh(footGeo, trimMat);
    foot.position.set(x, -0.03, z);
    oven.add(foot);
  }

  // Flammen entlang der linken Innenwand
  const flames = new Group();
  const flameMat = new MeshStandardMaterial({
    color: COLORS.flame,
    emissive: COLORS.flame,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.9,
    roughness: 1,
  });
  const coreMat = new MeshStandardMaterial({ color: COLORS.flameCore, emissive: COLORS.flameCore, emissiveIntensity: 2.6, roughness: 1 });
  const flameList: Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const f = new Mesh(new ConeGeometry(0.045, 0.22, 10), i % 3 === 0 ? coreMat : flameMat);
    f.position.set(-W / 2 + 0.16, mouthBottom + 0.1, -D / 2 + 0.18 + i * 0.12);
    f.userData.phase = Math.random() * Math.PI * 2;
    flames.add(f);
    flameList.push(f);
  }
  oven.add(flames);

  const fireLight = new PointLight(0xff7a33, 2.2, 3, 1.6);
  fireLight.position.set(-0.45, mouthBottom + 0.22, 0);
  oven.add(fireLight);

  return { oven, flameList, fireLight, stoneTop: mouthBottom + 0.02, frontZ: D / 2 };
}

export function buildPeel() {
  const peel = new Group();
  const steel = new MeshStandardMaterial({ color: COLORS.steel, roughness: 0.38, metalness: 0.75 });
  const black = new MeshStandardMaterial({ color: COLORS.handle, roughness: 0.6 });

  const head = new Mesh(new ExtrudeGeometry(roundedRect(0.68, 0.64, 0.08), { depth: 0.012, bevelEnabled: false }), steel);
  head.rotation.x = -Math.PI / 2;
  head.castShadow = true;
  head.receiveShadow = true;
  peel.add(head);

  const neck = new Mesh(new BoxGeometry(0.12, 0.016, 0.16), steel);
  neck.position.set(0, 0.002, 0.38);
  peel.add(neck);

  const handle = new Mesh(new CylinderGeometry(0.024, 0.024, 0.95, 16), black);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.02, 0.92);
  handle.castShadow = true;
  peel.add(handle);

  return peel;
}

export function buildPizza() {
  const pizza = new Group();
  const R = 0.26;
  const dough = new MeshStandardMaterial({ color: COLORS.doughRaw, roughness: 0.85 });
  const crust = new MeshStandardMaterial({ color: COLORS.crustRaw, roughness: 0.8 });
  const sauce = new MeshStandardMaterial({ color: COLORS.sauce, roughness: 0.55 });
  const cheese = new MeshStandardMaterial({ color: COLORS.cheeseRaw, roughness: 0.5 });
  const basil = new MeshStandardMaterial({ color: COLORS.basil, roughness: 0.6 });
  const char = new MeshStandardMaterial({ color: COLORS.char, roughness: 0.9 });

  const base = new Mesh(new CylinderGeometry(R, R, 0.018, 48), dough);
  base.position.y = 0.009;
  base.castShadow = true;
  pizza.add(base);

  const rim = new Mesh(new TorusGeometry(R - 0.01, 0.036, 14, 56), crust);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.024;
  rim.scale.set(1, 1, 0.85);
  rim.castShadow = true;
  pizza.add(rim);

  const sauceDisc = new Mesh(new CircleGeometry(R - 0.035, 48), sauce);
  sauceDisc.rotation.x = -Math.PI / 2;
  sauceDisc.position.y = 0.0195;
  pizza.add(sauceDisc);

  const cheeseBlobs: Mesh[] = [];
  const blobGeo = new SphereGeometry(0.042, 16, 10);
  const spots = [
    [0.06, 0.05], [-0.09, 0.07], [0.11, -0.08], [-0.05, -0.11], [0.0, -0.01], [-0.14, -0.03], [0.14, 0.06], [0.03, 0.14],
  ];
  for (const [x, z] of spots) {
    const b = new Mesh(blobGeo, cheese);
    b.position.set(x, 0.022, z);
    b.scale.set(1 + Math.random() * 0.35, 0.22, 1 + Math.random() * 0.35);
    pizza.add(b);
    cheeseBlobs.push(b);
  }

  const leafGeo = new SphereGeometry(0.03, 10, 6);
  for (const [x, z, rot] of [
    [0.07, -0.03, 0.4], [-0.08, -0.06, 1.8], [-0.02, 0.09, 2.6], [0.12, 0.12, 0.9],
  ]) {
    const leaf = new Mesh(leafGeo, basil);
    leaf.position.set(x, 0.03, z);
    leaf.scale.set(1.4, 0.15, 0.7);
    leaf.rotation.y = rot;
    pizza.add(leaf);
  }

  // Leopardenflecken auf dem Rand – erscheinen beim Backen
  const charSpots: Mesh[] = [];
  const charGeo = new SphereGeometry(0.018, 8, 6);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.random() * 0.25;
    const s = new Mesh(charGeo, char);
    s.position.set(Math.cos(a) * (R - 0.01), 0.05, Math.sin(a) * (R - 0.01));
    s.scale.set(1, 0.35, 1);
    s.visible = false;
    pizza.add(s);
    charSpots.push(s);
  }

  return { pizza, dough, crust, cheese, charSpots };
}

