// Mini-Garten für den Handy-Einstieg – im Stil der grossen 3D-Szene auf dem Laptop, aber als kleines Diorama:
// eine schwebende Rasen-Insel zur goldenen Stunde mit dem rondisach-Stand, glühendem Ofen, Andrin an der Schaufel,
// Maurice am Teig, einem Tisch mit Gästen, Baum und Lichterkette. Die Kamera schwenkt langsam hin und her,
// mit dem Finger lässt sich die Insel drehen. Alle Bausteine kommen aus src/scripts/hero/.
import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
  MeshStandardMaterial,
  DodecahedronGeometry,
  MathUtils,
} from 'three';
import { batchStatic } from '../hero/batch';
import { GARDEN, animatePerson, buildBush, buildPerson, buildStand, buildStringLights, buildTable, buildTree, rng, type Person } from '../hero/garden';
import { buildOven, buildPeel, buildPizza, seg } from '../hero/oven';
import { buildGrassTufts } from '../hero/props';

const flat = (color: number) => new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });

/** Schwebende Insel: Rasen oben, Erdschicht mit unregelmässiger Unterseite, ein paar Steine am Rand. */
function buildIsland(rand: () => number, R: number) {
  const g = new Group();
  const grass = new Mesh(new CylinderGeometry(R, R * 0.98, 0.22, 28), flat(GARDEN.grass));
  grass.position.y = -0.11;
  grass.receiveShadow = true;
  const soilGeo = new CylinderGeometry(R * 0.98, R * 0.55, 1.3, 20, 2);
  const pos = soilGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.6) {
      const k = 1 + (rand() - 0.5) * 0.12;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
      if (y < -0.6) pos.setY(i, y - rand() * 0.45);
    }
  }
  soilGeo.computeVertexNormals();
  const soil = new Mesh(soilGeo, flat(0x7a5236));
  soil.position.y = -0.87;
  g.add(grass, soil);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const rock = new Mesh(new DodecahedronGeometry(0.12 + rand() * 0.16, 0), flat(0x9a948c));
    rock.position.set(Math.cos(a) * R * 0.92, -0.05, Math.sin(a) * R * 0.92);
    rock.rotation.set(rand(), rand(), rand());
    rock.castShadow = true;
    g.add(rock);
  }
  return g;
}

export function createGartenScene(canvas: HTMLCanvasElement) {
  const rand = rng(11);
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);

  // Licht wie auf dem Laptop: tiefe, warme Abendsonne, weiches Himmelslicht, leichtes Aufhelllicht
  scene.add(new HemisphereLight(0xffd9a8, 0x4a5a2c, 1.35));
  scene.add(new AmbientLight(0xffe2c0, 0.3));
  const sun = new DirectionalLight(0xffb066, 2.6);
  sun.position.set(-7, 8, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new DirectionalLight(0xffe0c2, 0.75);
  fill.position.set(4, 5, 9);
  scene.add(fill);

  const R = 4.4;
  const world = new Group();
  scene.add(world);
  world.add(buildIsland(rand, R));
  world.add(buildGrassTufts(260, rand, (x, z) => Math.hypot(x, z) < R - 0.3));

  // Stand hinten, Front zur Kamera
  const STAND_Z = -1.3;
  const stand = buildStand();
  stand.position.set(0, 0, STAND_Z);
  world.add(stand);
  stand.traverse((o) => {
    if (o instanceof Mesh) o.castShadow = true;
  });

  const maurice = buildPerson({ rand, apron: true, shirt: 0xf3eee4 });
  maurice.position.set(-0.75, 0, STAND_Z - 0.62);
  maurice.userData.action = 'work';
  world.add(maurice);

  // Ofen mit Schaufel und Pizza auf dem Stand, wie auf dem Laptop
  const rig = new Group();
  rig.scale.setScalar(0.42);
  const RIG_TURN = Math.PI / 2 + 0.55;
  rig.rotation.y = RIG_TURN;
  rig.position.set(0.45, 0.91, STAND_Z - 0.12);
  world.add(rig);
  const { oven, flameList, fireLight, stoneTop, frontZ } = buildOven();
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
  andrin.userData.armL.rotation.set(-0.9, 0, 0.15);
  andrin.userData.armR.rotation.set(-0.9, 0, -0.15);
  world.add(andrin);
  const PEEL_OUT = new Vector3(0, stoneTop + 0.005, frontZ + 0.62);
  const PEEL_IN = new Vector3(0, stoneTop + 0.005, -0.08);
  const handleEnd = new Vector3();

  const standLight = new PointLight(0xffb878, 5, 5, 1.4);
  standLight.position.set(0.3, 2.3, STAND_Z + 0.7);
  world.add(standLight);

  // Tisch vorne mit drei Gästen, zwei Gäste stossen daneben an
  const people: Person[] = [maurice];
  const table = new Group();
  table.add(buildTable(rand, ['margherita', 'salami', 'vegi']));
  for (const x of [-0.62, 0, 0.62]) {
    const r = rand();
    const p = buildPerson({ rand, pose: 'sit', hold: r > 0.5 ? 'slice' : 'glass' });
    p.position.set(x, 0, -0.62);
    table.add(p);
    people.push(p);
  }
  table.position.set(-1.1, 0, 1.75);
  table.rotation.y = 0.18;
  world.add(table);
  for (const [x, z, ry] of [[2.0, 1.2, -2.3], [2.55, 0.75, 2.6]] as const) {
    const p = buildPerson({ rand, hold: 'glass' });
    p.userData.action = 'toast';
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    world.add(p);
    people.push(p);
  }
  for (const p of people) p.traverse((o) => o instanceof Mesh && (o.castShadow = true));
  andrin.traverse((o) => o instanceof Mesh && (o.castShadow = true));

  // Baum, Sträucher und Lichterkette
  const tree = buildTree(rand, 1.15);
  tree.position.set(-3.1, 0, -2.5);
  tree.traverse((o) => o instanceof Mesh && (o.castShadow = true));
  world.add(tree);
  for (const [x, z] of [[3.4, -1.9], [-3.8, 0.9], [3.7, 1.4], [-1.6, -3.3]] as const) {
    const b = buildBush(rand);
    b.position.set(x, 0.25, z);
    world.add(b);
  }
  world.add(buildStringLights([new Vector3(-3.2, 2.6, 0.2), new Vector3(0, 2.7, 2.6), new Vector3(3.3, 2.6, 0.2)], 9));

  // Unbewegtes zusammenfassen; Arme, Köpfe, Schaufel, Pizza und Flammen bleiben beweglich
  const limbs = (p: Person) => [p.userData.armL, p.userData.armR, p.userData.head];
  const figures = [...people, andrin];
  batchStatic(world, [andrin, rig, ...figures.flatMap(limbs)]);
  batchStatic(rig, [peel, pz.pizza, ...flameList]);
  for (const f of figures) {
    const { armL, armR, foreL, foreR, head } = f.userData;
    if (f === andrin) batchStatic(f, [armL, armR, head]);
    batchStatic(head);
    batchStatic(armL, [foreL]);
    batchStatic(armR, [foreR]);
    batchStatic(foreL);
    batchStatic(foreR, f.userData.glass ? [f.userData.glass] : []);
  }

  // Farben der Pizza: roh → gebacken
  const doughRaw = pz.dough.color.clone();
  const doughBaked = doughRaw.clone().offsetHSL(-0.01, 0.05, -0.12);
  const crustRaw = pz.crust.color.clone();
  const crustBaked = crustRaw.clone().offsetHSL(-0.01, 0.08, -0.18);
  const cheeseRaw = pz.cheese.color.clone();
  const cheeseBaked = cheeseRaw.clone().offsetHSL(0.01, 0.1, -0.06);

  // Drehen mit dem Finger; danach schwenkt die Kamera langsam zurück
  let drag = 0;
  let dragging = false;
  let lastX = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    drag += (e.clientX - lastX) * 0.01;
    lastX = e.clientX;
  });
  addEventListener('pointerup', () => (dragging = false));
  addEventListener('pointercancel', () => (dragging = false));

  let scroll = 0;
  const born = performance.now();
  let raf = 0;
  let last = performance.now();
  let running = false;
  let dist = 16;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // So weit weg, dass die ganze Insel in die Breite passt
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    dist = Math.max(11, (R + 0.35) / halfW);
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const center = new Vector3(0, 0.75, 0);
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (!dragging) drag *= Math.exp(-dt * 0.35);

    // Kamera: sanftes Hin- und Herschwenken vor dem Stand, beim Laden von oben herein
    const enter = seg((now - born) / 1600, 0, 1);
    const yaw = Math.sin(t * 0.13) * 0.55 + drag;
    const pitch = MathUtils.lerp(0.95, 0.5, enter) + scroll * 0.25;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 0.6, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(center);
    world.position.y = Math.sin(t * 0.8) * 0.06;

    // Backen in Schleife: Schaufel mit Pizza rein, backen, fertige Pizza wieder raus
    const f = (t % 7) / 7;
    const inA = seg(f, 0.05, 0.25);
    const bake = seg(f, 0.25, 0.65);
    const outB = seg(f, 0.68, 0.88);
    const back = seg(f, 0.92, 1);
    peel.position.lerpVectors(PEEL_OUT, PEEL_IN, inA - outB);
    peel.position.y += Math.sin(outB * Math.PI) * 0.04 + outB * 0.06;
    peel.rotation.x = -outB * 0.12;
    pz.pizza.position.set(peel.position.x, peel.position.y + 0.014, peel.position.z);
    pz.pizza.rotation.x = peel.rotation.x;
    pz.pizza.rotation.y = seg(f, 0.4, 0.52) * Math.PI;
    pz.pizza.scale.setScalar(1 - back);
    const b = bake * (1 - back);
    pz.dough.color.copy(doughRaw).lerp(doughBaked, b);
    pz.crust.color.copy(crustRaw).lerp(crustBaked, b);
    pz.cheese.color.copy(cheeseRaw).lerp(cheeseBaked, b * 0.8);
    pz.charSpots.forEach((s, i) => (s.visible = b > 0.35 + (i % 6) * 0.08));
    const heat = 0.75 + bake * (1 - outB) * 0.55;
    flameList.forEach((fl) => {
      const k = 0.75 + Math.sin(now * 0.012 + fl.userData.phase) * 0.18 + Math.sin(now * 0.031 + fl.userData.phase) * 0.08;
      fl.scale.set(1, k * heat, 1);
      fl.position.y = stoneTop + 0.08 + (k * heat * 0.22) / 2 - 0.05;
    });
    fireLight.intensity = (1.6 + Math.sin(now * 0.02) * 0.25) * heat;

    // Andrin hält den Griff der Schaufel
    peel.updateWorldMatrix(true, false);
    peel.localToWorld(handleEnd.set(0, 0.02, 1.3));
    world.worldToLocal(handleEnd);
    andrin.position.set(handleEnd.x + Math.sin(RIG_TURN) * 0.42, 0, handleEnd.z + Math.cos(RIG_TURN) * 0.42);
    andrin.rotation.y = RIG_TURN + Math.PI;

    const cheer = seg(f, 0.84, 0.9) * (1 - seg(f, 0.95, 1));
    for (const p of people) {
      p.userData.cheer = cheer;
      animatePerson(p, now);
    }
    renderer.render(scene, camera);
  };

  return {
    setScroll(v: number) {
      scroll = Math.min(1, Math.max(0, v));
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
  };
}
