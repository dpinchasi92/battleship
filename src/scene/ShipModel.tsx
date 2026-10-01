import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { shipSpec, type Placement, type Side } from '../engine/index.ts';
import { Sailor } from './Crew.tsx';
import { crewFor } from './crewLayout.ts';
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

const UP = new THREE.Vector3(0, 1, 0);
const GOLD = '#d4a640';
const DECK_Y = 0.26;

/** A thin cylinder stretched between two points: rigging, stays and the bowsprit. */
function Rope({ from, to, radius = 0.006, color = '#2a1c10' }: { from: [number, number, number]; to: [number, number, number]; radius?: number; color?: string }) {
  const { mid, len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      len: dir.length(),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 4]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

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

  const half = length / 2;
  const mainIndex = Math.floor(masts / 2);
  const mainTall = 1.45;
  const mastTall = (i: number) => (i === mainIndex ? mainTall : 1.15);
  const crew = useMemo(() => crewFor(length, mastXs[mainIndex]!), [length, mastXs, mainIndex]);
  const decorated = !ghost && !sunk;
  const [crewCanAbandon] = useState(() => !ghost && (!sunk || enemy));

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
    <>
      {sunk && crewCanAbandon && (
        <group position={position} rotation-y={rotationY}>
          {crew.map((c, i) => (
            <Sailor
              key={i}
              role={c.role}
              x={c.x}
              z={c.z}
              seed={i + length * 3}
              enemy={enemy}
              deckY={c.role === 'lookout' ? DECK_Y + mainTall * 0.9 : c.onCabin ? 0.55 : DECK_Y}
              overboard
            />
          ))}
        </group>
      )}
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
          const tall = mastTall(i);
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
        {decorated && (
          <>
            {[-1, 1].map((sz) => (
              <mesh key={sz} position={[0.1, DECK_Y + 0.05, sz * 0.27]}>
                <boxGeometry args={[length - 1.1, 0.025, 0.025]} />
                <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
            <Rope from={[half - 0.2, DECK_Y + 0.02, 0]} to={[half + 0.32, DECK_Y + 0.26, 0]} radius={0.022} color="#3d2614" />
            <mesh position={[half - 0.04, 0.16, 0]}>
              <sphereGeometry args={[0.065, 12, 10]} />
              <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
            </mesh>
            {[-0.16, 0, 0.16].map((z) => (
              <mesh key={z} position={[-half + 0.12, 0.42, z]}>
                <boxGeometry args={[0.02, 0.08, 0.07]} />
                <meshStandardMaterial color="#ffcf6b" emissive="#ffb347" emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            ))}
            <mesh position={[-half + 0.1, 0.72, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.2, 4]} />
              <meshStandardMaterial color="#1c1c1c" />
            </mesh>
            <mesh position={[-half + 0.1, 0.84, 0]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#ffd27a" emissive="#ffae3b" emissiveIntensity={2.2} toneMapped={false} />
            </mesh>
            <mesh position={[-half + 0.52, 0.66, 0]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.055, 0.008, 6, 14]} />
              <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
            </mesh>
            {mastXs.map((x, i) => {
              const top = DECK_Y + mastTall(i) * 0.98;
              return (
                <group key={i}>
                  <Rope from={[x, top, 0]} to={[i === masts - 1 ? half + 0.3 : mastXs[i + 1]!, i === masts - 1 ? DECK_Y + 0.25 : DECK_Y + 0.1, 0]} />
                  {[-1, 1].map((sz) => (
                    <Rope key={sz} from={[x, top - 0.05, 0]} to={[x - 0.12, DECK_Y + 0.06, sz * 0.27]} />
                  ))}
                </group>
              );
            })}
            <Rope from={[mastXs[0]!, DECK_Y + mastTall(0) * 0.9, 0]} to={[-half + 0.1, DECK_Y + 0.35, 0]} />
            {length >= 4 && (
              <mesh position={[mastXs[mainIndex]!, DECK_Y + mainTall * 0.93, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 0.07, 12, 1, true]} />
                <meshStandardMaterial color="#5a3a1e" side={THREE.DoubleSide} />
              </mesh>
            )}
            {crew.map((c, i) => (
              <Sailor
                key={i}
                role={c.role}
                x={c.x}
                z={c.z}
                span={c.span}
                seed={i + length * 3}
                enemy={enemy}
                deckY={c.role === 'lookout' ? DECK_Y + mainTall * 0.9 : c.onCabin ? 0.55 : DECK_Y}
              />
            ))}
          </>
        )}
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
    </>
  );
}
