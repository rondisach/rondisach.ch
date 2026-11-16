// 3D-Hero: Scrollend durch einen Low-Poly-Garten zur goldenen Stunde – vorbei an Gästen, die Pizza geniessen,
// bis zum rondisach-Stand, wo gerade eine Pizza in den Ofen geschoben, gebacken und wieder herausgeholt wird.
import {
  AmbientLight,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { COLORS, buildOven, buildPeel, buildPizza, seg } from './oven';
import {
  GARDEN,
  animatePerson,
  buildBunting,
  buildPathStones,
  buildBush,
  buildFireflies,
  buildGround,
  buildMountains,
  buildPerson,
  buildSky,
  buildStand,
  buildStringLights,
  buildTable,
  buildTree,
  rng,
  type Person,
} from './garden';
import {
  buildFence,
  buildFlowerBed,
  buildGrassTufts,
  buildHedgeRow,
  buildHouse,
  buildRaisedBed,
  buildShed,
  buildSwingTree,
  buildTrampoline,
  buildWheelbarrow,
} from './props';
import { PIZZA_KINDS, buildVariantPizza } from './pizzas';
import { batchStatic } from './batch';
import { buildPuffs } from './effects';

export interface HeroScene {
  setProgress(p: number): void;
  /** Nur zum Testen: sofort an eine Stelle springen, ohne Nachlauf. */
  jump(p: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
  /** Nur zum Messen: Zeichenaufrufe, Dreiecke und aktuelle Auflösung. */
  info(): { calls: number; triangles: number; pixelRatio: number; fps: number };
}

/** Anteil des Scrollwegs für den Spaziergang; der Rest gehört dem Ofen. */
const WALK_END = 0.74;

/** Bildschirmposition (in Pixeln innerhalb der Leinwand) eines Punktes am Stand, für den «Jetzt anfragen»-Knopf. */
export interface StandAnchor {
  x: number;
  y: number;
  visible: boolean;
}

export function createHeroScene(
  canvas: HTMLCanvasElement,
  onProgress?: (p: number, anchor: StandAnchor) => void,
  /** Foto der fertigen Pizza (freigestellt): Im Finale wird aus der gezeichneten Pizza die echte. */
  pizzaPhoto?: string,
): HeroScene {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const rand = rng(7);

  const renderer = new WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  // Nie mehr Bildpunkte zeichnen als nötig: Auf scharfen, grossen Bildschirmen wäre es sonst das Vierfache – das bremst vor allem Safari.
  const PIXEL_BUDGET = 2_300_000;
  let quality = 1;
  const pixelRatio = () => {
    const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
    return Math.max(0.6, Math.min(window.devicePixelRatio, small ? 1.5 : 2, Math.sqrt(PIXEL_BUDGET / area)) * quality);
  };
  renderer.setPixelRatio(pixelRatio());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.fog = new Fog(0xf0b07a, 18, 78);
  scene.background = new Color(GARDEN.horizon);
  const camera = new PerspectiveCamera(45, 1, 0.1, 260);

  // Licht: tiefe, warme Abendsonne von hinten links, weiches Himmelslicht, leichtes Aufhelllicht von vorne.
  scene.add(new HemisphereLight(0xffd9a8, 0x4a5a2c, 1.35));
  scene.add(new AmbientLight(0xffe2c0, 0.25));
  const sun = new DirectionalLight(0xffb066, 2.6);
  sun.position.set(-14, 9, -22);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new DirectionalLight(0xffe0c2, 0.7);
  fill.position.set(6, 5, 12);
  scene.add(fill);

  scene.add(buildSky(), buildGround(rand), buildMountains(rand));

  // Grundstück: x von -8 (Hauswand) bis 8.5, z von -13 (hinten) bis 20.5 (vorne)
  const inGarden = (x: number, z: number) => x > -7.8 && x < 8.3 && z > -12.8 && z < 20.3;

  // Bäume der Nachbarschaft – nur ausserhalb des Gartens
  const treeCount = small ? 16 : 30;
  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * Math.PI * 2 + rand() * 0.2;
    const r = 14 + rand() * 14;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r + 3;
    if (x > -16 && x < 10.5 && z > -15 && z < 22) continue;
    const t = buildTree(rand, 1.0 + rand() * 0.8);
    t.position.set(x, 0, z);
    scene.add(t);
  }

  // Wohnhaus mit Terrasse auf der linken Seite, Nachbarhäuser in der Ferne
  const house = buildHouse(rand);
  house.position.set(-11.5, 0, 7);
  scene.add(house);
  for (const [x, z, r] of [[-3, -26, Math.PI / 2], [9, -24, Math.PI / 2 + 0.3], [18, 7, Math.PI]] as const) {
    const n = buildHouse(rand, { length: 8, depth: 6, terrace: false });
    n.position.set(x, 0, z);
    n.rotation.y = r;
    n.scale.setScalar(0.9);
    scene.add(n);
  }

  // Zaun, Hecken, Beete und Sträucher entlang der Grundstücksgrenze
  scene.add(
    buildFence([new Vector3(-8, 0, 20.5), new Vector3(8.5, 0, 20.5), new Vector3(8.5, 0, -13), new Vector3(-8, 0, -13), new Vector3(-8, 0, 2.5)]),
  );
  scene.add(buildFence([new Vector3(-8, 0, 11.5), new Vector3(-8, 0, 20.5)]));
  scene.add(buildHedgeRow(new Vector3(9.3, 0, 21), new Vector3(9.3, 0, -13.8), rand));
  scene.add(buildHedgeRow(new Vector3(-8.8, 0, -13.8), new Vector3(9.3, 0, -13.8), rand, 2.1));
  scene.add(buildFlowerBed(new Vector3(7.6, 0, 18.5), new Vector3(7.6, 0, 4), rand));
  scene.add(buildFlowerBed(new Vector3(7.6, 0, -0.5), new Vector3(7.6, 0, -11.5), rand));
  scene.add(buildFlowerBed(new Vector3(-7.3, 0, 19.5), new Vector3(-7.3, 0, 12.5), rand, 0.7));
  scene.add(buildFlowerBed(new Vector3(-6.5, 0, -12.2), new Vector3(-2.2, 0, -12.2), rand, 0.8));
  for (let i = 0; i < (small ? 5 : 10); i++) {
    const b = buildBush(rand);
    b.position.set(6.6 + rand() * 0.5, 0.25, 19 - i * 3.1);
    scene.add(b);
  }
  scene.add(buildGrassTufts(small ? 500 : 1600, rand, inGarden));

  // Gartenhaus hinten rechts, Trampolin vorne rechts
  const shed = buildShed();
  shed.position.set(6.4, 0, -10.6);
  shed.rotation.y = -Math.PI / 2 + 0.2;
  scene.add(shed);
  const trampoline = buildTrampoline();
  trampoline.group.position.set(5.4, 0, 13.4);
  scene.add(trampoline.group);

  // Alter Apfelbaum mit Schaukel, Hochbeet mit Schubkarre – die Kamera schlängelt sich darum herum
  const swingTree = buildSwingTree(rand);
  swingTree.group.position.set(-1.1, 0, 6.2);
  scene.add(swingTree.group);
  const bed = buildRaisedBed(rand);
  bed.position.set(1.5, 0, 1.3);
  bed.rotation.y = 0.35;
  scene.add(bed);
  const barrow = buildWheelbarrow();
  barrow.position.set(2.9, 0, 0.3);
  barrow.rotation.y = -0.9;
  scene.add(barrow);

  // Lichterketten im Zickzack über dem Weg
  const poles = [
    new Vector3(-4.8, 2.7, 11),
    new Vector3(4.8, 2.7, 8),
    new Vector3(-4.8, 2.7, 4),
    new Vector3(4.8, 2.7, 0.5),
    new Vector3(-4.8, 2.7, -3.5),
    new Vector3(4.8, 2.7, -6.5),
    new Vector3(-3, 2.7, -10.5),
  ];
  scene.add(buildStringLights(poles, small ? 7 : 11));
  // Wimpel nur über dem Weg, nicht vor dem Stand
  scene.add(buildBunting(poles.slice(0, -2), small ? 9 : 14));
  const fireflies = buildFireflies(small ? 50 : 140, rand);
  scene.add(fireflies.points);

  // Tische mit sitzenden Gästen
  const people: Person[] = [];
  const tables = [
    { x: -3.1, z: 7.2, r: 0.25 },
    { x: 3.0, z: 4.6, r: -0.3 },
    { x: -3.0, z: 0.2, r: 0.1 },
    { x: 3.3, z: -2.6, r: 0.4 },
    { x: -3.4, z: -5.0, r: -0.2 },
  ].filter((_, i) => !small || i % 2 === 0);
  tables.forEach((t, ti) => {
    const g = new Group();
    // Jeder Tisch bekommt drei verschiedene Sorten, über alle Tische verteilt
    const kinds = [0, 1, 2].map((k) => PIZZA_KINDS[(ti * 3 + k) % PIZZA_KINDS.length]);
    const table = buildTable(rand, kinds);
    g.add(table);
    // Alle sitzen auf der abgewandten Seite – so bleibt der Blick auf die Pizzen frei.
    for (const [x, side] of [[-0.65, -1], [0, -1], [0.65, -1]] as const) {
      if (small && rand() > 0.6) continue;
      const p = buildPerson({ rand, pose: 'sit', hold: rand() > 0.45 ? 'slice' : 'glass' });
      p.position.set(x, 0, side * 0.62);
      p.rotation.y = side < 0 ? 0 : Math.PI;
      g.add(p);
      people.push(p);
    }
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.r;
    scene.add(g);
  });

  // Stehende Grüppchen
  const standing = [
    { x: 3.4, z: 9.6, r: -2.4, hold: 'glass', toast: true },
    { x: 4.1, z: 9.0, r: 2.2, hold: 'glass', toast: true },
    { x: -3.2, z: 2.6, r: 1.9, hold: 'slice' },
    { x: -3.8, z: 3.3, r: 2.7, hold: 'glass' },
    { x: 3.6, z: -4.0, r: -0.8, hold: 'slice' },
    { x: -2.4, z: -7.4, r: Math.PI + 0.5, hold: 'glass' },
    { x: -1.7, z: -6.8, r: Math.PI + 0.2, hold: null },
  ].filter((_, i) => !small || i % 2 === 0 || i >= 5);
  for (const s of standing) {
    const p = buildPerson({ rand, hold: s.hold as 'glass' | 'slice' | null });
    if ('toast' in s) p.userData.action = 'toast';
    p.position.set(s.x, 0, s.z);
    p.rotation.y = s.r;
    scene.add(p);
    people.push(p);
  }

  // Kinder, die auf dem Trampolin hüpfen
  const kids = Array.from({ length: small ? 2 : 3 }, (_, i) => {
    const k = buildPerson({ rand });
    k.scale.setScalar(0.62);
    k.userData.phase = (i / 3) * Math.PI * 2;
    scene.add(k);
    people.push(k);
    return k;
  });

  // Helfer, der Pizza vom Stand zu den Tischen bringt
  const waiter = buildPerson({ rand, apron: true, shirt: 0xf3eee4 });
  waiter.userData.action = 'none';
  waiter.userData.armL.rotation.x = -1.35;
  waiter.userData.armR.rotation.x = -1.35;
  const tray = new Group();
  const trayBoard = new Mesh(new CylinderGeometry(0.26, 0.26, 0.025, 20), new MeshStandardMaterial({ color: GARDEN.woodDark, roughness: 0.9 }));
  const trayPizza = buildVariantPizza('salami', rand);
  trayPizza.position.y = 0.015;
  tray.add(trayBoard, trayPizza);
  tray.position.set(0, 1.26, 0.5);
  waiter.add(tray);
  scene.add(waiter);
  const waiterA = new Vector3(-1.9, 0, -8.2);
  const waiterB = new Vector3(-2.9, 0, -5.9);

  // Der rondisach-Stand
  const STAND_Z = -9.2;
  const stand = buildStand();
  stand.position.set(0, 0, STAND_Z);
  scene.add(stand);

  const maurice = buildPerson({ rand, apron: true, shirt: 0xf3eee4 });
  maurice.position.set(-0.55, 0, STAND_Z - 0.62);
  maurice.userData.action = 'work';
  scene.add(maurice);
  people.push(maurice);

  // Ofen, Schaufel und Pizza aus dem bisherigen Hero – verkleinert auf den Tisch gestellt, Öffnung zur Seite.
  const rig = new Group();
  rig.scale.setScalar(0.42);
  // Leicht nach hinten gedreht, damit der Schaufelgriff hinter den Tisch reicht
  const RIG_TURN = Math.PI / 2 + 0.55;
  rig.rotation.y = RIG_TURN;
  rig.position.set(0.25, 0.91, STAND_Z - 0.12);
  scene.add(rig);
  const { oven, flameList, fireLight, stoneTop, frontZ, glow } = buildOven();
  rig.add(oven);
  const peel = buildPeel();
  rig.add(peel);
  const pz = buildPizza();
  rig.add(pz.pizza);
  rig.traverse((o) => {
    if (o instanceof Mesh) o.castShadow = true;
  });

  const andrin = buildPerson({ rand, apron: true, shirt: 0x2c2925 });
  andrin.userData.action = 'none';
  andrin.userData.armL.rotation.x = -0.9;
  andrin.userData.armR.rotation.x = -0.9;
  andrin.userData.armL.rotation.z = 0.15;
  andrin.userData.armR.rotation.z = -0.15;
  scene.add(andrin);

  // Warmes Licht über dem Stand
  const standLight = new PointLight(0xffb878, 6, 6, 1.4);
  standLight.position.set(0.3, 2.3, STAND_Z + 0.6);
  scene.add(standLight);

  const PEEL_OUT = new Vector3(0, stoneTop + 0.005, frontZ + 0.62);
  const PEEL_IN = new Vector3(0, stoneTop + 0.005, 0.16);

  // Kamerafahrt in einer S-Kurve durch den Garten: am Trampolin vorbei, um den Apfelbaum, am Hochbeet vorbei zum Stand.
  const camPath = new CatmullRomCurve3([
    new Vector3(0.6, 1.85, 19.6),
    new Vector3(2.3, 1.7, 15.6),
    new Vector3(0.2, 1.7, 11.6),
    new Vector3(1.6, 1.7, 7.4),
    new Vector3(0.1, 1.7, 4.0),
    new Vector3(-1.1, 1.7, 1.4),
    new Vector3(-0.8, 1.95, -2.2),
    new Vector3(1.4, 1.85, -4.8),
    new Vector3(2.7, 1.75, -5.6),
  ]);
  scene.add(buildPathStones(camPath, rand, small ? 26 : 36));

  // Blick: leicht voraus auf die Kurve, am Schluss auf den Stand
  const lookAhead = new Vector3();
  const standLook = new Vector3(0.55, 1.12, STAND_Z);
  const startLook = new Vector3(0.3, 1.35, 9);
  const signLook = new Vector3(0.3, 1.9, STAND_Z);
  // Geglätteter Blickpunkt, damit die Kamera ruhig bleibt
  const steadyLook = new Vector3();
  let lookReady = false;
  const camPos = new Vector3();
  const lookAt = new Vector3();
  const handleEnd = new Vector3();
  // Mittig unter der Markise, über den Köpfen
  const anchorWorld = new Vector3(0.3, 1.95, -9.2 + 0.85);
  const anchorNdc = new Vector3();
  const anchor: StandAnchor = { x: 0, y: 0, visible: false };
  const standCenter = new Vector3(0, 0, -9.2);
  // Schluss: erst nah vor die Ofenöffnung, dann zurück – die fertige Pizza kommt mit zum Betrachter.
  const ovenFront = new Vector3(Math.sin(RIG_TURN), 0, Math.cos(RIG_TURN));
  const mouthLook = new Vector3().copy(rig.position).addScaledVector(ovenFront, 0.26).setY(rig.position.y + 0.13);
  const mouthPos = new Vector3(rig.position.x + Math.sin(RIG_TURN - 0.5) * 0.84, rig.position.y + 0.2, rig.position.z + Math.cos(RIG_TURN - 0.5) * 0.84);
  const finalPos = new Vector3(2.5, 1.55, STAND_Z + 3.3);
  const finalLook = new Vector3(0.2, 1.3, STAND_Z);

  const sparks = buildPuffs({ count: 26, color: 0xffb04a, glow: true, size: 26, rise: 0.34, spread: 0.3, life: 1500 });
  const steam = buildPuffs({ count: 14, color: 0xfff6ea, glow: false, size: 70, rise: 0.26, spread: 0.06, life: 2800 });
  scene.add(sparks.points, steam.points);
  // Aufhelllicht, damit die servierte Pizza vor der Abendsonne nicht im Schatten liegt
  const serveLight = new PointLight(0xfff0dc, 0, 2.2, 1.5);
  scene.add(serveLight);
  // Die echte Pizza als Bild, das immer zur Kamera schaut
  const photoMat = new MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
  const photo = new Mesh(new PlaneGeometry(0.31, 0.31), photoMat);
  photo.renderOrder = 10;
  photo.visible = false;
  steam.points.renderOrder = 11;
  scene.add(photo);
  let photoReady = false;
  if (pizzaPhoto) {
    new TextureLoader().load(pizzaPhoto, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      photoMat.map = tex;
      photoMat.needsUpdate = true;
      photoReady = true;
    });
  }
  const Z_AXIS = new Vector3(0, 0, 1);
  const rimRaw = new Vector3(0.97, 0.97, 0.5);
  const rimBaked = new Vector3(1, 1, 0.88);
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const sparkOrigin = new Vector3();
  const qRig = new Quaternion();
  const qFrom = new Quaternion();
  const qTo = new Quaternion();
  const qTilt = new Quaternion();
  const qSpin = new Quaternion();
  const X_AXIS = new Vector3(1, 0, 0);
  const Y_AXIS = new Vector3(0, 1, 0);

  const doughRaw = new Color(COLORS.doughRaw);
  const doughBaked = new Color(COLORS.doughBaked);
  const crustRaw = new Color(COLORS.crustRaw);
  const crustBaked = new Color(COLORS.crustBaked);
  const cheeseRaw = new Color(COLORS.cheeseRaw);
  const cheeseBaked = new Color(COLORS.cheeseBaked);

  // Was sich bewegt, wirft keinen eigenen Schatten: Die Schatten werden nur einmal berechnet (siehe unten).
  for (const mover of [...kids, waiter, andrin, peel, pz.pizza]) {
    mover.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = false;
    });
  }
  // Alles Unbewegte zu wenigen Netzen zusammenfassen – das macht den grössten Unterschied beim Ruckeln.
  // Die meisten Gäste bleiben an ihrem Platz: Nur Arme und Kopf bewegen sich, der Rest geht mit dem Garten zusammen.
  const movers = [...kids, waiter, andrin];
  const limbs = (p: Person) => [p.userData.armL, p.userData.armR, p.userData.head];
  const seated = people.filter((p) => !movers.includes(p));
  batchStatic(scene, [...movers, rig, swingTree.swing, fireflies.points, ...seated.flatMap(limbs)]);
  // Wer sich als Ganzes bewegt, wird für sich zusammengefasst. Das Tablett des Helfers wird ein- und ausgeblendet und bleibt eigenständig.
  for (const person of movers) batchStatic(person, [...limbs(person), ...(person === waiter ? [tray] : [])], false);
  for (const person of [...seated, ...movers]) for (const part of limbs(person)) batchStatic(part, [], false);
  // Die Sonne steht still: Schatten einmal berechnen statt in jedem Bild.
  sun.shadow.autoUpdate = false;
  let shadowFrames = 3;

  let target = 0;
  let current = 0;
  let lastTime = 0;
  let slow = 0;
  let measured = 0;
  let fps = 60;
  let raf = 0;
  let running = false;
  let portrait = false;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Erst bei deutlichem Hochformat (Handy) weiter weg; die Karten-Variante bleibt nah dran.
    portrait = w / h < 0.75;
    camera.fov = portrait ? 62 : 45;
    camera.updateProjectionMatrix();
    const pixelScale = (h * renderer.getPixelRatio()) / 900;
    sparks.points.userData.pixelScale = steam.points.userData.pixelScale = pixelScale;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function apply(prog: number, time: number) {
    // Spaziergang
    const walk = MathUtils.clamp(prog / WALK_END, 0, 1);
    camPath.getPoint(walk, camPos);
    // Weit voraus schauen, so dreht die Kamera in den Kurven nur sanft
    camPath.getPoint(Math.min(1, walk + 0.16), lookAhead);
    // Ab der Hälfte schaut die Kamera zum Stand – erst auf das Schild, am Schluss auf den Ofen
    lookAt.copy(lookAhead).setY(1.25).lerp(signLook, seg(walk, 0.5, 0.78)).lerp(standLook, seg(walk, 0.84, 1));
    // Am Anfang geradeaus durch den Rosenbogen schauen
    lookAt.lerp(startLook, 1 - seg(walk, 0, 0.14));
    // Ofen-Szene am Stand: nah heran, Pizza rein, backen, raus – und dann kommt sie zum Betrachter.
    const f = MathUtils.clamp((prog - WALK_END) / (1 - WALK_END), 0, 1);
    const closeIn = seg(f, 0, 0.16);
    const pullBack = seg(f, 0.62, 0.84);
    camPos.lerp(mouthPos, closeIn).lerp(finalPos, pullBack);
    lookAt.lerp(mouthLook, closeIn).lerp(finalLook, pullBack);
    if (portrait) {
      // Hochformat: etwas weiter zurück, damit Ofen und Stand ins Bild passen
      camPos.sub(lookAt).multiplyScalar(1 + 0.3 * closeIn).add(lookAt);
    }
    camera.position.copy(camPos);
    if (!lookReady) {
      steadyLook.copy(lookAt);
      lookReady = true;
    }
    steadyLook.lerp(lookAt, 0.08);
    camera.lookAt(steadyLook);

    const inA = seg(f, 0.12, 0.26);
    const bake = seg(f, 0.26, 0.56);
    const outB = seg(f, 0.56, 0.68);
    const serve = seg(f, 0.66, 0.86);
    // Die Schaufel legt die Pizza ab, zieht sich während des Backens zurück und holt sie danach wieder.
    const away = seg(f, 0.26, 0.33) - seg(f, 0.49, 0.56);
    peel.position.lerpVectors(PEEL_OUT, PEEL_IN, inA - away - outB);
    peel.position.y += Math.sin(outB * Math.PI) * 0.04 + outB * 0.06;
    peel.rotation.x = -outB * 0.12;
    pz.pizza.position.lerpVectors(PEEL_OUT, PEEL_IN, inA - outB);
    pz.pizza.position.y = peel.position.y + 0.014;
    pz.pizza.rotation.set(peel.rotation.x, seg(f, 0.36, 0.5) * Math.PI, 0);
    // Der Rand geht im Ofen auf, der Käse verläuft
    pz.rim.scale.lerpVectors(rimRaw, rimBaked, seg(f, 0.28, 0.5));
    const melt = seg(f, 0.3, 0.52);
    pz.cheeseBlobs.forEach((b) => b.scale.set(b.userData.size.x * (1 + melt * 0.3), b.userData.size.y * (1 - melt * 0.35), b.userData.size.z * (1 + melt * 0.3)));
    pz.dough.color.copy(doughRaw).lerp(doughBaked, bake);
    pz.crust.color.copy(crustRaw).lerp(crustBaked, bake);
    pz.cheese.color.copy(cheeseRaw).lerp(cheeseBaked, bake * 0.8);
    pz.charSpots.forEach((s, i) => (s.visible = bake > 0.35 + (i % 6) * 0.08));

    const heat = 0.7 + seg(f, 0.2, 0.4) * (1 - outB) * 0.75;
    flameList.forEach((fl) => {
      const k = 0.75 + Math.sin(time * 0.012 + fl.userData.phase) * 0.18 + Math.sin(time * 0.031 + fl.userData.phase) * 0.08;
      fl.scale.set(1, k * heat, 1);
      fl.position.y = stoneTop + 0.08 + (k * heat * 0.22) / 2 - 0.05;
    });
    fireLight.intensity = (0.09 + Math.sin(time * 0.02) * 0.015) * heat;
    glow.emissiveIntensity = 0.3 + (heat - 0.7) * 0.6 + Math.sin(time * 0.015) * 0.04;

    // Andrin hält den Griff der Schaufel
    peel.updateWorldMatrix(true, false);
    peel.localToWorld(handleEnd.set(0, 0.02, 1.3));
    // Er steht hinter dem Tisch in der Verlängerung der Schaufel und hält den Griff.
    andrin.position.set(handleEnd.x + Math.sin(RIG_TURN) * 0.42, 0, handleEnd.z + Math.cos(RIG_TURN) * 0.42);
    andrin.rotation.y = RIG_TURN + Math.PI;

    // Servieren: Die Pizza löst sich von der Schaufel und schwebt vor die Kamera, mit der Oberseite zum Betrachter.
    if (serve > 0) {
      rig.getWorldQuaternion(qRig);
      qFrom.copy(qRig).multiply(pz.pizza.quaternion);
      // Mit Foto dreht sich die Pizza ganz zur Kamera, damit beide deckungsgleich sind
      qTilt.setFromAxisAngle(X_AXIS, photoReady ? Math.PI / 2 : 1.08);
      qSpin.setFromAxisAngle(Y_AXIS, Math.PI + time * 0.00028);
      qTo.copy(camera.quaternion).multiply(qTilt).multiply(qSpin);
      qFrom.slerp(qTo, serve);
      // Zielpunkt im Blickfeld: rechts der Mitte, im Hochformat mittig und etwas tiefer
      camera.updateMatrixWorld();
      tmpB.set(portrait ? 0 : 0.2, portrait ? -0.1 : -0.015, portrait ? -0.82 : -0.62).applyMatrix4(camera.matrixWorld);
      rig.localToWorld(tmpA.copy(pz.pizza.position));
      tmpA.lerp(tmpB, serve);
      tmpA.y += Math.sin(serve * Math.PI) * 0.12;
      // Aus der gezeichneten Pizza wird das Foto
      const real = photoReady ? seg(serve, 0.5, 0.85) : 0;
      photo.visible = real > 0;
      photoMat.opacity = real;
      photo.position.copy(tmpA);
      photo.quaternion.copy(camera.quaternion).multiply(qSpin.setFromAxisAngle(Z_AXIS, -time * 0.00022));
      photo.scale.setScalar(0.72 + 0.28 * serve);
      pz.pizza.visible = real < 1;
      pz.pizza.position.copy(rig.worldToLocal(tmpA));
      pz.pizza.quaternion.copy(qRig.invert().multiply(qFrom));
    } else {
      photo.visible = false;
      pz.pizza.visible = true;
    }
    serveLight.position.copy(camera.position);
    serveLight.intensity = serve * 1.6;

    // Funken aus der Öffnung, solange gebacken wird; Dampf über der fertigen Pizza
    rig.localToWorld(sparkOrigin.set(-0.2, stoneTop + 0.1, 0.35));
    sparks.update(time, seg(f, 0.22, 0.34) * (1 - seg(f, 0.58, 0.7)), sparkOrigin);
    rig.localToWorld(tmpA.copy(pz.pizza.position));
    steam.update(time, seg(f, 0.5, 0.6), tmpA);

    // Kinder hüpfen auf dem Trampolin, die Schaukel schwingt leicht
    kids.forEach((k, i) => {
      const a = k.userData.phase + Math.sin(time * 0.0004 + i) * 0.4;
      const tp = trampoline.group.position;
      k.position.set(tp.x + Math.cos(a) * 0.7, trampoline.mat + Math.abs(Math.sin(time * 0.0055 + i * 1.7)) * 0.65, tp.z + Math.sin(a) * 0.7);
      k.rotation.y = -a + Math.PI / 2;
    });
    swingTree.swing.rotation.z = Math.sin(time * 0.0016) * 0.18;

    // Helfer läuft hin und her
    const w = (1 - Math.cos(time * 0.00045)) / 2;
    const dir = Math.sin(time * 0.00045) >= 0 ? 1 : -1;
    waiter.position.lerpVectors(waiterA, waiterB, w);
    waiter.position.y = Math.abs(Math.sin(time * 0.009)) * 0.03;
    waiter.rotation.y = Math.atan2(waiterB.x - waiterA.x, waiterB.z - waiterA.z) + (dir > 0 ? 0 : Math.PI);
    tray.visible = dir > 0;

    // Wenn die fertige Pizza aus dem Ofen kommt, jubeln die Leute in der Nähe
    const cheer = seg(f, 0.72, 0.82);
    people.forEach((p) => {
      p.userData.cheer = p.position.distanceTo(standCenter) < 5 ? cheer : 0;
      animatePerson(p, time);
    });
    fireflies.update(time);

    camera.updateMatrixWorld();
    anchorNdc.copy(anchorWorld).project(camera);
    anchor.x = ((anchorNdc.x + 1) / 2) * canvas.clientWidth;
    anchor.y = ((1 - anchorNdc.y) / 2) * canvas.clientHeight;
    anchor.visible = anchorNdc.z < 1 && Math.abs(anchorNdc.x) < 0.9 && anchorNdc.y > -0.8;
    onProgress?.(prog, anchor);
  }

  function render() {
    // Die ersten Bilder berechnen die Schatten, danach bleiben sie stehen.
    if (shadowFrames > 0) {
      shadowFrames--;
      sun.shadow.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function frame(time: number) {
    const dt = time - lastTime;
    lastTime = time;
    current += (target - current) * 0.1;
    apply(current, time);
    render();
    // Ruckelt es auf diesem Gerät, die Auflösung rasch senken (nie wieder erhöhen).
    if (dt > 0 && dt < 250 && document.visibilityState === 'visible') {
      measured++;
      if (dt > 22) slow++;
      if (measured >= 40) {
        if (slow > 20 && quality > 0.5) {
          quality = Math.max(0.5, quality - 0.17);
          resize();
        }
        measured = slow = 0;
      }
      fps += (1000 / dt - fps) * 0.1;
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  return {
    setProgress(v) {
      target = MathUtils.clamp(v, 0, 1);
    },
    jump(v) {
      target = current = MathUtils.clamp(v, 0, 1);
      lookReady = false;
      apply(current, performance.now());
      render();
    },
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio(), fps }),
    dispose() {
      this.stop();
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: Material) => m.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
