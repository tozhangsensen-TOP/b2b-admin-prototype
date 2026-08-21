import { useEffect, useRef } from "react";
import { Card } from "antd";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./warehouse-layout-3d.css";

type ZoneDef = {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
};

type FlowDef = {
  name: string;
  color: string;
  points: [number, number][];
};

const zones: ZoneDef[] = [
  { id: "dock-in", name: "1 入库月台", x: -26, z: 19, w: 12, d: 9, color: "#b7e4bc" },

  { id: "receiving", name: "2 收货验收区", x: -16, z: 9, w: 14, d: 10, color: "#bfdbfe" },

  { id: "buffer", name: "3 上架暂存区", x: -2, z: 8, w: 14, d: 9, color: "#bae6fd" },

  { id: "storage", name: "4 存储区（高位货架）", x: -4, z: -9, w: 42, d: 28, color: "#fde68a" },

  { id: "picking", name: "5 拣选区（整件/拆零）", x: 31, z: -11, w: 20, d: 20, color: "#bbf7d0" },

  { id: "packing", name: "6 复核打包区", x: 36, z: 4, w: 12, d: 8, color: "#bfdbfe" },

  { id: "ship-buffer", name: "7 出库暂存区", x: 44, z: 4, w: 12, d: 8, color: "#bfdbfe" },

  { id: "dock-out", name: "8 出库月台", x: 48, z: 22, w: 12, d: 10, color: "#bfdbfe" },

  { id: "office", name: "9 办公区", x: 30, z: -26, w: 10, d: 6, color: "#e5e7eb" },
];

const flows: FlowDef[] = [
  {
    name: "入库流程",
    color: "#22c55e",
    points: [[-30, 21], [-25, 16], [-20, 11], [-8, 9], [-1, 5], [3, -1]],
  },
  {
    name: "出库流程",
    color: "#1677ff",
    points: [[19, -8], [29, -5], [35, -1], [40, 4], [46, 16]],
  },
  {
    name: "补货流程",
    color: "#f97316",
    points: [[5, -1], [12, 2], [18, 4], [21, -2]],
  },
  {
    name: "拣货流程",
    color: "#8b5cf6",
    points: [[23, -2], [26, -2], [29, -2], [32, -5], [35, -5], [38, -5], [35, -8], [32, -8], [29, -8], [26, -11], [23, -11], [26, -14], [29, -14], [32, -14], [35, -17], [38, -17]],
  },
];

function makeMaterial(color: string, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.05, ...options });
}

function createLabelSprite(text: string, options: { width?: number; height?: number; bg?: string; fg?: string; font?: number } = {}) {
  const width = options.width ?? 320;
  const height = options.height ?? 88;
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  const radius = 12;
  ctx.scale(2, 2);
  ctx.fillStyle = options.bg ?? "rgba(15, 23, 42, 0.86)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = options.fg ?? "#ffffff";
  ctx.font = `700 ${options.font ?? 26}px Arial, "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.renderOrder = 10;
  return sprite;
}

function createFloorLabel(text: string, width = 9) {
  const sprite = createLabelSprite(text, { width: 360, height: 86, bg: "rgba(255,255,255,0.86)", fg: "#0f172a", font: 26 });
  sprite.scale.set(width, width * 0.24, 1);
  return sprite;
}

function addShadow(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createPallet(label?: string) {
  const group = new THREE.Group();
  const wood = makeMaterial("#a16207");
  const carton = makeMaterial("#d6b37b");
  const darkCarton = makeMaterial("#b98146");

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 0.95), wood);
  base.position.y = 0.08;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.68, 0.78), carton);
  box.position.y = 0.5;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.74), darkCarton);
  lid.position.y = 0.87;
  group.add(base, box, lid);

  if (label) {
    const tag = createLabelSprite(label, { width: 180, height: 54, bg: "rgba(255,255,255,0.9)", fg: "#334155", font: 20 });
    tag.scale.set(1.1, 0.34, 1);
    tag.position.set(0, 1.12, -0.5);
    group.add(tag);
  }

  addShadow(group);
  return group;
}

function createRackRow(
  rowId: string,
  bays: number,
  levels: number,
  options: { light?: boolean; labelsBothSides?: boolean; highBay?: boolean; sideCode?: "L" | "R"; labelSide?: -1 | 1 } = {},
) {
  const group = new THREE.Group();
  const bayWidth = options.highBay ? 2.45 : options.light ? 1.65 : 2.05;
  const depth = options.highBay ? 1.7 : options.light ? 1.05 : 1.35;
  const height = options.highBay ? 7.4 : options.light ? 3.2 : 5.2;
  const total = bays * bayWidth;
  const postMat = makeMaterial("#1f2937", { metalness: 0.22 });
  const beamMat = makeMaterial(options.light ? "#2563eb" : "#f97316", { metalness: 0.18 });
  const deckMat = makeMaterial("#475569", { metalness: 0.12 });

  // const rowLabelSides = options.labelsBothSides ? [-1, 1] : [options.labelSide ?? -1];
  // rowLabelSides.forEach((side) => {
  //   const labelText = options.highBay ? `${rowId}巷道` : rowId;
  //   const rowLabel = createLabelSprite(labelText, { width: 210, height: 62, bg: "#1d5f9f", fg: "#ffffff", font: 25 });
  //   rowLabel.scale.set(options.highBay ? 2.35 : 1.8, options.highBay ? 0.7 : 0.58, 1);
  //   rowLabel.position.set(-total / 2 + 1.2, height + 0.72, side * (depth * 0.88));
  //   group.add(rowLabel);
  // });

  if (options.highBay) {
    // const baseCode = createLabelSprite(rowId, { width: 140, height: 60, bg: "#1d5f9f", fg: "#ffffff", font: 28 });
    // baseCode.scale.set(1.7, 0.72, 1);
    // baseCode.position.set(-total / 2 + 1.15, 1.02, -depth / 2 - 0.2);
    // group.add(baseCode);

    // const sideMarker = createLabelSprite(options.sideCode ?? "L", { width: 90, height: 64, bg: "rgba(255,255,255,0.94)", fg: "#0f172a", font: 30 });
    // sideMarker.scale.set(0.86, 0.58, 1);
    // sideMarker.position.set(-total / 2 + 1.15, 0.38, -depth / 2 - 0.22);
    // group.add(sideMarker);
const rackLabel = createLabelSprite(
  `${rowId}-${options.sideCode ?? "L"}`,
  {
    width: 220,
    height: 64,
    bg: "rgba(15, 76, 129, 0.8)",
    fg: "#ffffff",
    font: 28,
  }
);

// 缩小一点
rackLabel.scale.set(2.0, 0.7, 1);

// 放到货架端头
rackLabel.position.set(
  -total / 2 + 1.2,
  height + 1.2,
  0
);

group.add(rackLabel);
    
  }

  for (let i = 0; i <= bays; i += 1) {
    const x = -total / 2 + i * bayWidth;
    [-depth / 2, depth / 2].forEach((z) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), postMat);
      post.position.set(x, height / 2, z);
      group.add(post);
    });
  }

  for (let level = 0; level < levels; level += 1) {
    const y = options.highBay ? 0.82 + level * 1.55 : 0.55 + level * (height - 0.8) / levels;
    for (let bay = 0; bay < bays; bay += 1) {
      const x = -total / 2 + bay * bayWidth + bayWidth / 2;
      
      // 第一层不显示横梁和层板
      if (!options.highBay || level > 0) {
        [-depth / 2, depth / 2].forEach((z) => {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.08, 0.1, 0.1), beamMat);
          beam.position.set(x, y, z);
          group.add(beam);
        });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.18, 0.035, depth - 0.14), deckMat);
        deck.position.set(x, y - 0.08, 0);
        group.add(deck);
      }

      const locationSides = options.labelsBothSides ? [-1, 1] : [options.labelSide ?? -1];
      locationSides.forEach((side) => {
        const sideCode = options.highBay
          ? options.labelsBothSides
            ? side < 0
              ? (options.sideCode ?? "L")
              : options.sideCode === "L"
                ? "R"
                : "L"
            : (options.sideCode ?? "L")
          : undefined;
        const locationCode = options.highBay
          ? `${rowId}-${String(bay + 1).padStart(2, "0")}-${String(level + 1).padStart(2, "0")}-${sideCode}`
          : `${rowId}-${String(bay + 1).padStart(2, "0")}-${level + 1}`;
        const loc = createLabelSprite(locationCode, { width: options.highBay ? 220 : 180, height: 66, bg: "rgba(15, 23, 42, 0.75)", fg: "#ffffff", font: options.highBay ? 24 : 22 });
        loc.scale.set(options.highBay ? 1.25 : options.light ? 0.72 : 0.9, options.highBay ? 0.42 : options.light ? 0.26 : 0.32, 1);
        // 高位货架第一层的货位编码位置更低，接近地面
        const locY = options.highBay && level === 0 ? 1.0 : y + (options.highBay ? 0.48 : 0.34);
        loc.position.set(x, locY, side * (depth / 2 + 0.12));
        group.add(loc);
      });

      const shouldLoad = (bay + level + rowId.charCodeAt(rowId.length - 1)) % (options.light ? 3 : 4) !== 0;
      if (shouldLoad) {
        const pallet = createPallet();
        const palletScale = options.highBay ? 1.05 : options.light ? 0.72 : 0.9;
        pallet.scale.set(palletScale, palletScale, palletScale);
        // 第一层托盘直接放在地上
        const palletY = options.highBay && level === 0 ? 0.08 : y - 0.08 + (options.highBay ? 0.12 : 0.34);
        pallet.position.set(x, palletY, 0);
        group.add(pallet);
      }
    }
  }

  addShadow(group);
  return group;
}

function createWall(width: number, depth: number) {
  const group = new THREE.Group();
  const mat = makeMaterial("#cbd5e1");
  const topMat = makeMaterial("#64748b", { metalness: 0.18 });
  const wallH = 3.2;
  const wallT = 0.35;
  [
    { x: 0, z: -depth / 2, w: width, d: wallT },
    { x: 0, z: depth / 2, w: width, d: wallT },
    { x: -width / 2, z: 0, w: wallT, d: depth },
    { x: width / 2, z: 0, w: wallT, d: depth },
  ].forEach((wall) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, wallH, wall.d), mat);
    mesh.position.set(wall.x, wallH / 2, wall.z);
    group.add(mesh);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(wall.w + 0.05, 0.16, wall.d + 0.05), topMat);
    cap.position.set(wall.x, wallH + 0.08, wall.z);
    group.add(cap);
  });
  addShadow(group);
  return group;
}

function createTruck(color: string) {
  const group = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), makeMaterial(color, { metalness: 0.1 }));
  cab.position.set(-2.9, 1.05, 0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2, 2.3), makeMaterial("#dbe4ee"));
  body.position.set(0.8, 1.15, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 2.24), makeMaterial("#60a5fa", { transparent: true, opacity: 0.62 }));
  glass.position.set(-3.2, 1.45, 0);
  group.add(cab, body, glass);
  [-3.5, -1.5, 1.8, 3].forEach((x) => {
    [-1.16, 1.16].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 20), makeMaterial("#111827"));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      group.add(wheel);
    });
  });
  addShadow(group);
  return group;
}

function createForklift() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 1.8), makeMaterial("#f59e0b"));
  body.position.y = 0.55;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.18), makeMaterial("#334155", { metalness: 0.2 }));
  mast.position.set(0, 1.2, -1);
  const forks = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.15), makeMaterial("#334155"));
  forks.position.set(0, 0.28, -1.55);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.0), makeMaterial("#1e293b"));
  guard.position.set(0, 1.75, 0.1);
  group.add(body, mast, forks, guard);
  [-0.48, 0.48].forEach((x) => {
    [-0.56, 0.58].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 18), makeMaterial("#111827"));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.26, z);
      group.add(wheel);
    });
  });
  addShadow(group);
  return group;
}

function createWorker(color = "#2563eb") {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.8, 4, 10), makeMaterial(color));
  body.position.y = 0.68;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), makeMaterial("#f6b294"));
  head.position.y = 1.3;
  group.add(body, head);
  addShadow(group);
  return group;
}

function addArrowFlow(scene: THREE.Scene, flow: FlowDef) {
  const points = flow.points.map(([x, z]) => new THREE.Vector3(x, 0.08, z));
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.08, 10, false),
    makeMaterial(flow.color, { emissive: flow.color, emissiveIntensity: 0.18 }),
  );
  scene.add(tube);

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 24), makeMaterial(flow.color, { emissive: flow.color, emissiveIntensity: 0.25 }));
    cone.position.copy(b);
    cone.position.y = 0.18;
    cone.rotation.x = Math.PI / 2;
    cone.rotation.z = -angle;
    scene.add(cone);
  }

  const label = createLabelSprite(flow.name, { width: 180, height: 56, bg: `${flow.color}dd`, fg: "#ffffff", font: 22 });
  label.scale.set(2.2, 0.68, 1);
  const mid = points[Math.floor(points.length / 2)];
  label.position.set(mid.x, 1.6, mid.z);
  scene.add(label);
}

function createWarehouseLayoutScene(mount: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eef3f8");
  scene.fog = new THREE.Fog("#eef3f8", 70, 150);

  const camera = new THREE.PerspectiveCamera(36, mount.clientWidth / mount.clientHeight, 0.1, 500);
  camera.position.set(30, 29, 32);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.12;
  controls.minDistance = 12;
  controls.maxDistance = 82;
  controls.target.set(3, 2.2, -7);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.15));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.7);
  sun.position.set(28, 48, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 80), makeMaterial("#e7eaee"));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(110, 55, 0xb6c2cf, 0xd7dee7);
  grid.position.y = 0.015;
  scene.add(grid);

  const shell = createWall(94, 62);
  shell.position.set(8, 0, -4);
  scene.add(shell);

  zones.forEach((zone) => {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(zone.w, zone.d),
      makeMaterial(zone.color, { transparent: true, opacity: 0.58, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(zone.x, 0.035, zone.z);
    scene.add(floor);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(zone.w, 0.02, zone.d)),
      new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 }),
    );
    outline.position.set(zone.x, 0.07, zone.z);
    scene.add(outline);

    const label = createFloorLabel(zone.name, Math.min(8.8, Math.max(5.2, zone.w * 0.62)));
    label.position.set(zone.x, zone.id === "storage" ? 10 : 1.25, zone.z - zone.d * 0.22);
    scene.add(label);
  });

  const highRackIslands = [
    { aisle: "A01", x: -20, z: -13 },
    { aisle: "A02", x: -12, z: -13 },
    { aisle: "A03", x: -4, z: -13 },
    { aisle: "A04", x: 4, z: -13 },
    { aisle: "A05", x: 12, z: -13 },
  ];
  highRackIslands.forEach(({ aisle, x, z }) => {
    [
      { side: "L" as const, offset: -0.85, labelSide: -1 as const },
      { side: "R" as const, offset: 0.85, labelSide: 1 as const },
    ].forEach((rackDef) => {
      const rack = createRackRow(aisle, 8, 4, {
        highBay: true,
        sideCode: rackDef.side,
        labelSide: rackDef.labelSide,
      });
      rack.rotation.y = Math.PI / 2;
      rack.position.set(x + rackDef.offset, 0, z);
      scene.add(rack);
    });
  });

  // 拣选区：一半是轻型货架，一半是品地堆位
  // 轻型货架放在靠上位置（z值更小）
  ["P1", "P2"].forEach((id, index) => {
    const rack = createRackRow(id, 6, 2, { light: true, labelSide: -1 });
    rack.position.set(27 + index * 3.2, 0, -12);
    scene.add(rack);
  });

  // 另一半是品地堆位（托盘直接放地上），放在货架靠下位置，都在拣选区内
  for (let i = 0; i < 9; i += 1) {
    const pallet = createPallet(`P-${String(i + 1).padStart(2, "0")}`);
    pallet.position.set(25 + (i % 3) * 2.5, 0.08, -8 + Math.floor(i / 3) * 3.5);
    scene.add(pallet);
  }

  for (let i = 0; i < 16; i += 1) {
    const pallet = createPallet(`B-${String(i + 1).padStart(2, "0")}`);
    pallet.position.set(-7 + (i % 4) * 2.2, 0, 6 + Math.floor(i / 4) * 1.8);
    scene.add(pallet);
  }

  for (let i = 0; i < 14; i += 1) {
    const pallet = createPallet(`S-${String(i + 1).padStart(2, "0")}`);
    pallet.position.set(41 + (i % 3) * 2.2, 0, 2 + Math.floor(i / 3) * 1.8);
    scene.add(pallet);
  }

  for (let i = 0; i < 8; i += 1) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.1), makeMaterial("#f8fafc"));
    table.position.set(30 + (i % 4) * 3, 0.82, 2 + Math.floor(i / 4) * 3.2);
    scene.add(table);
    const legMat = makeMaterial("#64748b", { metalness: 0.2 });
    [-0.9, 0.9].forEach((x) => [-0.4, 0.4].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), legMat);
      leg.position.set(table.position.x + x, 0.4, table.position.z + z);
      scene.add(leg);
    }));
  }

  for (let i = 0; i < 6; i += 1) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.14, 1.1), makeMaterial("#ffffff"));
    desk.position.set(27 + (i % 3) * 2.8, 0.78, -28 + Math.floor(i / 3) * 2.6);
    scene.add(desk);
    const person = createWorker("#475569");
    person.position.set(desk.position.x - 0.45, 0, desk.position.z + 0.95);
    scene.add(person);
  }

  const inboundTruck = createTruck("#0ea5e9");
  inboundTruck.position.set(-35, 0, 24);
  inboundTruck.rotation.y = Math.PI / 2;
  scene.add(inboundTruck);

  const outboundTruck = createTruck("#2563eb");
  outboundTruck.position.set(50, 0, 23);
  outboundTruck.rotation.y = -Math.PI / 2;
  scene.add(outboundTruck);

  const returnTruck = createTruck("#7e57c2");
  returnTruck.position.set(-18, 0, -32);
  scene.add(returnTruck);

  [
    [-13, 6, Math.PI],
    [9, 1, -Math.PI / 2],
    [21, -2, Math.PI / 2],
    [38, 6, Math.PI],
  ].forEach(([x, z, ry]) => {
    const fork = createForklift();
    fork.position.set(x, 0, z);
    fork.rotation.y = ry;
    scene.add(fork);
  });

  [
    [-19, 9, "#2563eb"],
    [-5, 8, "#16a34a"],
    [24, -8, "#16a34a"],
    [34, 4, "#2563eb"],
    [36, -20, "#7c3aed"],
    [-2, -23, "#7c3aed"],
  ].forEach(([x, z, color]) => {
    const worker = createWorker(color as string);
    worker.position.set(x as number, 0, z as number);
    scene.add(worker);
  });

  flows.forEach((flow) => addArrowFlow(scene, flow));

  const title = createLabelSprite("仓库整体布局与业务流转图", { width: 520, height: 86, bg: "rgba(255,255,255,0.88)", fg: "#0f172a", font: 30 });
  title.scale.set(10, 1.65, 1);
  title.position.set(-22, 8, 27);
  scene.add(title);

  let frame = 0;
  const clock = new THREE.Clock();
  const animate = () => {
    frame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    controls.update();
    camera.lookAt(controls.target);
    renderer.render(scene, camera);
  };
  animate();

  const resize = () => {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    renderer.dispose();
    if (mount.contains(renderer.domElement)) {
      mount.removeChild(renderer.domElement);
    }
  };
}

const legend = [
  { name: "入库", color: "#22c55e" },
  { name: "出库", color: "#1677ff" },
  { name: "补货", color: "#f97316" },
  { name: "退货", color: "#7e57c2" },
  { name: "盘点", color: "#14b8a6" },
];

export function WarehouseLayout3dPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    return createWarehouseLayoutScene(mountRef.current);
  }, []);

  return (
    <div className="warehouse-layout-3d-page">
      <div className="warehouse-layout-3d-toolbar">
        <div className="warehouse-layout-3d-title">
          <span>本图为仓库三维布局仿真示意图，用于展示高位货架区、拣选作业区、收发货月台等核心功能区域的立体布局关系，货位编码按标准WMS规则预生成。</span>
        </div>
        <div className="warehouse-layout-3d-legend">
          {legend.map((item) => (
            <span className="warehouse-layout-3d-legend-item" key={item.name}>
              <span className="warehouse-layout-3d-swatch" style={{ background: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <div ref={mountRef} className="warehouse-layout-3d-stage">
          <div className="warehouse-layout-3d-hint">拖拽旋转，滚轮缩放，右键平移</div>
        </div>
      </Card>
    </div>
  );
}

export default WarehouseLayout3dPage;
