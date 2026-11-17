// Fasst unbewegte Teile zu wenigen grossen Netzen zusammen – gleiches Aussehen, gleiche Schatten, aber viel weniger Zeichenaufrufe.
// Der Garten besteht aus über 2000 Einzelteilen; jedes kostet pro Bild (und nochmals für den Schatten) einen eigenen Aufruf.
import { BufferAttribute, BufferGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TEXTURE_SLOTS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
] as const;

type StdMesh = Mesh<BufferGeometry, MeshStandardMaterial>;

function batchable(o: Object3D): o is StdMesh {
  if (!(o instanceof Mesh) || o instanceof InstancedMesh || Array.isArray(o.material)) return false;
  const m = o.material;
  // Nur das einfache Standardmaterial, ohne Bilder, Transparenz oder Farbverläufe
  if (!(m instanceof MeshStandardMaterial) || m.type !== 'MeshStandardMaterial') return false;
  if (TEXTURE_SLOTS.some((k) => m[k])) return false;
  if (m.transparent || m.opacity < 1 || m.vertexColors || m.wireframe || !m.depthWrite || !m.depthTest || m.alphaTest > 0) return false;
  if (o.renderOrder !== 0 || !o.frustumCulled || o.morphTargetInfluences) return false;
  const a = o.geometry.attributes;
  return !!a.position && !!a.normal && !o.geometry.morphAttributes.position;
}

/**
 * Teile mit gleichem Schlüssel dürfen in ein Netz. Die Farbe gehört nicht dazu:
 * Sie wandert als Eckpunktfarbe ins Netz, so passen z. B. Holz, Blätter und Steine mit gleicher Oberfläche zusammen.
 */
function key(o: StdMesh) {
  const m = o.material;
  return [
    m.emissive.getHex(),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.flatShading,
    m.side,
    m.fog,
    m.polygonOffset,
    m.polygonOffsetFactor,
    m.polygonOffsetUnits,
    m.colorWrite,
    o.castShadow,
    o.receiveShadow,
  ].join('|');
}

/** Umlaufsinn umdrehen (für gespiegelte Teile), damit Vorder- und Rückseite stimmen. */
function flipWinding(g: BufferGeometry) {
  for (const name of ['position', 'normal']) {
    const a = g.attributes[name].array as Float32Array;
    for (let i = 0; i < a.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = a[i + 3 + k];
        a[i + 3 + k] = a[i + 6 + k];
        a[i + 6 + k] = t;
      }
    }
  }
}

/**
 * Fasst alle unbewegten Teile unter `root` zusammen. Was in `dynamic` steht (samt allem darunter), bleibt unangetastet.
 * Die neuen Netze hängen an `root` und bewegen sich mit ihm. Teile mit Kindern bleiben als leerer Halter stehen.
 */
export function batchStatic(root: Object3D, dynamic: Object3D[] = []) {
  const skip = new Set(dynamic);
  const groups = new Map<string, { source: StdMesh; parts: BufferGeometry[] }>();
  const done: StdMesh[] = [];
  root.updateWorldMatrix(true, true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const local = new Matrix4();

  const visit = (o: Object3D) => {
    if (skip.has(o) || !o.visible) return;
    if (o !== root && batchable(o)) {
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const g = new BufferGeometry();
      g.setAttribute('position', (src.attributes.position as BufferAttribute).clone());
      g.setAttribute('normal', (src.attributes.normal as BufferAttribute).clone());
      if (src !== o.geometry) src.dispose();
      // Materialfarbe (bereits linear) als Eckpunktfarbe – ergibt genau denselben Farbton
      const { r, g: gr, b } = o.material.color;
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        col[i * 3] = r;
        col[i * 3 + 1] = gr;
        col[i * 3 + 2] = b;
      }
      g.setAttribute('color', new BufferAttribute(col, 3));
      local.multiplyMatrices(toRoot, o.matrixWorld);
      g.applyMatrix4(local);
      if (local.determinant() < 0) flipWinding(g);
      const k = key(o);
      let entry = groups.get(k);
      if (!entry) groups.set(k, (entry = { source: o, parts: [] }));
      entry.parts.push(g);
      done.push(o);
    }
    for (const c of [...o.children]) visit(c);
  };
  visit(root);
  if (done.length < 2) {
    return { before: done.length, after: done.length };
  }

  for (const m of done) {
    if (m.children.length) {
      // Bleibt als unsichtbarer Halter für seine Kinder
      const empty = new BufferGeometry();
      m.geometry = empty;
      m.castShadow = m.receiveShadow = false;
      m.visible = true;
      m.layers.disableAll();
    } else {
      m.removeFromParent();
    }
  }
  for (const { source, parts } of groups.values()) {
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const material = source.material.clone();
    material.color.setRGB(1, 1, 1);
    material.vertexColors = true;
    const mesh = new Mesh(merged, material);
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
  return { before: done.length, after: groups.size };
}
