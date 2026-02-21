"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  LEGACY_TILE_COLUMNS,
  LEGACY_TILE_ROWS,
  PIECE_COLUMNS,
  PIECE_ROWS,
} from "@/lib/piece-config";

const ROW_COUNT = PIECE_COLUMNS;
const COL_COUNT = PIECE_ROWS;
const TOTAL_PARTICLES = ROW_COUNT * COL_COUNT;
const LEGACY_GRID_STEP_X = 0.75 * 1.5;
const LEGACY_GRID_STEP_Y = 1.5;
const GRID_STEP_X = LEGACY_GRID_STEP_X * (LEGACY_TILE_COLUMNS / ROW_COUNT);
const GRID_STEP_Y = LEGACY_GRID_STEP_Y * (LEGACY_TILE_ROWS / COL_COUNT);
const POINT_SIZE_SCALE = GRID_STEP_Y / LEGACY_GRID_STEP_Y;
const MAX_CANVAS_DPR = 1.5;
const BASE_POINT_SIZE_DESKTOP = 1.0;
const BASE_POINT_SIZE_MOBILE = 0.6;

function ParticleImage({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  // Build ALL static attribute data once — never touched again
  const { dummyPos, whIndices, randPosArr, gridPosArr, randValArr, randomCenter, gridCenter } =
    useMemo(() => {
      const dummy = new Float32Array(TOTAL_PARTICLES * 3); // placeholder for Three.js
      const wh = new Float32Array(TOTAL_PARTICLES * 2);
      const rPos = new Float32Array(TOTAL_PARTICLES * 3);
      const gPos = new Float32Array(TOTAL_PARTICLES * 3);
      const rVal = new Float32Array(TOTAL_PARTICLES);

      let rcx = 0, rcy = 0, rcz = 0;
      let idx = 0;

      for (let x = 0; x < ROW_COUNT; x++) {
        for (let y = 0; y < COL_COUNT; y++) {
          wh[idx * 2] = x;
          wh[idx * 2 + 1] = y;

          // Keep assembled image size stable when tile count changes.
          gPos[idx * 3] = x * GRID_STEP_X;
          gPos[idx * 3 + 1] = y * GRID_STEP_Y;
          gPos[idx * 3 + 2] = 1.0;

          // Random starting positions — uniform rejection sampling in sphere r=400
          let rx: number, ry: number, rz: number;
          do {
            rx = (Math.random() - 0.5) * 800;
            ry = (Math.random() - 0.5) * 800;
            rz = (Math.random() - 0.5) * 800;
          } while (rx * rx + ry * ry + rz * rz > 160000); // 400^2

          rPos[idx * 3] = rx;
          rPos[idx * 3 + 1] = ry;
          rPos[idx * 3 + 2] = rz;
          rcx += rx; rcy += ry; rcz += rz;

          // Avoid 0 so every tile gets at least some wobble.
          rVal[idx] = 1.0 + Math.random() * 9.0;
          idx++;
        }
      }

      const n = TOTAL_PARTICLES;
      return {
        dummyPos: dummy,
        whIndices: wh,
        randPosArr: rPos,
        gridPosArr: gPos,
        randValArr: rVal,
        randomCenter: new THREE.Vector3(rcx / n, rcy / n, rcz / n),
        gridCenter: new THREE.Vector3(
          ((ROW_COUNT - 1) * GRID_STEP_X) / 2,
          ((COL_COUNT - 1) * GRID_STEP_Y) / 2,
          1.0
        ),
      };
    }, []);

  const texture = useMemo(() => new THREE.TextureLoader().load("/img/full2.jpg"), []);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uDivision: { value: new THREE.Vector2(ROW_COUNT, COL_COUNT) },
      uPointSize: { value: 1.0 },
      uScale: { value: 540.0 },
      uScroll: { value: 0.0 },
      uClockCos: { value: 1.0 },
      uClockSin: { value: 0.0 },
      uCenter: { value: new THREE.Vector3() },
    }),
    [texture]
  );

  // ---- GPU vertex shader: ALL position math runs here in parallel ----
  const vertexShader = `
    uniform vec2 uDivision;
    uniform float uPointSize;
    uniform float uScale;
    uniform float uScroll;
    uniform float uClockCos;
    uniform float uClockSin;
    uniform vec3 uCenter;

    attribute vec3 aRandomPos;
    attribute vec3 aGridPos;
    attribute float aRandomVal;
    attribute vec2 whIndex;

    varying vec2 vSize;
    varying vec2 vUv;
    varying float vDepth;

    void main() {
      vSize = vec2(1.0) / uDivision;
      vUv = whIndex / uDivision;

      float s = clamp(uScroll, 0.0, 1.0);
      float sRev = 1.0 - s;

      // Clock animations (subtle continuous motion, fades as image assembles)
      float clockCos = uClockCos * aRandomVal * sRev;
      float clockSin = uClockSin * aRandomVal * sRev;

      // Interpolate random → grid + clock animation
      vec3 pos;
      pos.x = mix(aRandomPos.x, aGridPos.x, s) + clockCos;
      pos.y = mix(aRandomPos.y, aGridPos.y, s) + clockCos;
      pos.z = mix(aRandomPos.z, aGridPos.z, s) + clockSin;

      // Center + scale(0.5) — matching original geom.center() + geom.scale(0.5)
      pos = (pos - uCenter) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vDepth = -mvPosition.z;

      gl_PointSize = uPointSize * (uScale / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  // ---- Fragment shader: texture sampling + depth-based desaturation ----
  const fragmentShader = `
    uniform sampler2D uTexture;
    varying vec2 vSize;
    varying vec2 vUv;
    varying float vDepth;

    void main() {
      vec2 pUv = gl_PointCoord;
      pUv.y = 1.0 - pUv.y;
      pUv.x = (pUv.x - 0.5) / 0.75 + 0.5;

      if (pUv.x > 1.0 || pUv.x < 0.0) discard;

      vec2 uv = vUv + vSize * pUv;
      vec4 texColor = texture2D(uTexture, uv);

      // Atmospheric depth: far particles lose saturation
      float depthFactor = smoothstep(40.0, 180.0, vDepth);
      float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 color = mix(texColor.rgb, vec3(lum), depthFactor * 0.7);

      // Alpha test — discard near-transparent fragments for correct depth sorting
      if (texColor.a < 0.1) discard;

      // Keep particles opaque so z-buffer ordering remains stable.
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Per-frame: only update 4 uniform values — ZERO array work
  useFrame(({ clock }) => {
    if (!shaderMaterialRef.current) return;

    const s = Math.min(Math.max(scrollRef.current ?? 0, 0), 1);
    const u = shaderMaterialRef.current.uniforms;
    const elapsed = clock.getElapsedTime();

    u.uScroll.value = s;
    u.uClockCos.value = Math.cos(elapsed);
    u.uClockSin.value = Math.sin(elapsed);

    // Interpolate bounding-box center (random→grid) for the centering uniform
    (u.uCenter.value as THREE.Vector3).lerpVectors(randomCenter, gridCenter, s);

    // Viewport-dependent uniforms
    const pr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
    u.uScale.value = size.height * pr * 0.5;
    const basePointSize = size.width > 768 ? BASE_POINT_SIZE_DESKTOP : BASE_POINT_SIZE_MOBILE;
    u.uPointSize.value = basePointSize * POINT_SIZE_SCALE;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[dummyPos, 3]} count={TOTAL_PARTICLES} />
        <bufferAttribute attach="attributes-aRandomPos" args={[randPosArr, 3]} count={TOTAL_PARTICLES} />
        <bufferAttribute attach="attributes-aGridPos" args={[gridPosArr, 3]} count={TOTAL_PARTICLES} />
        <bufferAttribute attach="attributes-aRandomVal" args={[randValArr, 1]} count={TOTAL_PARTICLES} />
        <bufferAttribute attach="attributes-whIndex" args={[whIndices, 2]} count={TOTAL_PARTICLES} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest
        depthWrite
      />
    </points>
  );
}

function CameraSetup() {
  const { camera, scene } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 74;
      camera.near = 1;
      camera.far = 1000;
      camera.position.set(0, 0, 62);
      camera.lookAt(scene.position);
      camera.updateProjectionMatrix();
    }
  }, [camera, scene]);
  return null;
}

function ClearRenderer() {
  const { gl } = useThree();
  useEffect(() => {
    // Match original: renderer is alpha-transparent, no clear color
    gl.setClearColor(0x000000, 0);
  }, [gl]);
  return null;
}

function Scene({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  return (
    <>
      <ClearRenderer />
      <CameraSetup />
      <ParticleImage scrollRef={scrollRef} />
    </>
  );
}

interface ParticleSceneProps {
  scrollRef: React.RefObject<number>;
  visible: boolean;
}

export default function ParticleScene({
  scrollRef,
  visible,
}: ParticleSceneProps) {
  return (
    <div
      id="particleImage"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
      }}
    >
      <Canvas
        dpr={[1, MAX_CANVAS_DPR]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        frameloop={visible ? "always" : "never"}
      >
        <Scene scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}
