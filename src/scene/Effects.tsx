import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ShotEvent, Volley } from '../app/useBattle.ts';
import { opponent } from '../engine/index.ts';
import { boardX, cellPosition } from './layout.ts';

/** Cannonball arcing from the shooter's side of the sea to the target cell. */
export function Cannonball({ volley }: { volley: Volley }) {
  const ball = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const targetSide = opponent(volley.by);
  const [tx, , tz] = cellPosition(targetSide, volley.coord);
  const from = useMemo(() => {
    const shooterX = boardX(volley.by);
    return new THREE.Vector3(shooterX + Math.sign(tx - shooterX) * 5.4, 0.7, tz * 0.6);
  }, [volley.by, tx, tz]);
  const to = useMemo(() => new THREE.Vector3(tx, 0.15, tz), [tx, tz]);
  const height = 3 + from.distanceTo(to) * 0.18;

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const p = Math.min(1, (clock.elapsedTime - start.current) / (volley.duration / 1000));
    if (ball.current) {
      ball.current.position.lerpVectors(from, to, p);
      ball.current.position.y += Math.sin(p * Math.PI) * height;
    }
    if (flash.current) {
      const f = Math.max(0, 1 - p * 5);
      flash.current.scale.setScalar(0.2 + (1 - f) * 0.9);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = f;
    }
  });

  return (
    <group>
      <mesh ref={ball} position={from}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} emissive="#ff6a00" emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={flash} position={from}>
        <sphereGeometry args={[0.6, 16, 12]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

type Burst = { id: number; position: THREE.Vector3; kind: 'splash' | 'explosion' };

const PARTICLES = 28;

const jitter = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const LIFE = 1.3;

/** Spawns a splash or explosion burst for each landed shot. */
export function ImpactBursts({ lastShot, onShake }: { lastShot: ShotEvent | null; onShake: (amount: number) => void }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!lastShot || seen.current === lastShot.id) return;
    seen.current = lastShot.id;
    const [x, , z] = cellPosition(opponent(lastShot.by), lastShot.coord);
    const kind = lastShot.result.kind === 'miss' ? 'splash' : 'explosion';
    const burst: Burst = { id: lastShot.id, position: new THREE.Vector3(x, 0.2, z), kind };
    setBursts((b) => [...b, burst]);
    if (kind === 'explosion') onShake(lastShot.result.kind === 'sunk' ? 0.35 : 0.18);
    const id = setTimeout(() => setBursts((b) => b.filter((x) => x.id !== burst.id)), LIFE * 1000 + 200);
    return () => clearTimeout(id);
  }, [lastShot, onShake]);
  return (
    <>
      {bursts.map((b) => (
        <BurstParticles key={b.id} burst={b} />
      ))}
    </>
  );
}

function BurstParticles({ burst }: { burst: Burst }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const start = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const velocities = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const a = (i / PARTICLES) * Math.PI * 2 + jitter(burst.id * 97 + i) * 0.4;
        const spread = burst.kind === 'splash' ? 0.9 + jitter(burst.id * 31 + i) * 0.8 : 1.4 + jitter(burst.id * 31 + i) * 1.6;
        const up = burst.kind === 'splash' ? 3.5 + jitter(burst.id * 53 + i) * 2.5 : 2 + jitter(burst.id * 53 + i) * 3;
        return new THREE.Vector3(Math.cos(a) * spread, up, Math.sin(a) * spread);
      }),
    [burst.kind, burst.id],
  );
  const color = burst.kind === 'splash' ? '#e6f4ff' : '#ff8c2a';

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    const m = mesh.current;
    if (!m) return;
    const life = Math.min(1, t / LIFE);
    velocities.forEach((v, i) => {
      dummy.position.set(
        burst.position.x + v.x * t,
        Math.max(0, burst.position.y + v.y * t - 4.9 * t * t),
        burst.position.z + v.z * t,
      );
      const s = (burst.kind === 'splash' ? 0.09 : 0.13) * (1 - life * 0.8);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    (m.material as THREE.MeshBasicMaterial).opacity = 1 - life;
    if (light.current) light.current.intensity = burst.kind === 'explosion' ? Math.max(0, 8 * (1 - t * 3)) : 0;
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLES]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} depthWrite={false} />
      </instancedMesh>
      <pointLight ref={light} position={[burst.position.x, 1, burst.position.z]} color="#ff9a3c" distance={6} intensity={0} />
    </group>
  );
}
