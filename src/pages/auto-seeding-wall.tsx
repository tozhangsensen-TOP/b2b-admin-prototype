import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./auto-seeding-wall.css";
import { Card } from "antd";

// ── Palette ────────────────────────────────────────────────────────────────

const C = {
  sorterBody: "#f0fdf4",
  sorterTrim: "#0d9488",
  sorterBase: "#1e293b",
  sorterScreen: "#0f172a",
  binFrame: "#334155",
  binFloor: "#f1f5f9",
  binLip: "#e2e8f0",
  belt: "#10b981",
  beltFrame: "#64748b",
  scanLight: "#f59e0b",
  hlActive: "#bbf7d0",
  hlOrange: "#fed7aa",
  aIn: "#22c55e",
  aSort: "#a855f7",
  aOut: "#1677ff",
  aCollect: "#16a34a",
  aPickup: "#ef4444",
};

const PARCEL_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7"];

// ── Helpers ────────────────────────────────────────────────────────────────

function mat(color: string, o: { transparent?: boolean; opacity?: number } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, transparent: o.transparent ?? false, opacity: o.opacity ?? 1 });
}

function labelTex(text: string, o: { bg?: string; fg?: string; size?: [number, number] } = {}) {
  const [w, h] = o.size ?? [256, 128];
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const x = cv.getContext("2d")!;
  const r = 14;
  x.fillStyle = o.bg ?? "rgba(15,23,42,0.9)";
  x.beginPath();
  x.moveTo(r, 0); x.lineTo(w - r, 0); x.quadraticCurveTo(w, 0, w, r);
  x.lineTo(w, h - r); x.quadraticCurveTo(w, h, w - r, h);
  x.lineTo(r, h); x.quadraticCurveTo(0, h, 0, h - r);
  x.lineTo(0, r); x.quadraticCurveTo(0, 0, r, 0);
  x.closePath(); x.fill();
  x.fillStyle = o.fg ?? "#fff";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `bold ${Math.round(Math.min(w, h) * 0.42)}px monospace`;
  x.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(cv);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}

function addShadows(o: THREE.Object3D) {
  o.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
}

// Ground base texture: subtle grid + vignette
function makeGroundBase(): THREE.CanvasTexture {
  const S = 2048;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const x = cv.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, "#e9edf2");
  g.addColorStop(1, "#e2e7ee");
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  x.strokeStyle = "rgba(148,163,184,0.16)";
  x.lineWidth = 2;
  const step = S / 50; // 2m grid
  for (let i = 0; i <= 50; i++) {
    x.beginPath(); x.moveTo(i * step, 0); x.lineTo(i * step, S); x.stroke();
    x.beginPath(); x.moveTo(0, i * step); x.lineTo(S, i * step); x.stroke();
  }
  const vg = x.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(100,116,139,0.16)");
  x.fillStyle = vg;
  x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ── Building blocks ────────────────────────────────────────────────────────

function makeParcel(color: string): THREE.Group {
  const g = new THREE.Group();
  const s = 0.8 + Math.random() * 0.4; // size variance
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.35 * s, 0.55 * s), mat(color));
  body.position.y = 0.175 * s;
  g.add(body);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.57 * s, 0.03 * s, 0.12 * s), mat("#f59e0b"));
  tape.position.y = 0.36 * s;
  g.add(tape);
  // shipping label sticker
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.012, 0.15 * s), mat("#f8fafc"));
  label.position.set(0.12 * s, 0.356 * s, 0.1 * s);
  g.add(label);
  return g;
}

// Bin chute — open on -X side (faces left toward sorter), walls on +X side
function makeBinChute(id: string, gx: number, gy: number, gz: number, tint = C.binLip): THREE.Group {
  const g = new THREE.Group();
  g.position.set(gx, gy, gz);
  const w = 1.2, h = 0.65, d = 1.3, t = 0.06;

  const back = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat(C.binFrame));
  back.position.set(w / 2 - t / 2, h / 2, 0);
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(w - t, h, t), mat(C.binFrame));
  left.position.set(0, h / 2, -d / 2 + t / 2);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(w - t, h, t), mat(C.binFrame));
  right.position.set(0, h / 2, d / 2 - t / 2);
  g.add(right);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w - t, t, d - t), mat(C.binFrame));
  bottom.position.set(0, t / 2, 0);
  g.add(bottom);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - t * 2, d - t * 2), mat(C.binFloor));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, t + 0.01, 0);
  g.add(floor);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 0.05, d - 0.05), mat(tint));
  lip.position.set(-w / 2 + t / 2, h / 2, 0);
  g.add(lip);

  const lTex = labelTex(id, { bg: "rgba(15,76,129,0.85)", fg: "#fff", size: [128, 64] });
  const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: lTex, depthTest: false }));
  lbl.scale.set(1.0, 0.5, 1);
  lbl.position.set(w / 2 - t - 0.03, h / 2, 0);
  g.add(lbl);

  const hlMat = new THREE.MeshBasicMaterial({ color: C.hlActive, transparent: true, opacity: 0, depthTest: false });
  const hl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), hlMat);
  hl.position.set(-w / 2 + 0.02, h / 2, 0);
  hl.rotation.y = Math.PI / 2;
  g.add(hl);

  g.userData = { binId: id, hlMat, hlTimer: 0, lTex };
  addShadows(g);
  return g;
}

// Main sorter unit (compact white machine)
function makeSorterUnit(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 2.2), mat(C.sorterBody));
  body.position.y = 1.4;
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.22, 2.24), mat(C.sorterTrim));
  stripe.position.y = 2.79;
  g.add(stripe);
  const topLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.28, 12),
    new THREE.MeshStandardMaterial({ color: C.scanLight, emissive: C.scanLight, emissiveIntensity: 1.2 }),
  );
  topLight.position.y = 3.05;
  g.add(topLight);
  // Control panel (front face, -Z side)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.08), mat(C.sorterBase));
  panel.position.set(0, 1.4, 1.11);
  g.add(panel);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.4, 0.02),
    new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 0.4 }),
  );
  screen.position.set(0, 1.75, 1.17);
  g.add(screen);
  for (const sx of [-0.5, 0.5]) {
    const ind = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.15, 0.02),
      new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 0.6 }),
    );
    ind.position.set(sx, 1.25, 1.17);
    g.add(ind);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 2.4), mat(C.sorterBase));
  base.position.y = 0.09;
  g.add(base);

  const sLbl = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTex("分拣主机", { bg: "rgba(13,148,136,0.9)", fg: "#fff", size: [256, 80] }),
    depthTest: false,
  }));
  sLbl.scale.set(1.8, 0.6, 1);
  sLbl.position.set(0, 2.3, 1.15);
  g.add(sLbl);

  g.userData.topLight = topLight;
  addShadows(g);
  return g;
}

// AGV vehicle (orange autonomous cart)
function makeAGV(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), mat("#f97316"));
  body.position.y = 0.32;
  g.add(body);
  const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 12);
  const wheelMat = mat("#111827");
  for (const [wx, wz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.12, wz);
    g.add(w);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.85), mat("#374151"));
  top.position.y = 0.5;
  g.add(top);
  const light = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: "#eab308", emissive: "#eab308", emissiveIntensity: 0.9 }),
  );
  light.position.y = 0.64;
  g.add(light);
  // bumper band
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.92), mat("#c2410c"));
  band.position.y = 0.32;
  g.add(band);
  // headlights (front = +X, direction of travel)
  for (const hz of [-0.25, 0.25]) {
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: "#fefce8", emissive: "#fef9c3", emissiveIntensity: 1.2 }),
    );
    head.position.set(0.46, 0.3, hz);
    g.add(head);
  }
  g.userData.lightMat = light.material as THREE.MeshStandardMaterial;
  addShadows(g);
  return g;
}

// Worker figure (induction operator)
function makeWorker(): THREE.Group {
  const g = new THREE.Group();
  const legMat = mat("#1e3a8a");
  for (const lx of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), legMat);
    leg.position.set(lx, 0.25, 0);
    g.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 10), mat("#3b82f6"));
  torso.position.y = 0.85;
  g.add(torso);
  // safety vest
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.2, 12), mat("#f59e0b"));
  vest.position.y = 0.92;
  g.add(vest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat("#fcd7b0"));
  head.position.y = 1.36;
  g.add(head);
  // helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#eab308"),
  );
  helmet.position.y = 1.4;
  g.add(helmet);
  // arms reaching toward the belt (-Z)
  for (const ax of [-0.2, 0.2]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.5, 8), mat("#3b82f6"));
    arm.position.set(ax, 0.95, -0.28);
    arm.rotation.x = -1.1;
    g.add(arm);
  }
  addShadows(g);
  return g;
}

// Green belt section
function makeBeltSection(length: number, y: number): THREE.Group {
  const g = new THREE.Group();
  const w = 0.9;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, w), mat(C.belt));
  belt.position.y = y + 0.4;
  g.add(belt);
  const frame = mat(C.beltFrame);
  const left = new THREE.Mesh(new THREE.BoxGeometry(length, 0.3, 0.06), frame);
  left.position.set(0, y + 0.25, -w / 2);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(length, 0.3, 0.06), frame);
  right.position.set(0, y + 0.25, w / 2);
  g.add(right);
  const legGeo = new THREE.BoxGeometry(0.1, y + 0.1, 0.1);
  for (const [lx, lz] of [
    [-length / 2 + 0.3, -w / 2 + 0.1],
    [length / 2 - 0.3, -w / 2 + 0.1],
    [-length / 2 + 0.3, w / 2 - 0.1],
    [length / 2 - 0.3, w / 2 - 0.1],
  ]) {
    const leg = new THREE.Mesh(legGeo, frame);
    leg.position.set(lx, (y + 0.1) / 2, lz);
    g.add(leg);
  }
  return g;
}

// ── Scene ──────────────────────────────────────────────────────────────────

function createScene(mount: HTMLDivElement): () => void {
  const scene = new THREE.Scene();
  // Gradient sky backdrop
  const skyCv = document.createElement("canvas");
  skyCv.width = 4;
  skyCv.height = 256;
  const skyX = skyCv.getContext("2d")!;
  const skyG = skyX.createLinearGradient(0, 0, 0, 256);
  skyG.addColorStop(0, "#c9daec");
  skyG.addColorStop(0.55, "#e6edf5");
  skyG.addColorStop(1, "#eef3f8");
  skyX.fillStyle = skyG;
  skyX.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCv);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog("#e6edf5", 60, 140);

  const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.1, 500);
  camera.position.set(4, 15, 19);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.18;
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.target.set(5, 2, 3);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.2));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
  sun.position.set(15, 25, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.4);
  fill.position.set(-12, 12, -8);
  scene.add(fill);

  const groundTex = makeGroundBase();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT (top-down: X=left→right, Z=back→front/toward camera)
  //
  //   分拣主机 与 播种货架 平行对齐，包裹从主机正面进入。
  //
  //   后方(↑-Z)
  //   ┌──────────────────────────────────────────────────────────┐
  //   │   │  [分拣主机] ← 正面面向右侧货架             │          │
  //   │   └───────────────────────────────────────────┘          │
  //   │        ↗ 分拣后投送至对应格口                              │
  //   │   ┌───┬───┬───┬───┬───┬───┐                            │
  //   │   │D13│D14│D15│D16│D17│D18│  (第三层)                    │
  //   │   ├───┼───┼───┼───┼───┼───┤                            │
  //   │   │D07│D08│D09│D10│D11│D12│  (第二层)                    │
  //   │   ├───┼───┼───┼───┼───┼───┤                            │
  //   │   │D01│D02│D03│D04│D05│D06│  (第一层)                    │
  //   │   └───┴───┴───┴───┴───┴───┘  ← 格口面向左侧主机            │
  //   │   ═══════════════════════════  集货传送带                 │
  //   │   ← 集货至发货口 (人工取货)                                │
  //   └──────────────────────────────────────────────────────────┘
  //   前方(↓+Z)
  // ═══════════════════════════════════════════════════════════════════════════

  // Sorter sits in front of the bin wall (left side), facing +X toward the bins.
  // Its long axis (body faces) is parallel to the bin wall's face.
  const SORTER_X = -2;       // sorter center X (in front of wall)
  const SORTER_Z = 2;        // sorter center Z (aligned with wall)

  // ── Sorter unit ──────────────────────────────────────────────────────────

  const sorterUnit = makeSorterUnit();
  sorterUnit.position.set(SORTER_X, 0, SORTER_Z);
  sorterUnit.rotation.y = -Math.PI / 2; // rotate so front face points toward bins
  scene.add(sorterUnit);

  // Scanner gantry arch over the sorter + sweeping scan beam
  const gantryMat = mat("#475569");
  for (const gz of [SORTER_Z - 1.35, SORTER_Z + 1.35]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 0.14), gantryMat);
    post.position.set(SORTER_X, 1.8, gz);
    post.castShadow = true;
    scene.add(post);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.9), gantryMat);
  crossbar.position.set(SORTER_X, 3.65, SORTER_Z);
  crossbar.castShadow = true;
  scene.add(crossbar);
  const scanBeamMat = new THREE.MeshBasicMaterial({
    color: "#ef4444", transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,
  });
  const scanBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.3), scanBeamMat);
  scanBeam.rotation.y = Math.PI / 2;
  scanBeam.position.set(SORTER_X, 1.85, SORTER_Z);
  scene.add(scanBeam);

  // ── Inbound conveyor (operator places parcels onto the belt) ─────────────

  const BELT_TOP = 0.99;           // belt surface height (makeBeltSection y=0.55)
  const BELT_X0 = SORTER_X - 4.2;  // belt start X (induction end, right beside the sorter)

  // Scrolling belt surface texture
  const beltCv = document.createElement("canvas");
  beltCv.width = 128;
  beltCv.height = 128;
  const bx = beltCv.getContext("2d")!;
  bx.fillStyle = "#0f9d6b";
  bx.fillRect(0, 0, 128, 128);
  bx.fillStyle = "rgba(255,255,255,0.16)";
  bx.fillRect(24, 0, 14, 128);
  bx.fillRect(88, 0, 14, 128);
  const beltTex = new THREE.CanvasTexture(beltCv);
  beltTex.colorSpace = THREE.SRGBColorSpace;
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(2, 1);

  const inboundBelt = makeBeltSection(3, 0.55);
  inboundBelt.position.set(SORTER_X - 2.7, 0, SORTER_Z); // spans BELT_X0 .. sorter edge
  (inboundBelt.children[0] as THREE.Mesh).material =
    new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7, metalness: 0.05 });
  scene.add(inboundBelt);
  addShadows(inboundBelt);

  // Induction operator standing at the belt start
  const worker = makeWorker();
  worker.position.set(BELT_X0 - 0.2, 0, SORTER_Z + 1.3);
  scene.add(worker);

  const indSign = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTex("人工投件口", { bg: "rgba(22,163,74,0.92)", fg: "#fff", size: [256, 80] }),
    depthTest: false,
  }));
  indSign.scale.set(2.2, 0.7, 1);
  indSign.position.set(BELT_X0 + 0.6, 2.3, SORTER_Z);
  scene.add(indSign);

  // ── Seeding wall (to the RIGHT of sorter, bins face -X toward sorter) ────

  const WALL_X = 6;          // wall center X (right of sorter)
  const WALL_Z = 2;          // wall Z (parallel-aligned with sorter)
  const WALL_W = 10.5;       // wall width (matches 6 columns)
  const WALL_H = 3.9;        // wall height
  const BIN_Z = WALL_Z - 0.04;

  const wallGroup = new THREE.Group();
  scene.add(wallGroup);

  const wallPanel = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_W, WALL_H, 0.14),
    mat(C.binFrame),
  );
  wallPanel.position.set(WALL_X, WALL_H / 2, WALL_Z);
  wallPanel.castShadow = true;
  wallPanel.receiveShadow = true;
  wallGroup.add(wallPanel);

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_W + 0.3, 0.18, 0.3),
    mat(C.binFrame),
  );
  topFrame.position.set(WALL_X, WALL_H + 0.12, WALL_Z);
  wallGroup.add(topFrame);

  // Top LED strip
  const ledStrip = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_W + 0.3, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: C.sorterTrim, emissive: C.sorterTrim, emissiveIntensity: 0.9 }),
  );
  ledStrip.position.set(WALL_X, WALL_H + 0.26, WALL_Z);
  wallGroup.add(ledStrip);

  // End posts
  for (const pxSide of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H + 0.5, 0.5), mat(C.sorterBase));
    post.position.set(WALL_X + pxSide * (WALL_W / 2 + 0.14), (WALL_H + 0.5) / 2, WALL_Z);
    wallGroup.add(post);
  }

  // Wall header sign
  const wallSign = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTex("智能播种格口墙 · 18 口", { bg: "rgba(51,65,85,0.92)", fg: "#fff", size: [512, 80] }),
    depthTest: false,
  }));
  wallSign.scale.set(4.4, 0.7, 1);
  wallSign.position.set(WALL_X, WALL_H + 0.85, WALL_Z);
  wallGroup.add(wallSign);

  const rowY = [0.0, 1.25, 2.5];
  for (const y of rowY) {
    if (y > WALL_H) continue;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(WALL_W, 0.08, 0.2), mat(C.binFrame));
    beam.position.set(WALL_X, y, WALL_Z + 0.02);
    wallGroup.add(beam);
  }

  const BINS: THREE.Group[] = [];
  const COLS = 6, ROWS = 3;
  const binGapX = WALL_W / COLS;

  const binOpen: Map<string, THREE.Vector3> = new Map();

  const rowTints = ["#bae6fd", "#bbf7d0", "#fde68a"];
  const rowNames = ["一", "二", "三"];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c + 1;
      const id = "D" + String(idx).padStart(2, "0");
      const x = WALL_X - WALL_W / 2 + binGapX * c + binGapX / 2;
      const y = rowY[r];
      const bin = makeBinChute(id, x, y, BIN_Z, rowTints[r]);
      wallGroup.add(bin);
      BINS.push(bin);
      binOpen.set(id, new THREE.Vector3(x - 0.6, y + 0.32, BIN_Z));
    }
    // Row label at the left end of the wall
    const rLbl = new THREE.Sprite(new THREE.SpriteMaterial({
      map: labelTex(`第${rowNames[r]}层`, { bg: "rgba(100,116,139,0.85)", fg: "#fff", size: [192, 64] }),
      depthTest: false,
    }));
    rLbl.scale.set(1.0, 0.34, 1);
    rLbl.position.set(WALL_X - WALL_W / 2 - 0.5, rowY[r] + 0.35, BIN_Z);
    wallGroup.add(rLbl);
  }

  // ── Collection belt (below bins, one per row, runs along +X toward sorter) ─

  const COL_Y = 0.55;
  const colBelts: THREE.Group[] = [];
  for (let r = 0; r < ROWS; r++) {
    const belt = makeBeltSection(11, COL_Y);
    belt.position.set(WALL_X, rowY[r] + 0.0, WALL_Z + 1.5);
    colBelts.push(belt);
    scene.add(belt);
    addShadows(belt);
  }

  // ── AGV lane (in front of collection belts, runs along X) ────────────────

  const AGV_Z = WALL_Z + 3.0;  // in front of collection belts
  const AGV_X_FROM = 4;        // lane start X
  const AGV_X_TO = 12;         // lane end X

  // (AGV lane is painted on the floor via zone markings below)

  // 2 AGV vehicles that shuttle along the lane
  interface AGVState {
    mesh: THREE.Group;
    t: number;
    lightMat: THREE.MeshStandardMaterial;
  }
  const agvs: AGVState[] = [];
  for (let i = 0; i < 2; i++) {
    const agv = makeAGV();
    agv.position.set(AGV_X_FROM + i * 2, 0, AGV_Z);
    agvs.push({ mesh: agv, t: i * 0.5, lightMat: agv.userData.lightMat as THREE.MeshStandardMaterial });
    scene.add(agv);
  }

  // ── Delivery staging zone (right of AGV lane) ────────────────────────────

  const DEL_X = AGV_X_TO + 2;  // right of AGV lane
  const DEL_Z = AGV_Z;
  const DEL_ROWS = 2, DEL_COLS = 3;
  const delGapX = 1.6, delGapZ = 1.2;
  const DEL_W = 1.4, DEL_D = 1.0;

  const deliverySlots: THREE.Group[] = [];
  for (let r = 0; r < DEL_ROWS; r++) {
    for (let c = 0; c < DEL_COLS; c++) {
      const idx = r * DEL_COLS + c + 1;
      const sx = DEL_X + c * delGapX;
      const sz = DEL_Z + r * delGapZ;
      const slot = new THREE.Group();
      slot.position.set(sx, 0, sz);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(DEL_W, 0.08, DEL_D), mat(C.beltFrame));
      tray.position.y = 0.5;
      slot.add(tray);
      for (const dz of [-DEL_D / 2 + 0.06, DEL_D / 2 - 0.06]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(DEL_W, 0.35, 0.06), mat(C.beltFrame));
        rail.position.set(0, 0.33, dz);
        slot.add(rail);
      }
      for (const dx of [-DEL_W / 2 + 0.06, DEL_W / 2 - 0.06]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, DEL_D - 0.12), mat(C.beltFrame));
        rail.position.set(dx, 0.33, 0);
        slot.add(rail);
      }
      const dTex = labelTex(`发货口${idx}`, { bg: "rgba(15,76,129,0.85)", fg: "#fff", size: [128, 64] });
      const dLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: dTex, depthTest: false }));
      dLbl.scale.set(1.3, 0.65, 1);
      dLbl.position.set(0, 1.1, 0);
      slot.add(dLbl);
      const dHlMat = new THREE.MeshBasicMaterial({ color: C.hlOrange, transparent: true, opacity: 0, depthTest: false });
      const dHl = new THREE.Mesh(new THREE.PlaneGeometry(DEL_W - 0.1, DEL_D - 0.1), dHlMat);
      dHl.rotation.x = -Math.PI / 2;
      dHl.position.set(0, 0.52, 0);
      slot.add(dHl);
      slot.userData = { slotId: "S" + String(idx), dHlMat };
      addShadows(slot);
      scene.add(slot);
      deliverySlots.push(slot);
    }
  }

  const delZoneTex = labelTex("发货集货区（人工取货）", { bg: "rgba(239,68,68,0.9)", fg: "#fff", size: [384, 100] });
  const delZoneSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: delZoneTex, depthTest: false }));
  delZoneSpr.scale.set(5, 1.3, 1);
  delZoneSpr.position.set(DEL_X, 2.5, DEL_Z + 1.2);
  scene.add(delZoneSpr);

  // ── Floor zone markings ──────────────────────────────────────────────────

  function makeZoneMark(
    cx: number, cz: number, w: number, d: number, y: number,
    o: { fill: string; border: string; label?: string; labelColor?: string },
  ) {
    const px = 48;
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * px);
    cv.height = Math.round(d * px);
    const x = cv.getContext("2d")!;
    const r = 26, inset = 5;
    x.beginPath();
    x.moveTo(inset + r, inset);
    x.lineTo(cv.width - inset - r, inset);
    x.quadraticCurveTo(cv.width - inset, inset, cv.width - inset, inset + r);
    x.lineTo(cv.width - inset, cv.height - inset - r);
    x.quadraticCurveTo(cv.width - inset, cv.height - inset, cv.width - inset - r, cv.height - inset);
    x.lineTo(inset + r, cv.height - inset);
    x.quadraticCurveTo(inset, cv.height - inset, inset, cv.height - inset - r);
    x.lineTo(inset, inset + r);
    x.quadraticCurveTo(inset, inset, inset + r, inset);
    x.closePath();
    x.fillStyle = o.fill;
    x.fill();
    x.strokeStyle = o.border;
    x.lineWidth = 5;
    x.setLineDash([18, 12]);
    x.stroke();
    if (o.label) {
      x.setLineDash([]);
      x.fillStyle = o.labelColor ?? o.border;
      x.font = "bold 40px sans-serif";
      x.textAlign = "left";
      x.textBaseline = "top";
      x.fillText(o.label, 30, 22);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, y, cz);
    scene.add(m);
  }

  function makeAGVLaneMark(x0: number, x1: number, cz: number) {
    const w = x1 - x0, d = 1.7, px = 48;
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * px);
    cv.height = Math.round(d * px);
    const x = cv.getContext("2d")!;
    x.fillStyle = "rgba(249,115,22,0.10)";
    x.fillRect(0, 0, cv.width, cv.height);
    // hazard stripes on both edges
    const sh = 16;
    for (const bandY of [0, cv.height - sh]) {
      x.save();
      x.beginPath();
      x.rect(0, bandY, cv.width, sh);
      x.clip();
      x.strokeStyle = "rgba(202,138,4,0.75)";
      x.lineWidth = 8;
      for (let sx = -sh; sx < cv.width + sh; sx += 26) {
        x.beginPath();
        x.moveTo(sx, bandY + sh + 6);
        x.lineTo(sx + 16, bandY - 6);
        x.stroke();
      }
      x.restore();
    }
    // dashed center line
    x.strokeStyle = "rgba(249,115,22,0.5)";
    x.lineWidth = 4;
    x.setLineDash([26, 18]);
    x.beginPath();
    x.moveTo(0, cv.height / 2);
    x.lineTo(cv.width, cv.height / 2);
    x.stroke();
    x.setLineDash([]);
    // direction chevrons
    x.fillStyle = "rgba(249,115,22,0.5)";
    for (let sx = 150; sx < cv.width - 40; sx += 140) {
      for (const off of [0, 22]) {
        x.beginPath();
        x.moveTo(sx + off, cv.height / 2 - 15);
        x.lineTo(sx + off + 16, cv.height / 2);
        x.lineTo(sx + off, cv.height / 2 + 15);
        x.lineTo(sx + off + 7, cv.height / 2);
        x.closePath();
        x.fill();
      }
    }
    // lane label
    x.fillStyle = "rgba(194,65,12,0.9)";
    x.font = "bold 30px sans-serif";
    x.textAlign = "left";
    x.textBaseline = "middle";
    x.fillText("AGV 通道", 16, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.025, cz);
    scene.add(m);
  }

  makeZoneMark(BELT_X0 + 0.9, SORTER_Z, 2.6, 2.0, 0.012, {
    fill: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.5)", label: "人工投件口",
  });
  makeZoneMark(SORTER_X, SORTER_Z + 0.2, 5.8, 4.8, 0.015, {
    fill: "rgba(13,148,136,0.07)", border: "rgba(13,148,136,0.55)", label: "分拣区",
  });
  makeZoneMark(WALL_X, WALL_Z, WALL_W + 1.2, 2.4, 0.015, {
    fill: "rgba(51,65,85,0.05)", border: "rgba(51,65,85,0.4)", label: "播种格口墙",
  });
  makeZoneMark(WALL_X, WALL_Z + 1.5, 11.8, 1.6, 0.02, {
    fill: "rgba(22,119,255,0.06)", border: "rgba(22,119,255,0.4)", label: "集货传送带",
  });
  makeAGVLaneMark(AGV_X_FROM - 0.6, AGV_X_TO + 0.6, AGV_Z);
  makeZoneMark(DEL_X + delGapX, DEL_Z + delGapZ / 2, 6.6, 3.6, 0.015, {
    fill: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.45)", label: "发货集货区",
  });

  // ── Fly-curve: sorter → bin opening ──────────────────────────────────────

  function flyToBin(binId: string): THREE.CatmullRomCurve3 {
    const target = binOpen.get(binId)!;
    const start = new THREE.Vector3(SORTER_X, 2.0, SORTER_Z);
    const mid = new THREE.Vector3((start.x + target.x) / 2, 4.0, (start.z + target.z) / 2);
    return new THREE.CatmullRomCurve3([start, mid, target]);
  }

  // ── Flow arrows ──────────────────────────────────────────────────────────

  function addArrow(points: THREE.Vector3[], color: string, label: string, labelUp = 1.2) {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, 0.04, 10, false),
      mat(color, { transparent: true, opacity: 0.85 }),
    );
    scene.add(tube);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const p = curve.getPoint(t);
      const d = curve.getTangent(t);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 8), mat(color));
      cone.position.copy(p);
      cone.lookAt(p.clone().add(d));
      cone.rotateX(Math.PI / 2);
      scene.add(cone);
    }
    const mp = curve.getPoint(0.5);
    const st = new THREE.Sprite(new THREE.SpriteMaterial({
      map: labelTex(label, { bg: color + "dd", fg: "#fff", size: [128, 64] }),
      depthTest: false,
    }));
    st.scale.set(2.0, 1.0, 1);
    st.position.copy(mp).add(new THREE.Vector3(0, labelUp, 0));
    scene.add(st);
  }

  // (入站已由传送带承担，见 Inbound conveyor 段)

  // Sort arrow: sorter (left) → bin wall (right)
  addArrow(
    [
      new THREE.Vector3(SORTER_X, 2.0, SORTER_Z),
      new THREE.Vector3((SORTER_X + WALL_X) / 2 + 1, 3.0, SORTER_Z),
      new THREE.Vector3(WALL_X, 3.8, BIN_Z),
    ],
    C.aSort,
    "分拣",
    1.8,
  );

  addArrow(
    [
      new THREE.Vector3(WALL_X, 0.5, BIN_Z + 0.3),
      new THREE.Vector3(WALL_X, 0.5, WALL_Z + 1.3),
    ],
    C.aOut,
    "出站",
  );

  addArrow(
    [
      new THREE.Vector3(WALL_X, 1.0, AGV_Z),
      new THREE.Vector3((WALL_X + DEL_X) / 2, 1.0, AGV_Z),
      new THREE.Vector3(DEL_X - 2, 1.0, AGV_Z),
    ],
    C.aCollect,
    "集货",
    1.5,
  );

  // ── Title ──────────────────────────────────────────────────────────────────

  const titleSpr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTex("自动播种墙 · 分拣流水线", { bg: "rgba(15,23,42,0.92)", fg: "#fff", size: [512, 100] }),
    depthTest: false,
  }));
  titleSpr.scale.set(8.5, 1.65, 1);
  titleSpr.position.set(8, 7.0, 14);
  scene.add(titleSpr);

  // ── Parcels ──────────────────────────────────────────────────────────────

  interface Parcel {
    mesh: THREE.Group;
    binId: string;
    phase: "inbound" | "sort" | "fly" | "landed" | "collect" | "agv" | "deliver";
    t: number;
    speed: number;
    curve?: THREE.CatmullRomCurve3;
    binX?: number;
    collectRow?: number;
    deliverSlot?: number;
    collectStartX?: number;
    deliverX?: number;
    deliverZ?: number;
  }

  const parcels: Parcel[] = [];

  function disposeParcel(mesh: THREE.Object3D) {
    mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  function spawn() {
    const idx = 1 + Math.floor(Math.random() * 18);
    const binId = "D" + String(idx).padStart(2, "0");
    const mesh = makeParcel(PARCEL_COLORS[Math.floor(Math.random() * PARCEL_COLORS.length)]);
    // Operator places the parcel at the induction end of the inbound belt
    mesh.position.set(BELT_X0 + 0.3, BELT_TOP, SORTER_Z);
    scene.add(mesh);
    parcels.push({ mesh, binId, phase: "inbound", t: 0, speed: 0.11 + Math.random() * 0.03 });
  }

  function lightBin(id: string) {
    for (const b of BINS) {
      if (b.userData.binId === id) {
        const m = b.userData.hlMat as THREE.MeshBasicMaterial;
        if (m) { m.opacity = 0.6; b.userData.hlTimer = 3.0; }
      }
    }
  }

  function lightSlot(idx: number) {
    const s = deliverySlots[idx];
    if (!s) return;
    const m = s.userData.dHlMat as THREE.MeshBasicMaterial;
    if (m) { m.opacity = 0.6; s.userData.hlTimer = 4.0; }
  }

  function setSorterLight(intensity: number) {
    const lm = (sorterUnit.userData.topLight as THREE.Mesh).material as THREE.MeshStandardMaterial;
    lm.emissiveIntensity = intensity;
  }

  // ── Animation ────────────────────────────────────────────────────────────

  let frame = 0;
  const clock = new THREE.Clock();
  let spawnAcc = 0;

  function tick(p: Parcel, dt: number): boolean {
    p.t += dt * p.speed;
    if (p.t > 1) p.t = 1;

    switch (p.phase) {
      case "inbound": {
        // Ride the inbound belt toward the sorter, then lift into the scan point
        p.mesh.position.x = BELT_X0 + 0.3 + (SORTER_X - BELT_X0 - 0.3) * p.t;
        const lift = THREE.MathUtils.smoothstep(p.t, 0.78, 1);
        p.mesh.position.y = BELT_TOP + (2.0 - BELT_TOP) * lift;
        if (p.t >= 1) {
          p.phase = "sort";
          p.t = 0;
        }
        break;
      }
      case "sort": {
        p.mesh.position.y = 2.0 + Math.sin(p.t * 22) * 0.08;
        if (p.t > 0.6) {
          p.phase = "fly";
          p.t = 0;
          p.curve = flyToBin(p.binId);
          lightBin(p.binId);
        }
        break;
      }
      case "fly": {
        const pt = p.curve!.getPoint(p.t);
        p.mesh.position.copy(pt);
        p.mesh.rotation.y += dt * 3;
        if (p.t >= 1) {
          p.phase = "landed";
          p.t = 0;
          const op = binOpen.get(p.binId)!;
          p.mesh.position.set(op.x, op.y - 0.25, op.z);
          p.binX = op.x;
          // Determine which row this bin is on
          p.collectRow = Math.floor((parseInt(p.binId.slice(1), 10) - 1) / COLS);
        }
        break;
      }
      case "landed": {
        if (p.t > 0.5) {
          p.phase = "collect";
          p.t = 0;
          // Slide onto collection belt at this bin column
          p.collectStartX = p.binX!;
          p.mesh.position.set(p.binX!, rowY[p.collectRow!] ?? 0.55, WALL_Z + 1.5);
        }
        break;
      }
      case "collect": {
        // Slide onto collection belt and move toward AGV pickup
        const agvPickupX = AGV_X_FROM - 1;
        p.mesh.position.x = p.collectStartX! + (agvPickupX - p.collectStartX!) * p.t;
        p.mesh.position.z = WALL_Z + 1.5;
        if (p.t >= 1) {
          p.phase = "agv";
          p.t = 0;
          p.deliverSlot = Math.floor(Math.random() * deliverySlots.length);
          p.deliverX = deliverySlots[p.deliverSlot].position.x;
          p.deliverZ = deliverySlots[p.deliverSlot].position.z;
          // Hop onto the first AGV
          const a = agvs[0];
          a.mesh.add(p.mesh);
          p.mesh.position.set(0, 0.6, 0);
          lightSlot(p.deliverSlot!);
        }
        break;
      }
      case "agv": {
        // Ride on AGV — stay attached, dismount after a few seconds
        if (p.t > 3.0) {
          p.phase = "deliver";
          p.t = 0;
          // scene.add auto-removes from the AGV parent
          scene.add(p.mesh);
          p.mesh.position.set(p.deliverX!, 0.65, p.deliverZ!);
        }
        break;
      }
      case "deliver": {
        if (p.t > 0.8) {
          disposeParcel(p.mesh);
          scene.remove(p.mesh);
          return false;
        }
        break;
      }
    }

    return true;
  }

  function animate() {
    frame = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    controls.update();
    camera.lookAt(controls.target);

    spawnAcc += dt;
    if (spawnAcc > 2.2 && parcels.length < 24) { spawn(); spawnAcc = 0; }

    for (let i = parcels.length - 1; i >= 0; i--) {
      if (!tick(parcels[i], dt)) parcels.splice(i, 1);
    }

    for (const b of BINS) {
      const m = b.userData.hlMat as THREE.MeshBasicMaterial;
      if (m && m.opacity > 0) {
        b.userData.hlTimer = (b.userData.hlTimer ?? 0) - dt;
        if (b.userData.hlTimer <= 0) m.opacity = 0;
      }
    }

    for (const s of deliverySlots) {
      const m = s.userData.dHlMat as THREE.MeshBasicMaterial | undefined;
      if (m && m.opacity > 0) {
        s.userData.hlTimer = (s.userData.hlTimer ?? 0) - dt;
        if (s.userData.hlTimer <= 0) m.opacity = 0;
      }
    }

    // AGV shuttles along X axis
    for (const a of agvs) {
      a.t += dt * 0.18;
      if (a.t > 1) a.t = 0;
      const x = AGV_X_FROM + (AGV_X_TO - AGV_X_FROM) * a.t;
      a.mesh.position.set(x, 0, AGV_Z);
      // Blink status light
      a.lightMat.emissiveIntensity = 0.6 + Math.sin(elapsed * 5 + a.t * 6) * 0.4;
    }

    const scanning = parcels.some((p) => p.phase === "sort");
    setSorterLight(scanning ? 2.0 : 0.6 + Math.sin(elapsed * 3) * 0.3);

    // Inbound belt surface scrolls toward the sorter
    beltTex.offset.x = -((elapsed * 0.45) % 1);

    // Scan beam sweeps across the sorter; brighter while a parcel is being scanned
    scanBeam.position.z = SORTER_Z + Math.sin(elapsed * 1.7) * 1.2;
    scanBeamMat.opacity = scanning ? 0.3 + Math.sin(elapsed * 10) * 0.1 : 0.07;

    renderer.render(scene, camera);
  }
  animate();

  function resize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    skyTex.dispose();
    groundTex.dispose();
    beltTex.dispose();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
      if (o instanceof THREE.Sprite) (o.material as THREE.SpriteMaterial).map?.dispose();
    });
    renderer.dispose();
    if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
  };
}

// ── React component ─────────────────────────────────────────────────────────

interface ScanRow { code: string; dest: string; status: "done" | "cur" | "pending"; }

function randBatch() {
  return {
    batch: "BATCH-" + String(10000 + Math.floor(Math.random() * 90000)),
    wave: "WAVE-0727",
    total: 24,
    done: Math.floor(Math.random() * 10) + 2,
    eta: "03:24:00",
    nextDest: "D" + String(1 + Math.floor(Math.random() * 18)).padStart(2, "0"),
  };
}
function randScans(n: number): ScanRow[] {
  const out: ScanRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    out.push({
      code: "SN-" + String(100000 + Math.floor(Math.random() * 900000)),
      dest: "D" + String(1 + Math.floor(Math.random() * 18)).padStart(2, "0"),
      status: r < 0.55 ? "done" : r < 0.85 ? "cur" : "pending",
    });
  }
  return out;
}

function StatsCard() {
  const [batch, setBatch] = useState(randBatch());
  const [scans, setScans] = useState<ScanRow[]>(() => randScans(5));

  useEffect(() => {
    const iv = setInterval(() => {
      setBatch((p) => {
        let d = p.done + 1;
        if (d > p.total) { const f = randBatch(); f.done = 1; setScans(randScans(5)); return f; }
        return { ...p, done: d, nextDest: "D" + String(1 + Math.floor(Math.random() * 18)).padStart(2, "0") };
      });
      setScans((p) => {
        const n = [...p];
        const i = Math.floor(Math.random() * n.length);
        const s = n[i].status;
        n[i] = {
          code: "SN-" + String(100000 + Math.floor(Math.random() * 900000)),
          dest: "D" + String(1 + Math.floor(Math.random() * 18)).padStart(2, "0"),
          status: s === "done" ? "pending" : s === "cur" ? "done" : "cur",
        };
        return n;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const pct = Math.round((batch.done / batch.total) * 100);

  return (
    <div className="asw-panel">
      <div className="asw-card">
        <div className="asw-title">批次信息</div>
        <div className="asw-row"><span className="asw-lab">批次号</span><span className="asw-val">{batch.batch}</span></div>
        <div className="asw-row"><span className="asw-lab">波次</span><span className="asw-val">{batch.wave}</span></div>
        <div className="asw-row"><span className="asw-lab">状态</span>
          <span className="asw-val asw-ok"><span className="asw-dot"></span>分拣中</span>
        </div>
        <div className="asw-row"><span className="asw-lab">预计完成</span><span className="asw-val">{batch.eta}</span></div>
      </div>
      <div className="asw-card">
        <div className="asw-title">分拣进度</div>
        <div className="asw-row"><span className="asw-lab">已播种</span><span className="asw-val asw-ok">{batch.done} / {batch.total}</span></div>
        <div className="asw-row"><span className="asw-lab">待播种</span><span className="asw-val">{batch.total - batch.done}</span></div>
        <div className="asw-row"><span className="asw-lab">目的地</span><span className="asw-val">18</span></div>
        <div className="asw-row"><span className="asw-lab">下一格口</span><span className="asw-val asw-act">{batch.nextDest}</span></div>
        <div className="asw-bar"><div className="asw-fill" style={{ width: `${pct}%` }} /></div>
        <div className="asw-pct">{pct}%</div>
      </div>
      <div className="asw-card">
        <div className="asw-title">实时扫描</div>
        <div className="asw-list">
          {scans.map((r, i) => (
            <div key={i} className={`asw-scan asw-${r.status}`}>
              <span className="asw-code">{r.code}</span>
              <span className="asw-dest">→ {r.dest}</span>
              <span className={`asw-sts asw-${r.status}`}>
                {r.status === "done" ? "已播种 ✓" : r.status === "cur" ? "分拣中" : "待扫描"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="asw-card">
        <div className="asw-title">格口状态</div>
        <div className="asw-grid">
          {Array.from({ length: 18 }, (_, i) => {
            const n = (i + 1) % 5;
            const cls = n === 1 ? "asw-a" : n === 2 ? "asw-b" : "";
            return <div key={i} className={`asw-cell ${cls}`}>D{String(i + 1).padStart(2, "0")}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export function AutoSeedingWallPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    return createScene(mountRef.current);
  }, []);

  return (
    <div className="asw-page">
      <div className="asw-toolbar">
        <div className="asw-tb-left">
          <div className="asw-title-h">自动播种墙 · 分拣流水线仿真</div>
          <div className="asw-sub">
            人工投件上带 → 传送带入站 → 分拣主机扫描识别 → 投放至三层格口 → 集货传送带 → 发货集货区取货
          </div>
        </div>
        <div className="asw-legend">
          <span className="asw-li"><span className="asw-sw" style={{ background: C.aIn }} />入站流</span>
          <span className="asw-li"><span className="asw-sw" style={{ background: C.aSort }} />分拣流</span>
          <span className="asw-li"><span className="asw-sw" style={{ background: C.aOut }} />出站流</span>
          <span className="asw-li"><span className="asw-sw" style={{ background: "#16a34a" }} />集货传送</span>
          <span className="asw-li"><span className="asw-sw" style={{ background: C.hlOrange }} />发货集货区</span>
        </div>
      </div>
      <div className="asw-stage">
        <div className="asw-3d-wrap">
          <Card styles={{ body: { padding: 0 } }}>
            <div ref={mountRef} className="asw-3d">
              <div className="asw-hint">拖拽旋转 · 滚轮缩放 · 右键平移</div>
            </div>
          </Card>
        </div>
        <StatsCard />
      </div>
    </div>
  );
}
