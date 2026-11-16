// Fasst alle unbewegten Teile der Szene zu wenigen grossen Netzen zusammen.
// Der Garten besteht aus fast 2000 Einzelteilen; jedes kostet pro Bild einen Zeichenaufruf. Zusammengefasst sind es noch ein paar Dutzend.
import { BufferAttribute, BufferGeometry, InstancedMesh, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Zwei Materialien mit gleichem Schlüssel sehen gleich aus und dürfen zusammengefasst werden. */
function key(m: MeshStandardMaterial, mesh: Mesh) {
  return [
    m.color.getHex(),
    m.roughness,
    m.metalness,
    m.emissive.getHex(),
    m.emissiveIntensity,
    m.flatShading,
    m.side,
    m.fog,
    mesh.castShadow,
    mesh.receiveShadow,
  ].join('|');
}

function batchable(o: Object3D): o is Mesh<BufferGeometry, MeshStandardMaterial> {
  if (!(o instanceof Mesh) || o instanceof InstancedMesh || Array.isArray(o.material)) return false;
  const m = o.material;
  if (!(m instanceof MeshStandardMaterial)) return false;
  if (m.map || m.transparent || m.vertexColors || m.opacity < 1 || !m.depthWrite) return false;
  return !!o.geometry.attributes.position && !!o.geometry.attributes.normal;
}

/** Alles unter `root` zusammenfassen, ausser den Ästen in `dynamic` (Dinge, die sich bewegen). */
export function batchStatic(root: Object3D, dynamic: Object3D[]) {
  const skip = new Set(dynamic);
  const groups = new Map<string, { material: MeshStandardMaterial; cast: boolean; receive: boolean; parts: BufferGeometry[] }>();
  const done: Mesh[] = [];
  root.updateMatrixWorld(true);

  const visit = (o: Object3D) => {
    if (skip.has(o) || !o.visible) return;
    if (batchable(o)) {
      // Nur Lage und Normalen behalten, in Weltkoordinaten umrechnen
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const g = new BufferGeometry();
      g.setAttribute('position', (src.attributes.position as BufferAttribute).clone());
      g.setAttribute('normal', (src.attributes.normal as BufferAttribute).clone());
      g.applyMatrix4(o.matrixWorld);
      if (o.matrixWorld.determinant() < 0) {
        // Gespiegelte Teile: Umlaufsinn der Dreiecke umdrehen
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
      if (src !== o.geometry) src.dispose();
      const k = key(o.material, o);
      let entry = groups.get(k);
      if (!entry) groups.set(k, (entry = { material: o.material, cast: o.castShadow, receive: o.receiveShadow, parts: [] }));
      entry.parts.push(g);
      done.push(o);
    }
    // Kinder eines zusammengefassten Teils bleiben an ihrem Platz und werden selbst geprüft
    for (const c of o.children) visit(c);
  };
  visit(root);

  for (const m of done) {
    // Kinder behalten ihren Elternteil nur, wenn es welche gibt – sonst ganz entfernen
    if (m.children.length) {
      m.geometry.dispose();
      m.geometry = new BufferGeometry();
      m.castShadow = m.receiveShadow = false;
    } else {
      m.geometry.dispose();
      m.removeFromParent();
    }
  }
  for (const { material, cast, receive, parts } of groups.values()) {
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) continue;
    const mesh = new Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
  return { before: done.length, after: groups.size };
}
