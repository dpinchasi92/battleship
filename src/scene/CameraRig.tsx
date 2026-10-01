import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { BOARD_OFFSET } from './layout.ts';

type Props = { focus: 'player' | 'enemy' | 'both'; mode: 'setup' | 'battle'; shake: MutableRefObject<number> };

const DIRECTION = new THREE.Vector3(0, 0.78, 0.63).normalize();

/**
 * Frames the active board(s) for any aspect ratio, easing between shots, with impact shake.
 * On wide screens the projection is shifted so the boards center in the area left of the HUD panel.
 */
export function CameraRig({ focus, mode, shake }: Props) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const inset = size.width > 900 ? Math.min(340, size.width * 0.34) + 28 : 0;
    const fullAspect = (size.width + inset) / size.height;
    const view = cam.view;
    if (cam.aspect !== fullAspect || (view?.offsetX ?? 0) !== inset || view?.width !== size.width) {
      cam.aspect = fullAspect;
      if (inset > 0) cam.setViewOffset(size.width + inset, size.height, inset, 0, size.width, size.height);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
    const aspect = (size.width - inset) / size.height;
    const wide = aspect >= 1.15;
    const showBoth = focus === 'both' || (wide && mode === 'battle');
    const centerX = showBoth ? (wide && focus !== 'both' ? (focus === 'enemy' ? 1 : -1) * 0.8 : 0) : focus === 'player' ? -BOARD_OFFSET : BOARD_OFFSET;
    const width = showBoth ? BOARD_OFFSET * 2 + 13 : 13.5;
    const depth = 14;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = Math.max(width / 2 / Math.tan(hfov / 2), (depth / 2 / Math.tan(vfov / 2)) * 0.95) + (wide ? 3 : 1);
    desiredLook.set(centerX, 0, 0.6);
    desiredPos.copy(desiredLook).addScaledVector(DIRECTION, dist);
    const k = 1 - Math.exp(-delta * 2.2);
    cam.position.lerp(desiredPos, k);
    look.current.lerp(desiredLook, k);
    if (shake.current > 0.001) {
      const s = shake.current;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      shake.current *= Math.exp(-delta * 6);
    }
    cam.lookAt(look.current);
    state.invalidate();
  });
  return null;
}
