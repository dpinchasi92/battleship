import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BOARD_OFFSET } from './layout.ts';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uOffset;
  varying vec3 vWorld;
  varying float vH;

  float damping(vec2 p) {
    float d1 = max(abs(p.x + uOffset) - 5.0, abs(p.y) - 5.0);
    float d2 = max(abs(p.x - uOffset) - 5.0, abs(p.y) - 5.0);
    return 0.25 + 0.75 * smoothstep(0.0, 4.0, min(d1, d2));
  }

  float wave(vec2 p, float t) {
    return (sin(p.x * 0.35 + t * 0.9) * 0.12 + sin(p.y * 0.5 + t * 1.1) * 0.08 + sin((p.x + p.y) * 0.8 + t * 1.7) * 0.04) * damping(p);
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float h = wave(world.xz, uTime);
    world.y += h;
    vWorld = world.xyz;
    vH = h;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uFog;
  uniform vec3 uSpec;
  uniform float uSpecStrength;
  uniform vec2 uFogRange;
  uniform float uOffset;
  uniform vec3 uGlintDir;
  uniform float uHorizon;
  uniform float uGlow;
  uniform float uCloud;
  uniform float uMist;
  uniform float uFlash;
  varying vec3 vWorld;
  varying float vH;

  float hash(vec2 q) {
    return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 q) {
    vec2 i = floor(q);
    vec2 f = fract(q);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 q) {
    return noise(q) * 0.55 + noise(q * 2.1 + 3.7) * 0.3 + noise(q * 4.3 + 9.1) * 0.15;
  }

  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;
    float dx = cos(p.x * 0.35 + t * 0.9) * 0.042 + cos((p.x + p.y) * 0.8 + t * 1.7) * 0.032
      + cos(p.x * 3.1 + t * 2.0) * sin(p.y * 2.7 - t * 1.6) * 0.06;
    float dz = cos(p.y * 0.5 + t * 1.1) * 0.04 + cos((p.x + p.y) * 0.8 + t * 1.7) * 0.032
      + sin(p.x * 3.1 + t * 2.0) * cos(p.y * 2.7 - t * 1.6) * 0.055;
    vec3 n = normalize(vec3(-dx, 1.0, -dz));
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    vec3 color = mix(uDeep, uShallow, clamp(vH * 3.0 + 0.45, 0.0, 1.0));
    color = mix(color, uSky, fresnel * 0.55);
    float spec = pow(max(dot(reflect(-uSunDir, n), viewDir), 0.0), 120.0);
    vec3 swell = normalize(vec3(-cos(p.x * 0.35 + t * 0.9) * 0.042, 1.0, -cos(p.y * 0.5 + t * 1.1) * 0.04));
    float glow = pow(max(dot(reflect(-uGlintDir, swell), viewDir), 0.0), 22.0);
    float glitter = 0.55 + 0.9 * smoothstep(0.55, 0.9, noise(p * 1.3 + vec2(t * 0.4, -t * 0.3)));
    color += uSpec * (spec * uSpecStrength + glow * glitter * uGlow);
    float shade = smoothstep(0.42, 0.75, fbm(p * 0.04 + vec2(t * 0.025, t * 0.012)));
    color *= 1.0 - uCloud * shade * 0.5;
    float d1 = max(abs(p.x + uOffset) - 5.0, abs(p.y) - 5.0);
    float d2 = max(abs(p.x - uOffset) - 5.0, abs(p.y) - 5.0);
    float open = smoothstep(0.0, 3.0, min(d1, d2));
    float wisps = smoothstep(0.38, 0.8, fbm(p * 0.09 + vec2(t * 0.06, t * 0.015)));
    color = mix(color, uFog, uMist * wisps * open);
    color += vec3(0.72, 0.78, 0.95) * uFlash * 0.3;
    color += vec3(smoothstep(0.13, 0.2, vH)) * 0.25;
    float dist = length(cameraPosition - vWorld);
    color = mix(color, uSky, smoothstep(16.0, 60.0, dist) * uHorizon);
    color = mix(color, uFog, smoothstep(uFogRange.x, uFogRange.y, dist));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

type OceanLook = {
  deep: string;
  shallow: string;
  sky: string;
  spec: string;
  specStrength: number;
  horizon: number;
  glow: number;
  cloud: number;
  mist: number;
};

type Props = {
  sunDirection: THREE.Vector3;
  glintDirection: THREE.Vector3;
  look: OceanLook;
  fog: { color: string; near: number; far: number };
  flash: { value: number };
};

export function Ocean({ sunDirection, glintDirection, look, fog, flash }: Props) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOffset: { value: BOARD_OFFSET },
      uDeep: { value: new THREE.Color(look.deep) },
      uShallow: { value: new THREE.Color(look.shallow) },
      uSky: { value: new THREE.Color(look.sky) },
      uSunDir: { value: sunDirection.clone().normalize() },
      uFog: { value: new THREE.Color(fog.color) },
      uSpec: { value: new THREE.Color(look.spec) },
      uSpecStrength: { value: look.specStrength },
      uFogRange: { value: new THREE.Vector2(Math.max(fog.near - 5, 0), fog.far - 15) },
      uGlintDir: { value: glintDirection.clone().normalize() },
      uHorizon: { value: look.horizon },
      uGlow: { value: look.glow },
      uCloud: { value: look.cloud },
      uMist: { value: look.mist },
      uFlash: flash,
    }),
    [sunDirection, glintDirection, look, fog, flash],
  );
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime!.value = clock.elapsedTime;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
      <planeGeometry args={[240, 240, 220, 220]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
