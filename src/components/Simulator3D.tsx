import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../data/enjoyAiMat';
import { MissionZone, ObstacleBox, QuizDefinition, SimulationSnapshot } from '../types/robotics';
import { drawEnjoyAiMat } from '../utils/matTexture';

export type CameraPreset = 'tilt' | 'top' | 'follow';

interface Simulator3DProps {
  quiz: QuizDefinition;
  snapshot: SimulationSnapshot;
  showReferencePath: boolean;
}

// World scale: 1 Three.js unit = 10 cm (180 px). Board is 21.6 x 12.0 units centered at (0, 0, 0)
const WORLD_W = 21.6;
const WORLD_H = 12.0;

function boardToWorld(px: number, py: number): { x: number; z: number } {
  return {
    x: (px / BOARD_WIDTH - 0.5) * WORLD_W,
    z: (py / BOARD_HEIGHT - 0.5) * WORLD_H,
  };
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.16)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBarrierStripeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#dc2626';
  for (let x = -64; x < 320; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 4, 64);
    ctx.lineTo(x - 20, 64);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Composite 10+ part WhalesBot competition robot with rotating wheels,
 * articulated front arm, and live 5-LED grayscale sensor bar.
 */
function buildRobotModel(shadowTex: THREE.CanvasTexture): {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  armPivot: THREE.Group;
  sensorLeds: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();

  // Soft contact shadow disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  // Materials with distinct roughness/metalness contrast
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.15 });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
  const accentBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.25 });
  const controllerYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.15 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.4, emissive: 0x0284c7, emissiveIntensity: 0.35 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.05 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.78 });
  const metalArmMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.7 });

  // Lower chassis deck (forward is +X in robot local space)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.2, 0.78), chassisMat);
  deck.position.set(0, 0.24, 0);
  deck.castShadow = true;
  group.add(deck);

  // Upper sculpted shell
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.26, 0.68), shellMat);
  upperBody.position.set(-0.04, 0.45, 0);
  upperBody.castShadow = true;
  group.add(upperBody);

  // Blue aerodynamic side trim rails
  const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.09, 0.06), accentBlueMat);
  trimL.position.set(-0.02, 0.42, -0.35);
  group.add(trimL);
  const trimR = trimL.clone();
  trimR.position.z = 0.35;
  group.add(trimR);

  // Yellow controller module + dark display bezel on top
  const controller = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.44), controllerYellowMat);
  controller.position.set(-0.06, 0.63, 0);
  controller.castShadow = true;
  group.add(controller);

  const oled = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.22), screenMat);
  oled.position.set(-0.02, 0.705, 0);
  group.add(oled);

  // Rear stabilizer / ultrasonic tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.46), accentBlueMat);
  tower.position.set(-0.38, 0.64, 0);
  group.add(tower);

  // 4 Spoked Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 18);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.135, 12);
  const wheelOffsets: [number, number][] = [
    [0.24, -0.44],
    [0.24, 0.44],
    [-0.28, -0.44],
    [-0.28, 0.44],
  ];
  for (const [wx, wz] of wheelOffsets) {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(wx, 0.22, wz);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    tire.add(hub);
    group.add(tire);
    wheels.push(tire);
  }

  // Front 5-channel grayscale sensor bar
  const sensorBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.74), chassisMat);
  sensorBar.position.set(0.55, 0.15, 0);
  group.add(sensorBar);

  const sensorLeds: THREE.MeshStandardMaterial[] = [];
  const ledGeo = new THREE.SphereGeometry(0.038, 10, 10);
  for (let i = 0; i < 5; i++) {
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.57, 0.2, -0.28 + i * 0.14);
    group.add(led);
    sensorLeds.push(ledMat);
  }

  // Articulated Front Mechanical Arm / Gripper
  const armPivot = new THREE.Group();
  armPivot.position.set(0.45, 0.42, 0);
  const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), metalArmMat);
  armLeft.position.set(0.18, 0, -0.22);
  const armRight = armLeft.clone();
  armRight.position.z = 0.22;
  const clawBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.52), accentBlueMat);
  clawBar.position.set(0.38, -0.04, 0);
  armPivot.add(armLeft, armRight, clawBar);
  group.add(armPivot);

  return { group, wheels, armPivot, sensorLeds };
}

/**
 * Builds one of the 7 bespoke composite 3D Enjoy AI 2026 mission props.
 */
function buildMissionProp(
  mission: MissionZone,
  shadowTex: THREE.CanvasTexture
): { group: THREE.Group; beaconMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const { x, z } = boardToWorld(mission.x + mission.width / 2, mission.y + mission.height / 2);
  group.position.set(x, 0, z);
  group.rotation.y = -((mission.rotation || 0) * Math.PI) / 180;

  const baseW = (mission.width / BOARD_WIDTH) * WORLD_W;
  const baseD = (mission.height / BOARD_HEIGHT) * WORLD_H;

  // Contact shadow
  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(baseW, baseD) * 0.6, 20),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.012;
  group.add(sh);

  // Status base plinth
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65, metalness: 0.1 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.88, 0.09, baseD * 0.88), plinthMat);
  plinth.position.y = 0.045;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Beacon indicator bar (blue = pending, emerald = completed)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x2563eb,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.2,
  });
  const beacon = new THREE.Mesh(
    new THREE.BoxGeometry(baseW * 0.92, 0.04, baseD * 0.92),
    beaconMat
  );
  beacon.position.y = 0.025;
  group.add(beacon);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78, metalness: 0.05 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.28, metalness: 0.82 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.26, metalness: 0.72 });
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.25 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.78 });

  switch (mission.kind) {
    case 'cannon': {
      // Bắn pháo: Wooden carriage + angled iron cannon + glowing ball
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.65), woodMat);
      carriage.position.set(0, 0.22, 0);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.72, 16), darkIronMat);
      barrel.rotation.z = Math.PI / 3;
      barrel.position.set(0.08, 0.48, 0);
      const wheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 14), bronzeMat);
      wheel1.rotation.x = Math.PI / 2;
      wheel1.position.set(-0.05, 0.2, 0.34);
      const wheel2 = wheel1.clone();
      wheel2.position.z = -0.34;
      group.add(carriage, barrel, wheel1, wheel2);
      break;
    }

    case 'compass': {
      // La bàn: Bronze base plate + raised compass rim + golden spoon pointer
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.68), bronzeMat);
      plate.position.y = 0.16;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 10, 24), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      const spoonBowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), tealMat);
      spoonBowl.position.set(-0.08, 0.28, 0);
      const spoonHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.36, 10), tealMat);
      spoonHandle.rotation.z = Math.PI / 2;
      spoonHandle.position.set(0.1, 0.3, 0);
      group.add(plate, ring, spoonBowl, spoonHandle);
      break;
    }

    case 'pyramid': {
      // Kim tự tháp: 4-tier stepped golden pyramid
      const sizes = [0.76, 0.56, 0.38, 0.2];
      sizes.forEach((sz, idx) => {
        const tier = new THREE.Mesh(new THREE.BoxGeometry(sz, 0.18, sz), idx === 3 ? goldMat : stoneMat);
        tier.position.y = 0.18 + idx * 0.18;
        group.add(tier);
      });
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 4), goldMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 0.94;
      group.add(cap);
      break;
    }

    case 'printing': {
      // In chữ rời: Timber frame + dark press bed + 6 movable type blocks
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.68, 0.1), woodMat);
      frameL.position.set(0, 0.42, -0.34);
      const frameR = frameL.clone();
      frameR.position.z = 0.34;
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.82), woodMat);
      topBeam.position.set(0, 0.74, 0);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.56), darkIronMat);
      bed.position.set(0, 0.16, 0);
      group.add(frameL, frameR, topBeam, bed);
      for (let i = 0; i < 4; i++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), tealMat);
        block.position.set(-0.09 + (i % 2) * 0.18, 0.27, -0.11 + Math.floor(i / 2) * 0.22);
        group.add(block);
      }
      break;
    }

    case 'great_wall': {
      // Vạn lý trường thành: Watchtower with battlements & flag
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.96), stoneMat);
      wall.position.y = 0.32;
      const towerTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.26, 0.54), stoneMat);
      towerTop.position.set(0, 0.68, 0);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), darkIronMat);
      pole.position.set(0, 1.0, 0);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.28), tealMat);
      flag.position.set(0, 1.15, 0.14);
      group.add(wall, towerTop, pole, flag);
      break;
    }

    case 'papermaking': {
      // Làm giấy: Timber water vat + turquoise pulp surface + bamboo screen frame
      const vat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.24, 0.56), woodMat);
      vat.position.y = 0.2;
      const water = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.44), tealMat);
      water.position.y = 0.32;
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.34), goldMat);
      screen.position.set(0.1, 0.46, 0);
      screen.rotation.z = -0.18;
      group.add(vat, water, screen);
      break;
    }

    case 'seismoscope': {
      // Địa chấn: Bronze Zhang Heng urn with top lid and ornamental ring
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 16), darkIronMat);
      pedestal.position.y = 0.16;
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.54, 18), bronzeMat);
      urn.position.y = 0.48;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), bronzeMat);
      dome.scale.set(1, 0.55, 1);
      dome.position.y = 0.76;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 20), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.54;
      group.add(pedestal, urn, dome, ring);
      break;
    }
  }

  return { group, beaconMat };
}

function buildObstacleBarrier(
  obs: ObstacleBox,
  stripeTex: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();
  const { x, z } = boardToWorld(obs.x + obs.width / 2, obs.y + obs.height / 2);
  group.position.set(x, 0, z);
  group.rotation.y = -((obs.rotation || 0) * Math.PI) / 180;

  const w = (obs.width / BOARD_WIDTH) * WORLD_W;
  const d = (obs.height / BOARD_HEIGHT) * WORLD_H;

  const footMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.1 });
  const barMat = new THREE.MeshStandardMaterial({
    map: stripeTex,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.1,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), footMat);
  base.position.y = 0.04;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.38, d * 0.84), barMat);
  wall.position.y = 0.26;
  wall.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.05, d * 0.9), footMat);
  cap.position.y = 0.47;

  group.add(base, wall, cap);
  return group;
}

export const Simulator3D: React.FC<Simulator3DProps> = ({
  quiz,
  snapshot,
  showReferencePath,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('tilt');

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const presetRef = useRef<CameraPreset>(cameraPreset);
  presetRef.current = cameraPreset;
  const showRefPathRef = useRef(showReferencePath);
  showRefPathRef.current = showReferencePath;

  const sceneApiRef = useRef<{
    rebuildQuiz: (q: QuizDefinition, refPath: boolean) => void;
    applyPreset: (p: CameraPreset) => void;
    requestRender: () => void;
  } | null>(null);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = Math.max(320, container.clientWidth);
    const height = Math.max(260, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc5cdd6);
    scene.fog = new THREE.Fog(0xc5cdd6, 68, 145);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 160);
    const computeFitScale = (aspect: number) =>
      Math.min(1.55, Math.max(1, 1.46 / Math.max(0.85, aspect)));
    const initialFit = computeFitScale(width / height);
    camera.position.set(0, 19.6 * initialFit, 18.6 * initialFit);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio RoomEnvironment for crisp PBR metallic reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Warm/cool 3-point studio lighting
    const hemi = new THREE.HemisphereLight(0xeef6ff, 0x94a3b8, 1.05);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(10, 18, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -14;
      keyLight.shadow.camera.right = 14;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc7d2fe, 0.45);
    rimLight.position.set(-12, 10, -10);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 6;
    controls.maxDistance = 48;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 0, 0.4);
    controls.update();

    // Competition Table Base & Mat Plane
    const tableGroup = new THREE.Group();
    const tableBezel = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_W + 0.55, 0.32, WORLD_H + 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.2 })
    );
    tableBezel.position.y = -0.17;
    tableBezel.receiveShadow = true;
    tableGroup.add(tableBezel);

    const matCanvas = document.createElement('canvas');
    matCanvas.width = 1944;
    matCanvas.height = 1080;
    const matTexture = new THREE.CanvasTexture(matCanvas);
    matTexture.colorSpace = THREE.SRGBColorSpace;
    matTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const matPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_W, WORLD_H),
      new THREE.MeshStandardMaterial({
        map: matTexture,
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.04,
      })
    );
    matPlane.rotation.x = -Math.PI / 2;
    matPlane.position.y = 0.0;
    matPlane.receiveShadow = true;
    tableGroup.add(matPlane);
    scene.add(tableGroup);

    const shadowTex = createContactShadowTexture();
    const stripeTex = createBarrierStripeTexture();

    // Robot model
    const robotModel = buildRobotModel(shadowTex);
    scene.add(robotModel.group);

    // Dynamic props container (missions + obstacles)
    const propsGroup = new THREE.Group();
    scene.add(propsGroup);
    let missionBeaconMats: Record<string, THREE.MeshStandardMaterial> = {};

    // Dynamic Trail Line (pre-allocated buffer to avoid per-frame GC)
    const MAX_TRAIL_PTS = 800;
    const trailPositions = new Float32Array(MAX_TRAIL_PTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    const trailLine = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 })
    );
    scene.add(trailLine);

    const rebuildQuiz = (q: QuizDefinition, refPath: boolean) => {
      const mCtx = matCanvas.getContext('2d');
      if (mCtx) {
        drawEnjoyAiMat(mCtx, matCanvas.width, matCanvas.height, q, {
          showZoneFootprints: true,
          showReferencePath: refPath,
        });
        matTexture.needsUpdate = true;
      }

      // Clear previous props
      while (propsGroup.children.length > 0) {
        propsGroup.remove(propsGroup.children[0]);
      }
      missionBeaconMats = {};

      for (const m of q.missions) {
        const { group: mGroup, beaconMat } = buildMissionProp(m, shadowTex);
        propsGroup.add(mGroup);
        missionBeaconMats[m.id] = beaconMat;
      }

      for (const obs of q.obstacles) {
        propsGroup.add(buildObstacleBarrier(obs, stripeTex));
      }
    };

    rebuildQuiz(quizRef.current, showRefPathRef.current);

    // Camera transition state
    let transitionActive = false;
    let userOrbited = false;
    const camTargetPos = new THREE.Vector3(0, 19.6 * initialFit, 18.6 * initialFit);
    const camLookTarget = new THREE.Vector3(0, 0, 0.4);
    const scratchVec = new THREE.Vector3();

    const applyPreset = (preset: CameraPreset) => {
      userOrbited = false;
      const fit = computeFitScale(camera.aspect);
      if (preset === 'tilt') {
        camTargetPos.set(0, 19.6 * fit, 18.6 * fit);
        camLookTarget.set(0, 0, 0.4);
        transitionActive = true;
      } else if (preset === 'top') {
        camTargetPos.set(0, 30.0 * fit, 0.2);
        camLookTarget.set(0, 0, 0);
        transitionActive = true;
      } else {
        transitionActive = true;
      }
      requestRender();
    };

    controls.addEventListener('start', () => {
      userOrbited = true;
      if (presetRef.current !== 'follow') {
        transitionActive = false;
      }
    });

    // Software-WebGL safe frame scheduler
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        const started = performance.now();
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED && performance.now() - started < 450) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 70);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function syncVisualState(dt: number) {
      const snap = snapshotRef.current;
      const q = quizRef.current;

      // Sync robot transform
      const rw = boardToWorld(snap.robot.x, snap.robot.y);
      robotModel.group.position.set(rw.x, 0, rw.z);
      robotModel.group.rotation.y = -snap.robot.headingRad;

      // Spin wheels & pivot mechanical arm
      for (const w of robotModel.wheels) {
        w.rotation.y = snap.robot.wheelAngle;
      }
      robotModel.armPivot.rotation.z = snap.robot.armAngle;

      // Update 5-LED grayscale sensor colors
      for (let i = 0; i < 5; i++) {
        const dark = snap.sensors.channels[i] < 0.45;
        const mat = robotModel.sensorLeds[i];
        mat.emissiveIntensity = dark ? 1.4 : 0.12;
        mat.color.setHex(dark ? 0x22d3ee : 0x475569);
      }

      // Update mission beacons
      const doneSet = new Set(snap.completedMissionIds);
      for (const m of q.missions) {
        const bMat = missionBeaconMats[m.id];
        if (!bMat) continue;
        if (doneSet.has(m.id)) {
          bMat.color.setHex(0x10b981);
          bMat.emissive.setHex(0x059669);
          bMat.emissiveIntensity = 0.7;
        } else {
          bMat.color.setHex(0x3b82f6);
          bMat.emissive.setHex(0x2563eb);
          bMat.emissiveIntensity = 0.35;
        }
      }

      // Update trail geometry
      const pts = snap.trail;
      const count = Math.min(pts.length, MAX_TRAIL_PTS);
      for (let i = 0; i < count; i++) {
        const p = boardToWorld(pts[i].x, pts[i].y);
        trailPositions[i * 3] = p.x;
        trailPositions[i * 3 + 1] = 0.045;
        trailPositions[i * 3 + 2] = p.z;
      }
      trailGeo.setDrawRange(0, count);
      (trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Camera damping / follow
      if (presetRef.current === 'follow') {
        const desiredCamX = rw.x - Math.cos(snap.robot.headingRad) * 5.2;
        const desiredCamZ = rw.z - Math.sin(snap.robot.headingRad) * 5.2 + 3.2;
        const alpha = isSoftwareGl ? 0.35 : 1 - Math.exp(-5.5 * dt);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredCamX, alpha);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.2, alpha);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredCamZ, alpha);
        controls.target.x = THREE.MathUtils.lerp(controls.target.x, rw.x, alpha);
        controls.target.y = 0.35;
        controls.target.z = THREE.MathUtils.lerp(controls.target.z, rw.z, alpha);
      } else if (transitionActive) {
        const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-7 * dt);
        camera.position.lerp(camTargetPos, alpha);
        controls.target.lerp(camLookTarget, alpha);
        if (
          camera.position.distanceTo(camTargetPos) < 0.05 &&
          controls.target.distanceTo(camLookTarget) < 0.05
        ) {
          camera.position.copy(camTargetPos);
          controls.target.copy(camLookTarget);
          transitionActive = false;
        }
      }

      controls.update();

      // Update projected HTML station labels cleanly via DOM refs
      const cw = renderer.domElement.clientWidth;
      const ch = renderer.domElement.clientHeight;
      for (const m of q.missions) {
        const el = labelRefs.current[m.id];
        if (!el) continue;
        const mp = boardToWorld(m.x + m.width / 2, m.y + m.height / 2);
        scratchVec.set(mp.x, 1.35, mp.z);
        scratchVec.project(camera);
        if (scratchVec.z > 1) {
          el.style.opacity = '0';
        } else {
          const rawX = ((scratchVec.x + 1) / 2) * cw;
          const rawY = (-(scratchVec.y - 1) / 2) * ch;
          const sx = Math.max(46, Math.min(cw - 46, rawX));
          const sy = Math.max(20, Math.min(ch - 56, rawY));
          el.style.opacity = '1';
          el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
        }
      }
    }

    let pendingSize: { w: number; h: number } | null = null;

    function applyPendingResize() {
      if (!pendingSize) return;
      const { w: nw, h: nh } = pendingSize;
      pendingSize = null;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      if (!userOrbited && presetRef.current !== 'follow') {
        const fit = computeFitScale(camera.aspect);
        if (presetRef.current === 'top') {
          camera.position.set(0, 30.0 * fit, 0.2);
        } else {
          camera.position.set(0, 19.6 * fit, 18.6 * fit);
        }
        controls.update();
      }
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        applyPendingResize();
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        syncVisualState(dt);
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          const keepGoing =
            renderDirty ||
            pendingSize !== null ||
            transitionActive ||
            snapshotRef.current.status === 'running';
          if (keepGoing && !disposed) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const nw = Math.max(320, container.clientWidth);
      const nh = Math.max(260, container.clientHeight);
      pendingSize = { w: nw, h: nh };
      requestRender();
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneApiRef.current = { rebuildQuiz, applyPreset, requestRender };
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      matTexture.dispose();
      shadowTex.dispose();
      stripeTex.dispose();
      envTex.dispose();
      trailGeo.dispose();
      renderer.dispose();
      sceneApiRef.current = null;
    };
  }, []);

  // Update quiz props & mat texture when quiz or reference path changes
  useEffect(() => {
    sceneApiRef.current?.rebuildQuiz(quiz, showReferencePath);
    sceneApiRef.current?.requestRender();
  }, [quiz, showReferencePath]);

  // Trigger render whenever simulation snapshot changes
  useEffect(() => {
    sceneApiRef.current?.requestRender();
  }, [snapshot]);

  const handlePreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    sceneApiRef.current?.applyPreset(preset);
  };

  const completedSet = new Set(snapshot.completedMissionIds);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl bg-[#c5cdd6]"
      data-testid="simulator-3d"
    >
      {/* Dedicated empty Three.js WebGL mount container */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Projected Station Labels (solid fills — no backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {quiz.missions.map((m) => {
          const done = completedSet.has(m.id);
          return (
            <div
              key={m.id}
              ref={(el) => {
                labelRefs.current[m.id] = el;
              }}
              className={`absolute left-0 top-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-sm transition-colors ${
                done
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
              style={{ opacity: 0 }}
            >
              {done ? `✓ ${m.label}` : m.label}
            </div>
          );
        })}
      </div>

      {/* Camera View Controls (Bottom-Left Dock, matching reference screenshot) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => handlePreset('tilt')}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            cameraPreset === 'tilt'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Nghiêng
        </button>
        <button
          type="button"
          onClick={() => handlePreset('top')}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            cameraPreset === 'top'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Trên xuống
        </button>
        <button
          type="button"
          onClick={() => handlePreset('follow')}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            cameraPreset === 'follow'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Theo robot
        </button>
      </div>

      {/* Orbit Hint (Bottom-Right) */}
      <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-100 sm:block">
        Kéo để xoay · Cuộn để phóng to · Chuột phải để dời
      </div>
    </div>
  );
};
