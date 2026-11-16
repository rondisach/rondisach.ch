// Kleine Teilchen für den Schluss am Ofen: Funken aus der Öffnung und Dampf über der fertigen Pizza.
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';

export interface Puffs {
  points: Points;
  /** Teilchen bewegen. `strength` 0–1 blendet alle ein und aus, `origin` ist die Quelle in Weltkoordinaten. */
  update(time: number, strength: number, origin: Vector3): void;
}

interface PuffOptions {
  count: number;
  color: number;
  /** Funken leuchten (additiv), Dampf nicht. */
  glow: boolean;
  size: number;
  /** Steighöhe und seitliche Streuung in Metern. */
  rise: number;
  spread: number;
  /** Dauer eines Durchlaufs in Millisekunden. */
  life: number;
}

export function buildPuffs({ count, color, glow, size, rise, spread, life }: PuffOptions): Puffs {
  const pos = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const scale = new Float32Array(count);
  const seeds = Array.from({ length: count }, (_, i) => ({
    phase: i / count + Math.random() * 0.1,
    angle: Math.random() * Math.PI * 2,
    reach: 0.3 + Math.random() * 0.7,
    wobble: Math.random() * Math.PI * 2,
    speed: 0.7 + Math.random() * 0.6,
  }));
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new BufferAttribute(alpha, 1));
  geo.setAttribute('scale', new BufferAttribute(scale, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: glow ? AdditiveBlending : NormalBlending,
    uniforms: { color: { value: new Color(color) }, size: { value: size }, soft: { value: glow ? 0.15 : 0.0 } },
    vertexShader: /* glsl */ `
      attribute float alpha; attribute float scale;
      uniform float size;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float soft;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, soft, d) * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(color, a);
      }`,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;

  return {
    points,
    update(time, strength, origin) {
      points.visible = strength > 0.01;
      if (!points.visible) return;
      mat.uniforms.size.value = size * (points.userData.pixelScale ?? 1);
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const t = (time / life) * s.speed + s.phase;
        const k = t - Math.floor(t);
        const drift = Math.sin(time * 0.002 + s.wobble) * 0.25;
        pos[i * 3] = origin.x + Math.cos(s.angle + drift) * spread * s.reach * (glow ? k : 0.4 + k * 0.6);
        pos[i * 3 + 1] = origin.y + k * rise * (0.6 + s.reach * 0.4);
        pos[i * 3 + 2] = origin.z + Math.sin(s.angle + drift) * spread * s.reach * (glow ? k : 0.4 + k * 0.6);
        // Ein- und ausblenden über die Lebensdauer
        alpha[i] = Math.sin(k * Math.PI) * strength * (glow ? 1 : 0.34);
        scale[i] = glow ? 1 - k * 0.6 : 0.5 + k * 1.3;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      geo.attributes.scale.needsUpdate = true;
    },
  };
}
