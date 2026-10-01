import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { shipSpec, type Placement, type Side } from '../engine/index.ts';
import { shipTransform, waveHeight } from './layout.ts';

const geometryCache = new Map<number, { hull: THREE.BufferGeometry; deck: THREE.BufferGeometry }>();

function hullGeometry(length: number) {
  const cached = geometryCache.get(length);
  if (cached) return cached;
  const half = length / 2 - 0.08;
  const w = 0.36;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -w * 0.85);
  shape.lineTo(half - 0.55, -w);
  shape.quadraticCurveTo(half - 0.1, -w * 0.7, half, 0);
  shape.quadraticCurveTo(half - 0.1, w * 0.7, half - 0.55, w);
  shape.lineTo(-half, w * 0.85);
  shape.lineTo(-half, -w * 0.85);
  const hull = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  hull.rotateX(-Math.PI / 2);
  hull.translate(0, -0.14, 0);
  const deckShape = new THREE.Shape(shape.getPoints(12).map((p) => new THREE.Vector2(p.x * 0.94, p.y * 0.8)));
  const deck = new THREE.ShapeGeometry(deckShape);
  deck.rotateX(-Math.PI / 2);
  deck.translate(0, 0.26, 0);
  const entry = { hull, deck };
  geometryCache.set(length, entry);
  return entry;
}

const sailGeometry = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 8, 4);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.cos(x * Math.PI) * 0.16 * (0.7 + 0.3 * Math.cos(y * Math.PI)));
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI / 2);
  return g;
})();

type Props = {
  side: Side;
  placement: Placement;
  sunk?: boolean;
  ghost?: 'valid' | 'invalid';
  enemy?: boolean;
};

export function ShipModel({ side, placement, sunk = false, ghost, enemy = false }: Props) {
  const { length } = shipSpec(placement.type);
  const { position, rotationY } = shipTransform(side, placement);
  const { hull, deck } = hullGeometry(length);
  const group = useRef<THREE.Group>(null);
  const sinkProgress = useRef(sunk ? (enemy ? 0 : 1) : 0);
  const flag = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => position[0] * 1.3 + position[2] * 0.7, [position]);

  const masts = length >= 5 ? 3 : length >= 3 ? 2 : 1;
  const mastXs = Array.from({ length: masts }, (_, i) =>
    masts === 1 ? 0.1 : -length / 2 + 0.9 + (i * (length - 1.8)) / (masts - 1),
  );

  const opacity = ghost ? 0.55 : 1;
  const tintHull = ghost ? (ghost === 'valid' ? '#4caf7a' : '#d9534f') : sunk ? '#2b1d14' : enemy ? '#4a2c1a' : '#6b3f1f';
  const tintSail = ghost ? (ghost === 'valid' ? '#c8f0d8' : '#f5c6c4') : sunk ? '#4b4540' : enemy ? '#2f2f36' : '#f1e6c8';
  const flagColor = enemy ? '#1b1b1b' : '#b3262e';

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (sunk) sinkProgress.current = Math.min(1, sinkProgress.current + delta * 0.6);
    const s = sinkProgress.current;
    const bob = ghost ? 0.05 : waveHeight(position[0], position[2], t);
    g.position.set(position[0], bob - s * 0.42, position[2]);
    g.rotation.set(Math.sin(t * 0.8 + phase) * 0.03 + s * 0.28, rotationY, Math.cos(t * 0.7 + phase) * 0.02 + s * 0.12);
    if (flag.current) flag.current.rotation.y = Math.sin(t * 3 + phase) * 0.35;
  });

  const transparent = !!ghost;
  return (
    <group ref={group} position={position} rotation-y={rotationY}>
      <mesh geometry={hull} castShadow>
        <meshStandardMaterial color={tintHull} roughness={0.75} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh geometry={deck}>
        <meshStandardMaterial color={sunk ? '#3a2a1f' : '#b0835a'} roughness={0.9} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[-length / 2 + 0.38, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.56]} />
        <meshStandardMaterial color={tintHull} roughness={0.7} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[length - 0.5, 0.05, 0.74]} />
        <meshStandardMaterial color={ghost ? tintHull : '#c9a23f'} metalness={0.6} roughness={0.4} transparent={transparent} opacity={opacity} />
      </mesh>
      {mastXs.map((x, i) => {
        const tall = i === Math.floor(masts / 2) ? 1.45 : 1.15;
        return (
          <group key={i} position={[x, 0.26, 0]}>
            <mesh position-y={tall / 2}>
              <cylinderGeometry args={[0.03, 0.04, tall, 6]} />
              <meshStandardMaterial color="#3d2614" transparent={transparent} opacity={opacity} />
            </mesh>
            {!sunk || i === 0 ? (
              <>
                <mesh geometry={sailGeometry} position={[0.04, tall * 0.42, 0]} scale={[1, tall * 0.42, 0.72]}>
                  <meshStandardMaterial color={tintSail} side={THREE.DoubleSide} roughness={0.95} transparent={transparent} opacity={opacity} />
                </mesh>
                <mesh geometry={sailGeometry} position={[0.04, tall * 0.8, 0]} scale={[1, tall * 0.26, 0.56]}>
                  <meshStandardMaterial color={tintSail} side={THREE.DoubleSide} roughness={0.95} transparent={transparent} opacity={opacity} />
                </mesh>
              </>
            ) : null}
            {i === Math.floor(masts / 2) && !sunk && (
              <mesh ref={flag} position={[0, tall + 0.08, 0]}>
                <planeGeometry args={[0.32, 0.16]} />
                <meshStandardMaterial color={flagColor} side={THREE.DoubleSide} transparent={transparent} opacity={opacity} />
              </mesh>
            )}
          </group>
        );
      })}
      {!ghost &&
        Array.from({ length: Math.max(1, length - 1) }, (_, i) => (
          <group key={i}>
            {[-1, 1].map((sz) => (
              <mesh key={sz} position={[-length / 2 + 0.7 + i * 0.9, 0.05, sz * 0.38]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.035, 0.045, 0.14, 8]} />
                <meshStandardMaterial color="#1c1c1c" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
    </group>
  );
}
