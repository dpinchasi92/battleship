import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const RAIN_DROPS = 1100;
const RAIN_BOX = { x: 26, zMin: -18, zMax: 16, top: 18 };
const STREAK = 0.55;
const WIND = 0.14;

/** Wind-slanted rain streaks that fall through a box around both boards and wrap at the sea. */
export function Rain() {
  const lines = useMemo(() => {
    const positions = new Float32Array(RAIN_DROPS * 6);
    for (let i = 0; i < RAIN_DROPS; i++) {
      const x = (hash(i) * 2 - 1) * RAIN_BOX.x;
      const y = hash(i + 0.5) * RAIN_BOX.top;
      const z = RAIN_BOX.zMin + hash(i + 0.25) * (RAIN_BOX.zMax - RAIN_BOX.zMin);
      positions.set([x, y, z, x + WIND, y + STREAK, z], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: '#d4dde6', transparent: true, opacity: 0.42, depthWrite: false });
    return new THREE.LineSegments(geometry, material);
  }, []);

  useFrame((_, delta) => {
    const attr = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const p = attr.array as Float32Array;
    const fall = Math.min(delta, 0.1) * 17;
    for (let i = 0; i < RAIN_DROPS; i++) {
      const o = i * 6;
      let y = p[o + 1]! - fall;
      let x = p[o]! - fall * WIND * 1.8;
      if (y < 0) {
        y += RAIN_BOX.top;
        x = (hash(i + y) * 2 - 1) * RAIN_BOX.x;
      }
      p[o] = x;
      p[o + 1] = y;
      p[o + 3] = x + WIND;
      p[o + 4] = y + STREAK;
    }
    attr.needsUpdate = true;
  });

  return <primitive object={lines} />;
}

const flashEnvelope = (dt: number) => {
  if (dt < 0.07) return 1;
  if (dt < 0.14) return 0.15;
  if (dt < 0.22) return 0.85;
  return Math.max(0, 0.85 - (dt - 0.22) * 2.6);
};

/** Distant lightning: a jagged bolt on the horizon and a flash of cold light, followed by thunder. */
export function Lightning({ flash, onStrike }: { flash: { value: number }; onStrike?: () => void }) {
  const light = useRef<THREE.AmbientLight>(null);
  const next = useRef<number | null>(null);
  const last = useRef(-10);
  const strikes = useRef(0);
  const bolt = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color: '#f2f6ff', transparent: true, fog: false, toneMapped: false });
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    return line;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    next.current ??= t + 2.5;
    if (t >= next.current) {
      const n = ++strikes.current;
      last.current = t;
      next.current = t + 5 + hash(n) * 7;
      const attr = bolt.geometry.getAttribute('position') as THREE.BufferAttribute;
      let x = (hash(n + 0.3) * 2 - 1) * 45;
      const z = -55 - hash(n + 0.7) * 25;
      for (let i = 0; i < 14; i++) {
        attr.setXYZ(i, x, 34 - (i * 34) / 13, z);
        x += (hash(n * 13 + i) - 0.5) * 4;
      }
      attr.needsUpdate = true;
      onStrike?.();
    }
    const env = flashEnvelope(t - last.current);
    if (light.current) light.current.intensity = env * 2.4;
    flash.value = env;
    bolt.visible = env > 0.3;
    (bolt.material as THREE.LineBasicMaterial).opacity = env;
  });

  return (
    <>
      <ambientLight ref={light} color="#dfe8ff" intensity={0} />
      <primitive object={bolt} />
    </>
  );
}

/** A full moon with a soft halo and a starfield for night battles. */
export function NightSky({ moonPosition, stars }: { moonPosition: [number, number, number]; stars: boolean }) {
  return (
    <>
      {stars && <Stars radius={160} depth={60} count={2600} factor={5} saturation={0} fade speed={0.4} />}
      <group position={moonPosition}>
        <mesh>
          <sphereGeometry args={[4.5, 32, 24]} />
          <meshBasicMaterial color="#f6f1dc" fog={false} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[9, 32, 24]} />
          <meshBasicMaterial color="#9fb4ff" transparent opacity={0.12} depthWrite={false} fog={false} />
        </mesh>
      </group>
    </>
  );
}
