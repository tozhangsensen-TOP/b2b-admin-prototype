import { useEffect, useRef, useState } from "react";
import { Button, Card, Select, Space, Tag, Typography } from "antd";
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./warehouse-3d.css";

const { Text } = Typography;

type JobType = "收货上架" | "上架" | "下架" | "收货" | "补货";

const jobOptions: { value: JobType; label: string }[] = [
  { value: "收货上架", label: "收货上架" },
  { value: "上架", label: "叉车上架" },
  { value: "下架", label: "下架" },
  { value: "收货", label: "收货" },
  { value: "补货", label: "补货" },
];

function makeMaterial(color: string, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...options });
}

function createLabelSprite(text: string, color = "rgba(15,23,42,0.86)") {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.86)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, 352, 88, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = '700 34px Arial, "Microsoft YaHei", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 180, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.renderOrder = 10;
  return sprite;
}

function addShadow(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createPallet(label?: string) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.92), makeMaterial("#92400e"));
  base.position.y = 0.08;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.74, 0.72), makeMaterial("#d6b37b"));
  box.position.y = 0.54;
  group.add(base, box);
  if (label) {
    const tag = createLabelSprite(label, "rgba(255,255,255,0.92)");
    (tag.material as THREE.SpriteMaterial).color.set("#334155");
    tag.scale.set(1.1, 0.32, 1);
    tag.position.set(0, 1.08, -0.48);
    group.add(tag);
  }
  addShadow(group);
  return group;
}

function createRack(row: string, bays = 8, levels = 3) {
  const group = new THREE.Group();
  const bayWidth = 2.1;
  const depth = 1.35;
  const height = 5.2;
  const total = bayWidth * bays;
  const postMat = makeMaterial("#1f2937", { metalness: 0.25 });
  const beamMat = makeMaterial("#f97316", { metalness: 0.18 });
  const deckMat = makeMaterial("#475569");

  const rowLabel = createLabelSprite(row);
  rowLabel.scale.set(1.7, 0.48, 1);
  rowLabel.position.set(-total / 2 + 0.95, height + 0.52, -1);
  group.add(rowLabel);

  for (let i = 0; i <= bays; i += 1) {
    const x = -total / 2 + i * bayWidth;
    [-depth / 2, depth / 2].forEach((z) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), postMat);
      post.position.set(x, height / 2, z);
      group.add(post);
    });
  }

  for (let level = 0; level < levels; level += 1) {
    const y = 0.62 + level * 1.55;
    for (let bay = 0; bay < bays; bay += 1) {
      const x = -total / 2 + bay * bayWidth + bayWidth / 2;
      [-depth / 2, depth / 2].forEach((z) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.1, 0.1, 0.1), beamMat);
        beam.position.set(x, y, z);
        group.add(beam);
      });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.18, 0.035, depth - 0.14), deckMat);
      deck.position.set(x, y - 0.08, 0);
      group.add(deck);

      const loc = createLabelSprite(`${row}-${String(bay + 1).padStart(2, "0")}-${level + 1}`, "rgba(255,255,255,0.92)");
      loc.scale.set(0.92, 0.26, 1);
      loc.position.set(x, y + 0.32, -depth / 2 - 0.08);
      group.add(loc);

      if ((bay + level + row.charCodeAt(0)) % 4 !== 0) {
        const pallet = createPallet();
        pallet.scale.set(0.86, 0.86, 0.86);
        pallet.position.set(x, y + 0.34, 0);
        group.add(pallet);
      }
    }
  }
  addShadow(group);
  return group;
}

function createForklift() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 1.9), makeMaterial("#f59e0b"));
  body.position.y = 0.56;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.45, 0.18), makeMaterial("#334155", { metalness: 0.25 }));
  mast.position.set(0, 1.26, -1.05);
  const forks = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.08, 1.22), makeMaterial("#334155"));
  forks.position.set(0, 0.3, -1.62);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.0), makeMaterial("#1e293b"));
  guard.position.set(0, 1.78, 0.08);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 16), makeMaterial("#f97316", { emissive: "#f97316", emissiveIntensity: 0.65 }));
  beacon.position.set(0, 1.96, 0.1);
  group.add(body, mast, forks, guard, beacon);

  [-0.52, 0.52].forEach((x) => {
    [-0.58, 0.58].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 18), makeMaterial("#111827"));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.26, z);
      group.add(wheel);
    });
  });
  addShadow(group);
  return group;
}

function createZone(name: string, x: number, z: number, w: number, d: number, color: string) {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial(color, { transparent: true, opacity: 0.58, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.03, z);
  const label = createLabelSprite(name, "rgba(255,255,255,0.86)");
  label.scale.set(Math.min(6.6, w * 0.58), 1.05, 1);
  label.position.set(x, 1.12, z);
  group.add(floor, label);
  return group;
}

function createLegacyWarehouseScene(mount: HTMLDivElement, onStatus: (status: string) => void, onProgress: (progress: number) => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eef3f8");
  scene.fog = new THREE.Fog("#eef3f8", 55, 130);

  const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 300);
  camera.position.set(28, 27, 36);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minDistance = 16;
  controls.maxDistance = 80;
  controls.target.set(4, 2, -2);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.55);
  sun.position.set(24, 42, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(72, 54), makeMaterial("#e7eaee"));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(72, 36, 0xb6c2cf, 0xd7dee7);
  grid.position.y = 0.015;
  scene.add(grid);

  scene.add(createZone("收货验收区", -17, 12, 14, 8, "#bfdbfe"));
  scene.add(createZone("上架暂存区", -4, 10, 12, 7, "#bae6fd"));
  scene.add(createZone("存储区", 6, -6, 34, 24, "#fde68a"));
  scene.add(createZone("月台", -18, 20, 18, 5, "#bbf7d0"));

  ["A", "B", "C", "D"].forEach((row, index) => {
    const rack = createRack(`${row}区`);
    rack.rotation.y = Math.PI / 2;
    rack.position.set(-2 + index * 5.2, 0, -8);
    scene.add(rack);
  });

  for (let i = 0; i < 12; i += 1) {
    const pallet = createPallet(`暂-${String(i + 1).padStart(2, "0")}`);
    pallet.position.set(-8 + (i % 4) * 2.1, 0, 7.4 + Math.floor(i / 4) * 1.8);
    scene.add(pallet);
  }

  const forklift = createForklift();
  forklift.position.set(-13, 0, 12);
  forklift.rotation.y = Math.PI;
  scene.add(forklift);

  const path: THREE.Vector3[] = [
    new THREE.Vector3(-13, 0, 12),
    new THREE.Vector3(-4, 0, 9),
    new THREE.Vector3(1, 0, 4),
    new THREE.Vector3(7, 0, -2),
    new THREE.Vector3(7, 0, -11),
    new THREE.Vector3(-13, 0, 12),
  ];

  let running = false;
  let progress = 0;
  let frame = 0;
  const clock = new THREE.Clock();

  function resetScene() {
    progress = 0;
    running = false;
    forklift.position.copy(path[0]);
    forklift.rotation.y = Math.PI;
    onProgress(0);
    onStatus("已重置");
  }

  function start(job: JobType) {
    running = true;
    progress = 0;
    onProgress(0);
    onStatus(`${job}作业中`);
  }

  function pause() {
    running = !running;
    onStatus(running ? "继续作业" : "已暂停");
  }

  const animate = () => {
    frame = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (running) {
      progress += dt * 0.08;
      if (progress >= 1) {
        progress = 1;
        running = false;
        onStatus("作业完成");
      }

      const segmentFloat = progress * (path.length - 1);
      const segmentIndex = Math.min(Math.floor(segmentFloat), path.length - 2);
      const t = segmentFloat - segmentIndex;
      const from = path[segmentIndex];
      const to = path[segmentIndex + 1];
      forklift.position.lerpVectors(from, to, t);
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      forklift.rotation.y = Math.atan2(dx, dz);
      onProgress(Math.round(progress * 100));
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const resize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  window.addEventListener("resize", resize);

  return {
    start,
    pause,
    reset: resetScene,
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
          else obj.material.dispose();
        }
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    },
  };
}

export function Warehouse3dPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createLegacyWarehouseScene> | null>(null);
  const [jobType, setJobType] = useState<JobType>("收货上架");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("等待开始");

  useEffect(() => {
    if (!mountRef.current) return undefined;
    sceneRef.current = createLegacyWarehouseScene(mountRef.current, setStatusText, setProgress);
    return () => sceneRef.current?.dispose();
  }, []);

  const handleStart = () => {
    sceneRef.current?.start(jobType);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    sceneRef.current?.pause();
    setIsPaused((value) => !value);
  };

  const handleReset = () => {
    sceneRef.current?.reset();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title={
          <Space>
            <Text strong style={{ fontSize: 16 }}>库房3D页面</Text>
            <Tag color="blue">Three.js</Tag>
          </Space>
        }
        extra={
          <Select
            value={jobType}
            onChange={(value: JobType) => {
              setJobType(value);
              handleReset();
            }}
            options={jobOptions}
            style={{ width: 140 }}
            size="small"
          />
        }
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-3 border-b" style={{ background: "#fafafa" }}>
          <Space wrap>
            <Button
              type="primary"
              icon={isPlaying && !isPaused ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={isPlaying ? handlePause : handleStart}
            >
              {isPlaying && !isPaused ? "暂停" : isPaused ? "继续" : "播放"}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            <div style={{ width: 200, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#1677ff", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{progress}%</Text>
            </div>
            <Tag color={isPlaying ? (isPaused ? "warning" : "processing") : "default"}>
              {isPlaying ? (isPaused ? "已暂停" : "播放中") : "已停止"}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>{statusText}</Text>
          </Space>
        </div>
        <div ref={mountRef} className="warehouse-3d-container" style={{ width: "100%", height: 600, position: "relative" }} />
      </Card>
    </div>
  );
}

export default Warehouse3dPage;
