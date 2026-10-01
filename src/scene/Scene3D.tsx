import { Sky } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { BoardGrid } from './BoardGrid.tsx';
import { CameraRig } from './CameraRig.tsx';
import { Cannonball, ImpactBursts } from './Effects.tsx';
import { Markers } from './Markers.tsx';
import { Ocean } from './Ocean.tsx';
import { ShipModel } from './ShipModel.tsx';
import { glintDirection, skyLook } from './skyPresets.ts';
import type { SceneProps } from './types.ts';
import { Lightning, NightSky, Rain } from './Weather.tsx';

export default function Scene3D(props: SceneProps) {
  const look = useMemo(() => skyLook(props.atmosphere), [props.atmosphere]);
  const sunDir = useMemo(() => new THREE.Vector3(...look.sun).normalize(), [look]);
  const glintDir = useMemo(() => new THREE.Vector3(...glintDirection(look.sun)).normalize(), [look]);
  const flash = useMemo(() => ({ value: 0 }), []);
  const calm = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const ghostPlacement = props.ghost && props.mode === 'setup' ? props.ghost : null;

  return (
    <Canvas
      camera={{ position: [0, 20, 16], fov: 42, near: 0.1, far: 400 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      aria-label="3D battle view. Use arrow keys and Enter to aim and fire."
      onPointerMissed={() => props.onHover(props.mode === 'setup' ? 'player' : 'ai', null)}
    >
      <color attach="background" args={[look.background]} />
      <fog key={`${look.fog.color}-${look.fog.near}`} attach="fog" args={[look.fog.color, look.fog.near, look.fog.far]} />
      {look.sky && (
        <Sky
          sunPosition={look.sun}
          turbidity={look.sky.turbidity}
          rayleigh={look.sky.rayleigh}
          mieCoefficient={look.sky.mie}
          mieDirectionalG={look.sky.mieG}
        />
      )}
      {look.moon && <NightSky moonPosition={look.sun} stars={look.stars} />}
      <hemisphereLight args={[look.hemi.sky, look.hemi.ground, look.hemi.intensity]} />
      <directionalLight position={look.sun} intensity={look.key.intensity} color={look.key.color} />
      <directionalLight position={[20, 25, 30]} intensity={look.fill.intensity} color={look.fill.color} />
      <Ocean sunDirection={sunDir} glintDirection={glintDir} look={look.ocean} fog={look.fog} flash={flash} />
      {look.rain && <Rain />}
      {look.lightning && !calm && <Lightning flash={flash} onStrike={props.onLightning} />}
      <CameraRig focus={props.focus} mode={props.mode} />

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
      <ImpactBursts lastShot={props.lastShot} />
    </Canvas>
  );
}
