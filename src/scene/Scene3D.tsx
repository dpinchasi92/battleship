import { Sky } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BoardGrid } from './BoardGrid.tsx';
import { CameraRig } from './CameraRig.tsx';
import { Cannonball, ImpactBursts } from './Effects.tsx';
import { Markers } from './Markers.tsx';
import { Ocean } from './Ocean.tsx';
import { ShipModel } from './ShipModel.tsx';
import type { SceneProps } from './types.ts';

const SUN = new THREE.Vector3(-60, 18, -100);

export default function Scene3D(props: SceneProps) {
  const shake = useRef(0);
  const onShake = useCallback((amount: number) => {
    shake.current = Math.max(shake.current, amount);
  }, []);
  const sunDir = useMemo(() => SUN.clone().normalize(), []);
  const ghostPlacement = props.ghost && props.mode === 'setup' ? props.ghost : null;

  return (
    <Canvas
      camera={{ position: [0, 20, 16], fov: 42, near: 0.1, far: 400 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      aria-label="3D battle view. Use arrow keys and Enter to aim and fire."
      onPointerMissed={() => props.onHover(props.mode === 'setup' ? 'player' : 'ai', null)}
    >
      <color attach="background" args={['#b9cbd6']} />
      <fog attach="fog" args={['#b9cbd6', 35, 110]} />
      <Sky sunPosition={SUN.toArray()} turbidity={6} rayleigh={1.6} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <hemisphereLight args={['#dbe9f4', '#0b3a53', 0.9]} />
      <directionalLight position={SUN.toArray()} intensity={1.6} color="#ffe2b8" />
      <directionalLight position={[20, 25, 30]} intensity={0.5} color="#bcd6ff" />
      <Ocean sunDirection={sunDir} />
      <CameraRig focus={props.focus} mode={props.mode} shake={shake} />

      <BoardGrid
        side="player"
        title="Your Fleet"
        views={props.playerViews}
        ghost={ghostPlacement}
        heat={props.heat}
        cursor={null}
        hint={null}
        target={props.aiTarget}
        interactive={props.interactiveSide === 'player'}
        onHover={props.onHover}
        onCell={props.onCell}
      />
      {props.playerShips.map((s) => (
        <ShipModel key={s.placement.type} side="player" placement={s.placement} sunk={s.sunk} />
      ))}
      {props.mode === 'setup' && props.ghostShip && props.ghost && (
        <ShipModel side="player" placement={props.ghostShip} ghost={props.ghost.valid ? 'valid' : 'invalid'} />
      )}
      <Markers side="player" views={props.playerViews} />

      {props.enemyViews && (
        <>
          <BoardGrid
            side="ai"
            title="Enemy Waters"
            views={props.enemyViews}
            ghost={null}
            heat={null}
            cursor={props.cursor}
            hint={props.hint}
            target={null}
            interactive={props.interactiveSide === 'ai'}
            onHover={props.onHover}
            onCell={props.onCell}
          />
          {props.enemyShips.map((s) => (
            <ShipModel key={s.placement.type} side="ai" placement={s.placement} sunk={s.sunk} enemy />
          ))}
          <Markers side="ai" views={props.enemyViews} />
        </>
      )}

      {props.volley && <Cannonball key={props.volley.id} volley={props.volley} />}
      <ImpactBursts lastShot={props.lastShot} onShake={onShake} />
    </Canvas>
  );
}
