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

type Props = Omit<CrewMember, 'onCabin'> & { seed: number; enemy: boolean; deckY: number };

/** A small low-poly sailor with a looping role animation. */
export function Sailor({ role, x, z, span = 0.6, seed, enemy, deckY }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const palette = enemy ? PALETTES.enemy : PALETTES.player;
  const shirt = palette.shirts[seed % palette.shirts.length]!;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    const r = root.current;
    const b = body.current;
    if (!r || !b || !armL.current || !armR.current || !legL.current || !legR.current) return;
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
  );
}
