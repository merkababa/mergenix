'use client';

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Color, Vector3, Quaternion, Group, Mesh } from 'three';
import { cn } from '@/lib/utils';

// ── Module-level reusable vectors — avoids per-frame allocations ──────────────
// These are mutated in place with .set() / .subVectors() / .addVectors()
// instead of constructing new Vector3 instances each frame or memo call.
const _tempVec3A = new Vector3();
const _tempVec3B = new Vector3();

// ── Constants — hoisted outside component bodies ─────────────────────────────

/** Primary strand color: sky blue — clinical/medical feel */
const COLOR_PRIMARY = new Color('#0EA5E9');

/** Secondary strand color: slate gray — neutral accent */
const COLOR_SECONDARY = new Color('#94A3B8');

/** Rung color: light slate — subtle connectors */
const COLOR_RUNG = new Color('#CBD5E1');

/** Sphere geometry args: [radius, widthSegments, heightSegments] — reduced for subtlety */
const SPHERE_ARGS: [number, number, number] = [0.1, 8, 8];

/** Rung cylinder args: [radiusTop, radiusBottom, height, radialSegments] */
const CYLINDER_ARGS: [number, number, number, number] = [0.04, 0.04, 1, 6];

/** Helix radius (distance from central axis to nucleotide) */
const HELIX_RADIUS = 1.2;

/** Vertical spacing between nucleotide pairs */
const PAIR_SPACING = 0.55;

/** Full helix twist angle per pair (in radians) */
const TWIST_PER_PAIR = (2 * Math.PI) / 10;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DnaHelix3DProps {
  /** Optional Tailwind / CSS class for sizing the container */
  className?: string;
  /** Number of nucleotide pairs per strand. Default: 10 */
  dotCount?: number;
  /** Y-axis rotation speed in radians per frame. Default: 0.001 */
  rotationSpeed?: number;
  /** Whether to enable mouse-parallax tilt. Default: true */
  interactive?: boolean;
}

// ── Helix geometry data ───────────────────────────────────────────────────────

interface PairData {
  /** Index along the helix */
  index: number;
  /** 3D position of primary (sky blue) nucleotide */
  primaryPos: Vector3;
  /** 3D position of secondary (slate) nucleotide */
  secondaryPos: Vector3;
}

function buildPairs(count: number): PairData[] {
  const pairs: PairData[] = [];
  const halfHeight = ((count - 1) * PAIR_SPACING) / 2;

  for (let i = 0; i < count; i++) {
    const angle = i * TWIST_PER_PAIR;
    const y = i * PAIR_SPACING - halfHeight;

    pairs.push({
      index: i,
      primaryPos: new Vector3(
        Math.cos(angle) * HELIX_RADIUS,
        y,
        Math.sin(angle) * HELIX_RADIUS,
      ),
      secondaryPos: new Vector3(
        Math.cos(angle + Math.PI) * HELIX_RADIUS,
        y,
        Math.sin(angle + Math.PI) * HELIX_RADIUS,
      ),
    });
  }

  return pairs;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface RungProps {
  posA: Vector3;
  posB: Vector3;
}

/** A single rung (ladder step) connecting the two strands. */
const Rung = React.memo(function Rung({ posA, posB }: RungProps) {
  // Use module-level temp vectors (_tempVec3A/B) with .set-style operations
  // to avoid allocating new Vector3 instances on each memo recompute.
  const midpoint = useMemo(() => {
    // _tempVec3A = posA + posB, then halved — produces midpoint
    return _tempVec3A.addVectors(posA, posB).multiplyScalar(0.5).clone();
  }, [posA, posB]);

  const length = useMemo(() => posA.distanceTo(posB), [posA, posB]);

  const quaternion = useMemo(() => {
    // _tempVec3A = direction from posA to posB (normalized)
    // _tempVec3B = world up (0,1,0)
    _tempVec3A.subVectors(posB, posA).normalize();
    _tempVec3B.set(0, 1, 0);
    return new Quaternion().setFromUnitVectors(_tempVec3B, _tempVec3A);
  }, [posA, posB]);

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[CYLINDER_ARGS[0], CYLINDER_ARGS[1], length, CYLINDER_ARGS[3]]} />
      <meshBasicMaterial color={COLOR_RUNG} transparent opacity={0.25} />
    </mesh>
  );
});

interface HelixSceneProps {
  dotCount: number;
  rotationSpeed: number;
  isReduced: boolean;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  interactive: boolean;
}

/** Inner Three.js scene — rendered inside <Canvas>. */
const HelixScene = React.memo(function HelixScene({
  dotCount,
  rotationSpeed,
  isReduced,
  mouseRef,
  interactive,
}: HelixSceneProps) {
  const groupRef = useRef<Group>(null);

  // Ref to hold latest prop values — prevents stale closures in useFrame
  // (component is React.memo, so props captured in the initial closure may be stale)
  const configRef = useRef({ rotationSpeed, isReduced, interactive });
  useEffect(() => { configRef.current = { rotationSpeed, isReduced, interactive }; });

  const pairs = useMemo(() => buildPairs(dotCount), [dotCount]);

  // Dispose all GPU resources on unmount to prevent memory leaks.
  // React Three Fiber creates native Three.js objects behind JSX — they must be
  // explicitly disposed because WebGL GPU memory is not garbage-collected.
  useEffect(() => {
    return () => {
      const group = groupRef.current;
      if (!group) return;
      group.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const { rotationSpeed: speed, isReduced: reduced, interactive: isInteractive } = configRef.current;
    if (!reduced) {
      // Continuous Y rotation
      groupRef.current.rotation.y += speed;

      // Mouse parallax — very subtle X/Y tilt (±0.04 rad max)
      if (isInteractive && mouseRef.current) {
        const targetX = mouseRef.current.y * 0.04;
        const targetZ = mouseRef.current.x * 0.04;
        groupRef.current.rotation.x +=
          (targetX - groupRef.current.rotation.x) * 0.03;
        groupRef.current.rotation.z +=
          (targetZ - groupRef.current.rotation.z) * 0.03;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* For dotCount > ~40, consider switching to InstancedMesh for better GPU performance */}
      {pairs.map((pair) => (
        <React.Fragment key={pair.index}>
          {/* Primary (sky blue) nucleotide */}
          <mesh position={pair.primaryPos}>
            <sphereGeometry args={SPHERE_ARGS} />
            <meshBasicMaterial color={COLOR_PRIMARY} transparent opacity={0.7} />
          </mesh>

          {/* Secondary (slate) nucleotide */}
          <mesh position={pair.secondaryPos}>
            <sphereGeometry args={SPHERE_ARGS} />
            <meshBasicMaterial color={COLOR_SECONDARY} transparent opacity={0.7} />
          </mesh>

          {/* Rung connecting the pair */}
          <Rung posA={pair.primaryPos} posB={pair.secondaryPos} />
        </React.Fragment>
      ))}
    </group>
  );
});

// ── Main exported component ───────────────────────────────────────────────────

/**
 * Interactive 3D DNA double helix rendered with React Three Fiber.
 * Decorative — hidden from assistive technologies via aria-hidden.
 *
 * SSR-safe: use DnaHelix3DDynamic from dna-helix-3d-dynamic.tsx for page-level usage.
 */
export const DnaHelix3D = React.memo(function DnaHelix3D({
  className,
  dotCount = 10,
  rotationSpeed = 0.001,
  interactive = true,
}: DnaHelix3DProps) {
  const [isReduced, setIsReduced] = useState(false);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect prefers-reduced-motion on mount and listen for changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || isReduced || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normalize to [-1, 1]
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }, [interactive, isReduced]);

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-full', className)}
      aria-hidden="true"
      onMouseMove={handleMouseMove}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 6], fov: 50 }}
        frameloop={isReduced ? 'demand' : 'always'}
      >
        <HelixScene
          dotCount={dotCount}
          rotationSpeed={rotationSpeed}
          isReduced={isReduced}
          mouseRef={mouseRef}
          interactive={interactive}
        />
      </Canvas>
    </div>
  );
});
