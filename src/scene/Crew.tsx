import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export type CrewRole = 'walk' | 'wave' | 'helm' | 'haul' | 'lookout';

export type CrewMember = { role: CrewRole; x: number; z: number; span?: number; onCabin?: boolean };

const SKIN = '#e0b08a';
const PALETTES = {
  player: { shirts: ['#f2efe6', '#2f5d8a', '#f2efe6'], trousers: '#3b4b6b', hat: '#b3262e' },
  enemy: { shirts: ['#3a3a40', '#5a1e1e', '#2b2b30'], trousers: '#1d1d22', hat: '#111111' },
};

type Props = Omit<CrewMember, 'onCabin'> & { seed: number; enemy: boolean; deckY: number; overboard?: boolean };

const JUMP = 0.75;
const SWIM = 3.6;
const SUBMERGE = 1.8;
const SWIM_Y = 0.07;
const frac = (n: number) => n - Math.floor(n);

/**
 * A small low-poly sailor with a looping role animation. With `overboard`, the sailor
 * abandons a sinking ship instead: panics on deck, leaps into the sea with a splash,
 * swims for a few seconds and finally slips under, waving.
 */
export function Sailor({ role, x, z, span = 0.6, seed, enemy, deckY, overboard = false }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const palette = enemy ? PALETTES.enemy : PALETTES.player;
  const shirt = palette.shirts[seed % palette.shirts.length]!;
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const abandonedAt = useRef<number | null>(null);
  const dir = z > 0.02 ? 1 : z < -0.02 ? -1 : seed % 2 ? 1 : -1;
  const delay = frac(seed * 0.37) * 0.8;
  const landX = x + (frac(seed * 0.61) - 0.5) * 0.5;
  const landZ = dir * (0.62 + frac(seed * 0.29) * 0.4);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    const r = root.current;
    const b = body.current;
    if (!r || !b || !armL.current || !armR.current || !legL.current || !legR.current) return;
    if (overboard) {
      abandonedAt.current ??= clock.elapsedTime;
      const tau = clock.elapsedTime - abandonedAt.current - delay;
      const splash = (since: number) => {
        if (!ring.current || !ringMat.current) return;
        const k = since / 0.9;
        ring.current.visible = k >= 0 && k < 1;
        ring.current.position.set(r.position.x, 0.13, r.position.z);
        ring.current.scale.setScalar(0.04 + k * 0.22);
        ringMat.current.opacity = 0.85 * (1 - k);
      };
      r.rotation.y = -dir * (Math.PI / 2);
      b.rotation.x = 0;
      if (tau < 0) {
        r.position.set(x, deckY + Math.abs(Math.sin(t * 11)) * 0.03, z);
        b.rotation.z = 0;
        armL.current.rotation.z = 2.8 + Math.sin(t * 14) * 0.35;
        armR.current.rotation.z = 2.8 - Math.sin(t * 14) * 0.35;
        legL.current.rotation.z = 0;
        legR.current.rotation.z = 0;
        splash(-1);
      } else if (tau < JUMP) {
        const u = tau / JUMP;
        r.position.set(x + (landX - x) * u, deckY + (SWIM_Y - deckY) * u + 1.2 * u * (1 - u), z + (landZ - z) * u);
        b.rotation.z = -u * 1.3;
        armL.current.rotation.z = 3;
        armR.current.rotation.z = 3;
        legL.current.rotation.z = 0.5;
        legR.current.rotation.z = -0.5;
        splash(-1);
      } else if (tau < JUMP + SWIM) {
        const s = tau - JUMP;
        r.position.set(landX, SWIM_Y + Math.sin(t * 3) * 0.015, landZ + dir * s * 0.07);
        b.rotation.z = -0.95;
        armL.current.rotation.z = 2.4 + Math.sin(t * 7) * 0.9;
        armR.current.rotation.z = 2.4 - Math.sin(t * 7) * 0.9;
        legL.current.rotation.z = Math.sin(t * 10) * 0.4;
        legR.current.rotation.z = -Math.sin(t * 10) * 0.4;
        splash(s);
        if (s >= 0.9 && ring.current && ringMat.current) {
          ring.current.visible = true;
          ring.current.scale.setScalar(0.09 + Math.sin(t * 4) * 0.01);
          ringMat.current.opacity = 0.45 + Math.sin(t * 4) * 0.1;
        }
      } else if (tau < JUMP + SWIM + SUBMERGE) {
        const v = (tau - JUMP - SWIM) / SUBMERGE;
        r.position.set(landX, SWIM_Y - v * v * 0.6, landZ + dir * SWIM * 0.07);
        b.rotation.z = 0;
        armL.current.rotation.z = 0.3;
        armR.current.rotation.z = 0;
        armR.current.rotation.x = 2.9 + Math.sin(t * 10) * 0.35;
        legL.current.rotation.z = 0;
        legR.current.rotation.z = 0;
        splash(tau - JUMP - SWIM - 0.6);
      } else {
        r.visible = false;
        splash(-1);
      }
      return;
    }
    let swing = 0;
    let armLX = 0;
    let armRX = 0;
    let armRWave = 0;
    let bodyY = 0;
    let lean = 0;
    let heading: number;
    if (role === 'walk') {
      const speed = 0.45;
      const p = Math.sin(t * speed);
      r.position.x = x + p * span;
      heading = Math.cos(t * speed) >= 0 ? 0 : Math.PI;
      swing = Math.sin(t * 7) * 0.6;
      armLX = -swing;
      armRX = swing;
      bodyY = Math.abs(Math.sin(t * 7)) * 0.015;
    } else if (role === 'wave') {
      armRWave = 2.6 + Math.sin(t * 6) * 0.45;
      bodyY = Math.abs(Math.sin(t * 3)) * 0.01;
      heading = (-Math.PI / 2) * Math.sign(z || 1);
    } else if (role === 'helm') {
      lean = Math.sin(t * 0.9) * 0.08;
      armLX = 1.2 + Math.sin(t * 1.4) * 0.25;
      armRX = 1.2 - Math.sin(t * 1.4) * 0.25;
      heading = 0;
    } else if (role === 'haul') {
      const pull = (Math.sin(t * 2.4) + 1) / 2;
      lean = 0.1 + pull * 0.25;
      armLX = 2.4 - pull * 1.2;
      armRX = 2.4 - pull * 1.2;
      heading = Math.PI / 2;
    } else {
      heading = Math.sin(t * 0.5) * 1.4;
      armRX = 1.4;
      armLX = 1.3;
    }
    r.rotation.y = heading;
    b.position.y = bodyY;
    b.rotation.z = lean;
    legL.current.rotation.z = swing;
    legR.current.rotation.z = -swing;
    armL.current.rotation.z = armLX;
    armR.current.rotation.z = armRX;
    armR.current.rotation.x = armRWave;
  });

  return (
    <>
      {overboard && (
        <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.6, 1, 24]} />
          <meshBasicMaterial ref={ringMat} color="#ffffff" transparent depthWrite={false} />
        </mesh>
      )}
      <group ref={root} position={[x, deckY, z]} scale={1.5}>
        <group ref={body}>
          <group ref={legL} position={[0, 0.07, 0.022]}>
            <mesh position-y={-0.035}>
              <boxGeometry args={[0.025, 0.07, 0.025]} />
              <meshStandardMaterial color={palette.trousers} />
            </mesh>
          </group>
          <group ref={legR} position={[0, 0.07, -0.022]}>
            <mesh position-y={-0.035}>
              <boxGeometry args={[0.025, 0.07, 0.025]} />
              <meshStandardMaterial color={palette.trousers} />
            </mesh>
          </group>
          <mesh position-y={0.11}>
            <boxGeometry args={[0.045, 0.085, 0.075]} />
            <meshStandardMaterial color={shirt} />
          </mesh>
          <group ref={armL} position={[0, 0.145, 0.05]}>
            <mesh position-y={-0.035}>
              <boxGeometry args={[0.02, 0.07, 0.02]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
          </group>
          <group ref={armR} position={[0, 0.145, -0.05]}>
            <mesh position-y={-0.035}>
              <boxGeometry args={[0.02, 0.07, 0.02]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            {role === 'lookout' && (
              <mesh position-y={-0.08}>
                <cylinderGeometry args={[0.008, 0.011, 0.07, 6]} />
                <meshStandardMaterial color="#c9a23f" metalness={0.7} roughness={0.3} />
              </mesh>
            )}
          </group>
          <mesh position-y={0.18}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
          <mesh position-y={0.2}>
            <sphereGeometry args={[0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={palette.hat} />
          </mesh>
        </group>
      </group>
    </>
  );
}
