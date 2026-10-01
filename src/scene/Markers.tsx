import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CellView } from '../app/cells.ts';
import { fromIndex, type Side } from '../engine/index.ts';
import { cellPosition, waveHeight } from './layout.ts';

export function Markers({ side, views }: { side: Side; views: readonly CellView[] }) {
  return (
    <group>
      {views.map((v, i) => {
        if (v.visual !== 'miss' && v.visual !== 'hit' && v.visual !== 'sunk') return null;
        const pos = cellPosition(side, fromIndex(i));
        if (v.visual === 'miss') return <MissPeg key={i} position={pos} />;
        return <Fire key={i} position={pos} small={v.visual === 'sunk'} seed={i} />;
      })}
    </group>
  );
}

function MissPeg({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) ref.current.position.y = waveHeight(position[0], position[2], t) + 0.05;
    if (ring.current) {
      const s = 1 + ((t * 0.6 + position[0]) % 1) * 0.6;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1.6 - s);
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh position-y={0.12}>
        <cylinderGeometry args={[0.11, 0.13, 0.3, 12]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.4} />
      </mesh>
      <mesh position-y={0.3}>
        <sphereGeometry args={[0.11, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.22, 0.28, 24]} />
        <meshBasicMaterial color="#e8f4ff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Fire({ position, small, seed }: { position: [number, number, number]; small: boolean; seed: number }) {
  const flames = useRef<THREE.Group>(null);
  const smoke = useRef<THREE.Group>(null);
  const offsets = useMemo(() => [0, 0.33, 0.66].map((o) => (o + seed * 0.137) % 1), [seed]);
  const scale = small ? 0.55 : 1;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current?.children.forEach((child, i) => {
      const f = 0.75 + 0.35 * Math.sin(t * (9 + i * 3) + seed + i);
      child.scale.set(f, f * (1.1 + 0.3 * Math.sin(t * 7 + i)), f);
    });
    smoke.current?.children.forEach((child, i) => {
      const p = (t * 0.45 + offsets[i]!) % 1;
      child.position.set(Math.sin(p * 3 + i) * 0.15, 0.45 + p * 1.6, Math.cos(p * 2 + i) * 0.1);
      const s = 0.18 + p * 0.45;
      child.scale.set(s, s, s);
      ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - p);
    });
  });
  return (
    <group position={[position[0], 0.28, position[2]]} scale={scale}>
      <group ref={flames}>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.2, 0.55, 8]} />
          <meshBasicMaterial color="#ff7b1c" toneMapped={false} />
        </mesh>
        <mesh position={[0.1, 0.05, 0.08]}>
          <coneGeometry args={[0.12, 0.38, 8]} />
          <meshBasicMaterial color="#ffd23f" toneMapped={false} />
        </mesh>
        <mesh position={[-0.1, 0.04, -0.06]}>
          <coneGeometry args={[0.11, 0.32, 8]} />
          <meshBasicMaterial color="#ff4d1a" toneMapped={false} />
        </mesh>
      </group>
      <group ref={smoke}>
        {offsets.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#3a3633" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight color="#ff8a3d" intensity={small ? 0.6 : 1.6} distance={2.2} decay={2} />
    </group>
  );
}
