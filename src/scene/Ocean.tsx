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
  varying vec3 vWorld;
  varying float vH;

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
    color += vec3(1.0, 0.86, 0.6) * spec * 1.4;
    color += vec3(smoothstep(0.13, 0.2, vH)) * 0.25;
    float dist = length(cameraPosition - vWorld);
    color = mix(color, uFog, smoothstep(30.0, 95.0, dist));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Ocean({ sunDirection }: { sunDirection: THREE.Vector3 }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOffset: { value: BOARD_OFFSET },
      uDeep: { value: new THREE.Color('#06283d') },
      uShallow: { value: new THREE.Color('#1d6b85') },
      uSky: { value: new THREE.Color('#9fc3d8') },
      uSunDir: { value: sunDirection.clone().normalize() },
      uFog: { value: new THREE.Color('#b9cbd6') },
    }),
    [sunDirection],
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
