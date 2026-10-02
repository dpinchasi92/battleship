import { Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import pirataFont from '@fontsource/pirata-one/files/pirata-one-latin-400-normal.woff?url';
import type { CellView, Ghost } from '../app/cells.ts';
import { BOARD_SIZE, rowLabel, toIndex, type Coord, type Side } from '../engine/index.ts';
import { boardX, GRID_Y } from './layout.ts';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uCells;
  uniform float uTime;
  uniform vec2 uCursor;
  uniform vec2 uHint;
  uniform vec2 uTarget;
  uniform float uActive;
  varying vec2 vUv;

  float cellMask(vec2 cell, vec2 target) {
    return (target.x < 0.0) ? 0.0 : (1.0 - step(0.5, distance(cell, target)));
  }

  void main() {
    vec2 g = vec2(vUv.x * 10.0, (1.0 - vUv.y) * 10.0);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec4 tint = texture2D(uCells, (cell + 0.5) / 10.0);
    float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float line = 1.0 - smoothstep(0.015, 0.045, edge);

    vec3 color = vec3(0.05, 0.18, 0.26);
    float alpha = 0.18 + 0.08 * uActive;
    color = mix(color, tint.rgb, tint.a);
    alpha = max(alpha, tint.a);

    float pulse = 0.5 + 0.5 * sin(uTime * 6.0);
    float ring = 1.0 - smoothstep(0.06, 0.12, edge);
    float cursor = cellMask(cell, uCursor);
    color = mix(color, vec3(1.0, 0.85, 0.45), cursor * (0.35 + ring * 0.65));
    alpha = max(alpha, cursor * (0.45 + ring * 0.5));

    float hint = cellMask(cell, uHint);
    color = mix(color, vec3(1.0, 0.78, 0.2), hint * (0.4 + 0.5 * pulse));
    alpha = max(alpha, hint * (0.55 + 0.35 * pulse));

    float target = cellMask(cell, uTarget);
    color = mix(color, vec3(1.0, 0.2, 0.1), target * (0.5 + 0.4 * pulse));
    alpha = max(alpha, target * 0.75);

    color = mix(color, vec3(0.93, 0.8, 0.52), line * 0.85);
    alpha = max(alpha, line * 0.75);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

type Props = {
  side: Side;
  title: string;
  views: readonly CellView[] | null;
  ghost: Ghost | null;
  heat: readonly number[] | null;
  cursor: Coord | null;
  hint: Coord | null;
  target: Coord | null;
  interactive: boolean;
  onHover: (side: Side, coord: Coord | null) => void;
  onCell: (side: Side, coord: Coord) => void;
};

const toVec = (c: Coord | null) => (c ? new THREE.Vector2(c.col, c.row) : new THREE.Vector2(-10, -10));

export function BoardGrid({ side, title, views, ghost, heat, cursor, hint, target, interactive, onHover, onCell }: Props) {
  const ox = boardX(side);
  const material = useRef<THREE.ShaderMaterial>(null);
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(BOARD_SIZE * BOARD_SIZE * 4), BOARD_SIZE, BOARD_SIZE);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const uniforms = useMemo(
    () => ({
      uCells: { value: texture },
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector2(-10, -10) },
      uHint: { value: new THREE.Vector2(-10, -10) },
      uTarget: { value: new THREE.Vector2(-10, -10) },
      uActive: { value: 0 },
    }),
    [texture],
  );

  useEffect(() => {
    const data = texture.image.data as Uint8Array;
    data.fill(0);
    const set = (i: number, r: number, g: number, b: number, a: number) => {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = a;
    };
    views?.forEach((v, i) => {
      if (v.visual === 'hit') set(i, 150, 30, 20, 110);
      if (v.visual === 'sunk') set(i, 40, 20, 15, 120);
    });
    heat?.forEach((h, i) => {
      if (h > 0.02) set(i, 255, Math.round(200 - 150 * h), 40, Math.round(40 + 170 * h));
    });
    ghost?.cells.forEach((c) => set(toIndex(c), ghost.valid ? 90 : 230, ghost.valid ? 210 : 60, ghost.valid ? 120 : 50, 150));
    texture.needsUpdate = true;
  }, [texture, views, heat, ghost]);

  useEffect(() => {
    const live = material.current?.uniforms;
    if (!live) return;
    live.uCursor!.value = toVec(cursor);
    live.uHint!.value = toVec(hint);
    live.uTarget!.value = toVec(target);
    live.uActive!.value = interactive ? 1 : 0;
  }, [cursor, hint, target, interactive]);

  useFrame(({ clock }) => {
    const live = material.current?.uniforms;
    if (live) live.uTime!.value = clock.elapsedTime;
  });

  const cellFromEvent = (e: ThreeEvent<PointerEvent | MouseEvent>): Coord | null => {
    const col = Math.floor(e.point.x - (ox - 5));
    const row = Math.floor(e.point.z + 5);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
  };

  const labelProps = {
    font: pirataFont,
    color: '#f3e3bd',
    outlineWidth: 0.02,
    outlineColor: '#3b2412',
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    'rotation-x': -Math.PI / 2,
  };

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[ox, GRID_Y, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (interactive) onHover(side, cellFromEvent(e));
        }}
        onPointerOut={() => interactive && onHover(side, null)}
        onClick={(e) => {
          e.stopPropagation();
          const c = cellFromEvent(e);
          if (c && interactive) onCell(side, c);
        }}
      >
        <planeGeometry args={[10, 10]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <Frame ox={ox} />
      {Array.from({ length: BOARD_SIZE }, (_, i) => (
        <group key={i}>
          <Text {...labelProps} fontSize={0.42} position={[ox - 5.55, 0.25, i - 4.5]}>
            {rowLabel(i)}
          </Text>
          <Text {...labelProps} fontSize={0.42} position={[ox + i - 4.5, 0.25, -5.55]}>
            {String(i + 1)}
          </Text>
        </group>
      ))}
      <Text {...labelProps} fontSize={0.8} position={[ox, 0.3, -6.6]} color={side === 'player' ? '#f3e3bd' : '#ffcf8a'}>
        {title}
      </Text>
    </group>
  );
}

function Frame({ ox }: { ox: number }) {
  const wood = '#6b4423';
  const brass = '#d4a24c';
  const bars: [number, number, number, number, number][] = [
    [ox, -5.15, 10.6, 0.3, 0],
    [ox, 5.15, 10.6, 0.3, 0],
    [ox - 5.15, 0, 0.3, 10.6, 0],
    [ox + 5.15, 0, 0.3, 10.6, 0],
  ];
  return (
    <group>
      {bars.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.08, z]}>
          <boxGeometry args={[w, 0.22, d]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
      ))}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <group key={i} position={[ox + sx! * 5.15, 0, sz! * 5.15]}>
          <mesh position-y={0.3}>
            <cylinderGeometry args={[0.18, 0.22, 0.6, 12]} />
            <meshStandardMaterial color={wood} roughness={0.7} />
          </mesh>
          <mesh position-y={0.72}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color={brass} emissive="#ffb347" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
