import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { X, ZoomIn, RotateCcw, Box, Info, Image as ImageIcon, Eye, Home, Layers, Settings2, Sliders, Maximize2 } from "lucide-react";
import { 
  getBuildingVerticesMeters, 
  BuildingShapeType, 
  CutCornerOrientation,
  FenceMaterialType,
  GateType,
  getFenceColor,
  getFenceHeight
} from "../utils/shapeUtils";
import { 
  Building3DStyle, 
  BuildingFloorPlan, 
  WALL_MATERIALS, 
  ROOF_TYPES, 
  ROOF_MATERIALS,
  FacadeOpening
} from "../types/architecturalTypes";
import { Building3DCustomizerModal } from "./Building3DCustomizerModal";
import { FloorPlanModal } from "./FloorPlanModal";

interface BoundaryLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthLabel: string;
  linkedObjectId?: string;
  fenceMaterial?: FenceMaterialType;
  gateType?: GateType;
  gateMaterial?: FenceMaterialType;
  gateWidthMeters?: number;
  gatePositionPct?: number;
}

interface PlanogramBuilding {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xMeters?: number;
  yMeters?: number;
  wMeters?: number;
  hMeters?: number;
  itemType?: string;
  subType?: string;
  rotation?: number;
  label: string;
  color: string;
  emoji?: string;
  linkedObjectId?: string;
  shapeType?: BuildingShapeType;
  cutCorner?: CutCornerOrientation;
  wingWidthPct?: number;
  wingDepthPct?: number;
  customVertices?: Array<{ x: number; y: number }>;
  fenceMaterial?: FenceMaterialType;
  gateType?: GateType;
  gateMaterial?: FenceMaterialType;
  architecturalStyle?: Building3DStyle;
  floorPlan?: BuildingFloorPlan;
}

interface SecondaryBuilding {
  id: string;
  parentId: string;
  type: string;
  name: string;
  builderType?: string;
  contractorName?: string;
  materials?: string;
  completionYear?: string;
  operationNotes?: string;
  wishes?: string;
  growthTimeline?: Array<{ title: string; date: string; photoUrl: string }>;
}

interface PlantNode {
  id: string;
  name: string;
  category: "bush" | "flowerbed" | "conifer" | "deciduous" | "bed";
  x: number;
  y: number;
  xMeters?: number;
  yMeters?: number;
  diameterMeters?: number;
  plantingYear: string;
  specs: string;
  careGuidance: string;
  frequency: string;
  growthPhotos?: Array<{ date: string; url: string; notes: string }>;
  remarks: string;
}

interface Property3DViewerProps {
  planBuildings: PlanogramBuilding[];
  secondaryBuildings: SecondaryBuilding[];
  plantNodes: PlantNode[];
  boundaryLines?: BoundaryLine[];
  globalFenceMaterial?: FenceMaterialType;
  plotWidth: number; // in meters (W)
  plotHeight: number; // in meters (H)
  plotCorners?: Array<{ x: number; y: number }>;
  onUpdateBuilding?: (id: string, updates: Partial<PlanogramBuilding>) => void;
  onClose: () => void;
}

export const Property3DViewer: React.FC<Property3DViewerProps> = ({
  planBuildings,
  secondaryBuildings,
  plantNodes,
  boundaryLines = [],
  globalFenceMaterial = "wood",
  plotWidth,
  plotHeight,
  plotCorners,
  onUpdateBuilding,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<"building" | "plant" | null>(null);
  const [showHelperPanel, setShowHelperPanel] = useState<boolean>(true);
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);

  // Architectural customization & floor planning modals state
  const [customizingBuilding, setCustomizingBuilding] = useState<PlanogramBuilding | null>(null);
  const [floorPlanningBuilding, setFloorPlanningBuilding] = useState<PlanogramBuilding | null>(null);
  const [isCutawayView, setIsCutawayView] = useState<boolean>(false);

  // Keep refs for animation and camera manipulation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const objectsGroupRef = useRef<THREE.Group | null>(null);

  // Synchronized prop refs to avoid stale closures in event listeners & animation loops
  const planBuildingsRef = useRef(planBuildings);
  const plantNodesRef = useRef(plantNodes);
  const secondaryBuildingsRef = useRef(secondaryBuildings);

  useEffect(() => {
    planBuildingsRef.current = planBuildings;
    plantNodesRef.current = plantNodes;
    secondaryBuildingsRef.current = secondaryBuildings;
  }, [planBuildings, plantNodes, secondaryBuildings]);

  // Dimensions of plot
  const W = plotWidth || 45;
  const H = plotHeight || 30;

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear any previous canvas element to completely avoid duplicates/overlapping renderers
    mountRef.current.innerHTML = "";

    // 1. Initialize Scene, Camera & Renderer
    // Fallback if clientWidth/clientHeight are initially 0
    const initialWidth = mountRef.current.clientWidth || 500;
    const initialHeight = mountRef.current.clientHeight || 550;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#0a0f1d"); // Modern dark slate background
    scene.fog = new THREE.FogExp2("#0a0f1d", 0.015);

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    cameraRef.current = camera;
    // Position camera at comfortable angled view
    camera.position.set(W / 2, Math.max(W, H) * 0.9, H * 1.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set styles on the canvas to ensure it is displayed correctly
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";

    mountRef.current.appendChild(renderer.domElement);

    // 2. Add OrbitControls with Touch configuration
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera going below ground
    controls.minDistance = 3;
    controls.maxDistance = Math.max(W, H) * 3;
    controls.target.set(W / 2, 0, H / 2); // Look at center of plot
    
    // Enable mobile touch controls (1 finger rotate, 2 finger zoom/pan)
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.update();

    // Setup ResizeObserver for robust sizing inside hidden containers/animations
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: entryWidth, height: entryHeight } = entry.contentRect;
        // Use clientWidth/clientHeight as backup in case contentRect is not populated
        const targetWidth = entryWidth || (mountRef.current ? mountRef.current.clientWidth : 0);
        const targetHeight = entryHeight || (mountRef.current ? mountRef.current.clientHeight : 550);

        if (targetWidth > 0 && targetHeight > 0) {
          camera.aspect = targetWidth / targetHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(targetWidth, targetHeight);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#fff4e0", 1.2); // Warm daylight
    dirLight.position.set(W * 1.5, Math.max(W, H) * 1.5, H * 1.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = Math.max(W, H) * 4;
    const d = Math.max(W, H) * 1.2;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Dynamic light helper
    const dirLight2 = new THREE.DirectionalLight("#80a0ff", 0.4); // Cool skylight fill
    dirLight2.position.set(-W * 0.5, Math.max(W, H) * 0.8, -H * 0.5);
    scene.add(dirLight2);

    // 4. Ground Plane (Grass Plot)
    let groundGeometry: THREE.BufferGeometry;
    if (plotCorners && plotCorners.length >= 3) {
      const shape = new THREE.Shape();
      plotCorners.forEach((c, idx) => {
        const x3d = c.x;
        const y_shape = c.y - H; // Negative shape Y so that -y_shape is positive Z after rotateX(-Math.PI / 2)
        if (idx === 0) {
          shape.moveTo(x3d, y_shape);
        } else {
          shape.lineTo(x3d, y_shape);
        }
      });
      shape.closePath();
      groundGeometry = new THREE.ShapeGeometry(shape);
      // Rotate XY plane to horizontal XZ plane facing upwards
      groundGeometry.rotateX(-Math.PI / 2);
    } else {
      groundGeometry = new THREE.PlaneGeometry(W, H);
      // Rotate to sit horizontal (XY to XZ)
      groundGeometry.rotateX(-Math.PI / 2);
      // Shift so bottom-left is at (0, 0, 0)
      groundGeometry.translate(W / 2, 0, H / 2);
    }

    // Grass texture simulation using checkerboard/noise colors
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#27542d", // Rich deep grass
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // 5. Grid Helper & Plot Boundaries
    const gridHelper = new THREE.GridHelper(Math.max(W, H) * 1.2, Math.max(W, H) * 1.2, "#4a7a50", "#234127");
    gridHelper.position.set(W / 2, 0.01, H / 2);
    scene.add(gridHelper);

    // Visual fence/boundary outline
    const fenceMat = new THREE.MeshStandardMaterial({ color: "#544338", roughness: 0.8 });
    const cornerCoordinates = (plotCorners && plotCorners.length >= 3)
      ? plotCorners.map(c => ({ x: c.x, z: H - c.y }))
      : [
          { x: 0, z: H },
          { x: W, z: H },
          { x: W, z: 0 },
          { x: 0, z: 0 },
        ];

    // Build custom boundary fence lines with materials & gates
    const linesToBuild = (boundaryLines && boundaryLines.length > 0)
      ? boundaryLines.map(bl => ({
          p1: { x: (bl.startX / 100) * W, z: H - (bl.startY / 100) * H },
          p2: { x: (bl.endX / 100) * W, z: H - (bl.endY / 100) * H },
          fenceMat: bl.fenceMaterial || globalFenceMaterial,
          gateType: bl.gateType || "none",
          gateMat: bl.gateMaterial || bl.fenceMaterial || globalFenceMaterial,
          gateWidth: bl.gateWidthMeters || (bl.gateType === "wicket" ? 1.2 : 4.0),
          gatePosPct: bl.gatePositionPct || 50
        }))
      : cornerCoordinates.map((p1, idx) => {
          const p2 = cornerCoordinates[(idx + 1) % cornerCoordinates.length];
          return {
            p1,
            p2,
            fenceMat: globalFenceMaterial,
            gateType: idx === 0 ? "gate_swing" as GateType : idx === 2 ? "wicket" as GateType : "none" as GateType,
            gateMat: globalFenceMaterial,
            gateWidth: idx === 0 ? 4.0 : 1.2,
            gatePosPct: 50
          };
        });

    linesToBuild.forEach(bl => {
      const p1 = bl.p1;
      const p2 = bl.p2;
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
      if (dist < 0.1) return;

      const fMatHex = getFenceColor(bl.fenceMat);
      const fMat = new THREE.MeshStandardMaterial({ color: fMatHex, roughness: 0.7 });

      // Corner Pillar at start
      const pillarGeo = new THREE.BoxGeometry(0.25, 1.8, 0.25);
      pillarGeo.translate(p1.x, 0.9, p1.z);
      const pillar = new THREE.Mesh(pillarGeo, fMat);
      pillar.castShadow = true;
      scene.add(pillar);

      if (!bl.gateType || bl.gateType === "none") {
        // Continuous fence wall / rails
        const fenceWallGeo = new THREE.BoxGeometry(0.08, 1.4, dist);
        const fenceWallMesh = new THREE.Mesh(fenceWallGeo, fMat);
        fenceWallMesh.position.set((p1.x + p2.x) / 2, 0.7, (p1.z + p2.z) / 2);
        fenceWallMesh.lookAt(new THREE.Vector3(p2.x, 0.7, p2.z));
        fenceWallMesh.castShadow = true;
        scene.add(fenceWallMesh);
      } else {
        // Fence with embedded Gate / Wicket
        const gw = Math.min(dist * 0.8, bl.gateWidth);
        const gPosDist = dist * (bl.gatePosPct / 100);

        const seg1Len = Math.max(0, gPosDist - gw / 2);
        const seg2Len = Math.max(0, dist - (gPosDist + gw / 2));

        // Direction vector along line
        const dx = (p2.x - p1.x) / dist;
        const dz = (p2.z - p1.z) / dist;

        // Segment 1 (before gate)
        if (seg1Len > 0.1) {
          const s1Center = { x: p1.x + dx * (seg1Len / 2), z: p1.z + dz * (seg1Len / 2) };
          const s1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, seg1Len), fMat);
          s1Mesh.position.set(s1Center.x, 0.7, s1Center.z);
          s1Mesh.lookAt(new THREE.Vector3(p2.x, 0.7, p2.z));
          s1Mesh.castShadow = true;
          scene.add(s1Mesh);
        }

        // Segment 2 (after gate)
        if (seg2Len > 0.1) {
          const s2StartDist = gPosDist + gw / 2;
          const s2Center = { x: p1.x + dx * (s2StartDist + seg2Len / 2), z: p1.z + dz * (s2StartDist + seg2Len / 2) };
          const s2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, seg2Len), fMat);
          s2Mesh.position.set(s2Center.x, 0.7, s2Center.z);
          s2Mesh.lookAt(new THREE.Vector3(p2.x, 0.7, p2.z));
          s2Mesh.castShadow = true;
          scene.add(s2Mesh);
        }

        // Gate Structure at Center
        const gCenter = { x: p1.x + dx * gPosDist, z: p1.z + dz * gPosDist };
        const gMatHex = getFenceColor(bl.gateMat);
        const gateLeafMat = new THREE.MeshStandardMaterial({ color: gMatHex, roughness: 0.5 });
        const postMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.4 });

        // 2 Gate Posts
        const post1Pos = { x: p1.x + dx * (gPosDist - gw / 2), z: p1.z + dz * (gPosDist - gw / 2) };
        const post2Pos = { x: p1.x + dx * (gPosDist + gw / 2), z: p1.z + dz * (gPosDist + gw / 2) };

        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 0.2), postMat);
        post1.position.set(post1Pos.x, 1.0, post1Pos.z);
        post1.castShadow = true;
        scene.add(post1);

        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 0.2), postMat);
        post2.position.set(post2Pos.x, 1.0, post2Pos.z);
        post2.castShadow = true;
        scene.add(post2);

        // Gate Door Leaf
        const gateLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, gw * 0.95), gateLeafMat);
        gateLeaf.position.set(gCenter.x, 0.95, gCenter.z);
        gateLeaf.lookAt(new THREE.Vector3(p2.x, 0.95, p2.z));
        gateLeaf.castShadow = true;
        scene.add(gateLeaf);
      }
    });

    // 6. Dynamic Objects Container Group
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // 8. Raycasting and Click Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let startX = 0;
    let startY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      startX = event.clientX;
      startY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      const diffX = Math.abs(event.clientX - startX);
      const diffY = Math.abs(event.clientY - startY);

      // If the user dragged more than 5px (rotating, zooming, panning), do not trigger click
      if (diffX > 5 || diffY > 5) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Find meshes that were clicked
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        // Traverse up to find root group with name (id)
        let matchedId: string | null = null;
        let matchedType: "building" | "plant" | null = null;

        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr && curr !== scene) {
            if (curr.name) {
              const id = curr.name;
              if (planBuildingsRef.current.some((b) => b.id === id)) {
                matchedId = id;
                matchedType = "building";
                break;
              }
              if (plantNodesRef.current.some((p) => p.id === id)) {
                matchedId = id;
                matchedType = "plant";
                break;
              }
            }
            curr = curr.parent;
          }
          if (matchedId) break;
        }

        if (matchedId && matchedType) {
          setSelectedObjectId(matchedId);
          setSelectedObjectType(matchedType);
          focusCameraOnObject(matchedId);
        } else {
          // If clicked the ground or empty space, deselect
          setSelectedObjectId(null);
          setSelectedObjectType(null);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    // 9. Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Dynamic ambient effects (swaying trees or moving water ripples)
      const elapsedTime = clock.getElapsedTime();
      meshMapRef.current.forEach((obj, id) => {
        const isPlant = plantNodesRef.current.some((p) => p.id === id);
        if (isPlant && obj) {
          // Subtle swaying in the wind
          obj.rotation.z = Math.sin(elapsedTime * 1.5 + (obj.position.x * 0.1)) * 0.02;
          obj.rotation.x = Math.cos(elapsedTime * 1.2 + (obj.position.z * 0.1)) * 0.015;
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 10. Handle Window Resizing
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Signal that the 3D scene is fully initialized and refs are populated
    setIsSceneReady(true);

    // Cleanup
    return () => {
      setIsSceneReady(false);
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      
      if (mountRef.current) {
        try {
          if (mountRef.current.contains(renderer.domElement)) {
            mountRef.current.removeChild(renderer.domElement);
          }
        } catch (e) {
          // Ignore
        }
      }
      renderer.dispose();
    };
  }, [W, H, JSON.stringify(plotCorners)]);

  useEffect(() => {
    if (!isSceneReady) return;
    const scene = sceneRef.current;
    const group = objectsGroupRef.current;
    if (!scene || !group) return;

    // Dispose geometries and materials of existing meshes to prevent memory leaks
    const disposeNode = (node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry) node.geometry.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach((mat) => mat.dispose());
        } else if (node.material) {
          node.material.dispose();
        }
      }
      if (node.children) {
        node.children.forEach(disposeNode);
      }
    };

    while (group.children.length > 0) {
      const child = group.children[0];
      disposeNode(child);
      group.remove(child);
    }
    meshMapRef.current.clear();

    const textureLoader = new THREE.TextureLoader();

    // 6. Build 3D Buildings
    planBuildings.forEach((b) => {
      const w = b.wMeters || 4;
      const d = b.hMeters || 4; // on planogram height is depth in 3D
      const posX = (b.xMeters || 0) + w / 2;
      const posZ = H - (b.yMeters || 0) - d / 2;

      // Determine height depending on subtype
      let h = 4.5; // Default height in meters
      let colorCode = b.color || "rgba(245, 158, 11, 0.25)";
      // Parse color code to hex
      let hexColor = "#c2915b"; // Warm wood by default
      if (colorCode.includes("rgba")) {
        const matches = colorCode.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (matches) {
          hexColor = `#${((1 << 24) + (parseInt(matches[1]) << 16) + (parseInt(matches[2]) << 8) + parseInt(matches[3])).toString(16).slice(1)}`;
        }
      }

      const type = b.subType || "other";
      const lbl = (b.label || "").toLowerCase();
      const sub = (b.subType || "").toLowerCase();

      const isSwings = type === "swings" || type === "swing" || sub === "swings" || sub === "swing" || lbl.includes("качел");
      const isSportsOrWorkout = type === "sports" || type === "workout" || type === "sports_ground" || sub === "sports" || sub === "workout" || sub === "sports_ground" || sub === "gym" || lbl.includes("спорт") || lbl.includes("турник") || lbl.includes("воркаут") || lbl.includes("брусь") || lbl.includes("шведск") || lbl.includes("тренажер");
      const isPlayground = type === "playground" || type === "children" || sub === "playground" || sub === "children" || lbl.includes("детск") || lbl.includes("горка") || lbl.includes("игров");
      const isBonfire = type === "bonfire" || type === "firepit" || sub === "bonfire" || sub === "firepit" || lbl.includes("кострищ") || lbl.includes("очаг") || lbl.includes("костер");
      const isBbq = type === "bbq" || type === "barbecue" || sub === "bbq" || lbl.includes("мангал") || lbl.includes("барбек") || lbl.includes("гриль");
      const isPergola = type === "pergola" || type === "gazebo" || sub === "pergola" || sub === "gazebo" || lbl.includes("бесед") || lbl.includes("пергол");

      if (isSportsOrWorkout) {
        h = 2.5;
      } else if (isPlayground) {
        h = 2.6;
      } else if (isSwings) {
        h = 2.3;
      } else if (isBonfire) {
        h = 0.5;
      } else if (isBbq) {
        h = 1.6;
      } else if (isPergola) {
        h = 3.2;
      } else {
        switch (type) {
          case "house":
            h = 7.0; // Large 2-story
            break;
          case "banya":
            h = 4.0;
            break;
          case "garage":
            h = 3.2;
            break;
          case "greenhouse":
            h = 2.8;
            break;
          case "pool":
            h = 0.15; // Sunk flat pool
            break;
          case "sewer_well":
            h = 0.1;
            break;
          case "water_well":
            h = 1.8;
            break;
          case "electric_panel":
            h = 1.5;
            break;
          case "lawn":
            h = 0.05;
            break;
          case "flower_bed":
            h = 0.25;
            break;
          case "health_trail":
            h = 0.05;
            break;
          case "garden_fence":
            h = 1.0;
            break;
          case "parking":
            h = 0.05;
            break;
          case "carport":
            h = 2.6;
            break;
          case "water_tap":
            h = 0.8;
            break;
          case "electric_outlet":
            h = 0.6;
            break;
          case "irrigation":
            h = 0.15;
            break;
          default:
            h = 3.5;
        }
      }

      // Check for user-uploaded photographs in SecondaryBuilding to use as Front Facade Texture!
      const matchedSB = secondaryBuildings.find((sb) => sb.id === b.id);
      const hasPhotos = matchedSB && matchedSB.growthTimeline && matchedSB.growthTimeline.length > 0;
      let facadeTexture: THREE.Texture | null = null;

      if (hasPhotos && matchedSB.growthTimeline) {
        // Find latest photograph
        const latestPhoto = matchedSB.growthTimeline[matchedSB.growthTimeline.length - 1];
        if (latestPhoto && latestPhoto.photoUrl) {
          try {
            facadeTexture = textureLoader.load(latestPhoto.photoUrl);
            facadeTexture.colorSpace = THREE.SRGBColorSpace;
          } catch (e) {
            console.error("Failed to load facade texture in 3D", e);
          }
        }
      }

      // Create geometry group for complex objects
      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(posX, 0, posZ);
      buildingGroup.name = b.id;

      // Pool handles differently (sunk reflective surface)
      if (type === "pool") {
        // Outer rim
        const rimGeo = new THREE.BoxGeometry(w, 0.2, d);
        const rimMat = new THREE.MeshStandardMaterial({ color: "#cfd5db", roughness: 0.3 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.y = 0.1;
        rim.receiveShadow = true;
        buildingGroup.add(rim);

        // Water mesh
        const waterGeo = new THREE.PlaneGeometry(w - 0.4, d - 0.4);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMat = new THREE.MeshStandardMaterial({
          color: "#4da6ff",
          roughness: 0.1,
          metalness: 0.8,
          transparent: true,
          opacity: 0.85,
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.16;
        buildingGroup.add(water);
      } else if (type === "greenhouse") {
        // 🌿 3D Арочная поликарбонатная теплица с грядками внутри
        const baseH = 0.2; // Высота бруса фундамента
        const archTotalH = Math.max(2.1, h || 2.4);
        const halfW = w / 2;
        const wallH = 0.7; // Высота прямой боковой стенки

        const ghFrameMat = new THREE.MeshStandardMaterial({
          color: "#cbd5e1",
          roughness: 0.2,
          metalness: 0.8,
        });
        const ghGlassMat = new THREE.MeshStandardMaterial({
          color: "#e0f2fe",
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        const woodBaseMat = new THREE.MeshStandardMaterial({
          color: "#78350f",
          roughness: 0.8,
        });
        const soilMat = new THREE.MeshStandardMaterial({
          color: "#3f2305",
          roughness: 0.95,
        });
        const plantLeafMat = new THREE.MeshStandardMaterial({
          color: "#15803d",
          roughness: 0.6,
        });
        const tomatoMat = new THREE.MeshStandardMaterial({
          color: "#ef4444",
          roughness: 0.3,
        });

        // 1. Фундаментный брус
        const baseBox = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, d), woodBaseMat);
        baseBox.position.y = baseH / 2;
        baseBox.receiveShadow = true;
        baseBox.castShadow = true;
        buildingGroup.add(baseBox);

        // 2. Купол из сотового поликарбоната (ExtrudeGeometry)
        const ghShape = new THREE.Shape();
        ghShape.moveTo(-halfW, baseH);
        ghShape.lineTo(-halfW, baseH + wallH);
        ghShape.quadraticCurveTo(0, baseH + archTotalH + 0.1, halfW, baseH + wallH);
        ghShape.lineTo(halfW, baseH);
        ghShape.closePath();

        const extrudeSettings = {
          depth: d,
          bevelEnabled: false,
        };
        const ghGeo = new THREE.ExtrudeGeometry(ghShape, extrudeSettings);
        ghGeo.translate(0, 0, -d / 2);

        const ghMesh = new THREE.Mesh(ghGeo, ghGlassMat);
        ghMesh.castShadow = true;
        ghMesh.receiveShadow = true;
        buildingGroup.add(ghMesh);

        // 3. Оцинкованные силовые дуги каркаса
        const numRibs = Math.max(3, Math.floor(d / 0.8) + 1);
        for (let i = 0; i < numRibs; i++) {
          const zPos = -d / 2 + (d / (numRibs - 1)) * i;

          const ribShape = new THREE.Shape();
          ribShape.moveTo(-halfW, baseH);
          ribShape.lineTo(-halfW, baseH + wallH);
          ribShape.quadraticCurveTo(0, baseH + archTotalH + 0.1, halfW, baseH + wallH);
          ribShape.lineTo(halfW, baseH);

          const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: 0.04, bevelEnabled: false });
          ribGeo.translate(0, 0, -0.02);
          const ribMesh = new THREE.Mesh(ribGeo, ghFrameMat);
          ribMesh.position.z = zPos;
          buildingGroup.add(ribMesh);
        }

        // 4. Дверные проемы на торцах (Front & Back doors)
        const doorW = Math.min(0.8, w * 0.4);
        const doorH = 1.7;
        const doorFrameMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.4, metalness: 0.7 });

        [-d / 2 + 0.01, d / 2 - 0.01].forEach((zDoor) => {
          const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.03), doorFrameMat);
          door.position.set(0, baseH + doorH / 2, zDoor);
          buildingGroup.add(door);
        });

        // 5. Внутренние грядки и зелень
        const bedW = Math.max(0.4, (w - 0.5) / 2);
        const bedL = d * 0.85;

        const leftBedSoil = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.15, bedL), soilMat);
        leftBedSoil.position.set(-halfW + bedW / 2 + 0.1, baseH + 0.075, 0);
        buildingGroup.add(leftBedSoil);

        const rightBedSoil = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.15, bedL), soilMat);
        rightBedSoil.position.set(halfW - bedW / 2 - 0.1, baseH + 0.075, 0);
        buildingGroup.add(rightBedSoil);

        const numPlants = Math.max(2, Math.floor(bedL / 0.6));
        for (let p = 0; p < numPlants; p++) {
          const pZ = -bedL / 2 + (bedL / (numPlants - 1)) * p;

          const pLeftGroup = new THREE.Group();
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), plantLeafMat);
          bush.position.set(-halfW + bedW / 2 + 0.1, baseH + 0.32, pZ);
          pLeftGroup.add(bush);

          const tom = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), tomatoMat);
          tom.position.set(-halfW + bedW / 2 + 0.12, baseH + 0.3, pZ + 0.05);
          pLeftGroup.add(tom);

          buildingGroup.add(pLeftGroup);

          const pRightGroup = new THREE.Group();
          const bushR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), plantLeafMat);
          bushR.position.set(halfW - bedW / 2 - 0.1, baseH + 0.32, pZ);
          pRightGroup.add(bushR);

          const tomR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), tomatoMat);
          tomR.position.set(halfW - bedW / 2 - 0.12, baseH + 0.3, pZ - 0.05);
          pRightGroup.add(tomR);

          buildingGroup.add(pRightGroup);
        }
      } else if (type === "sewer_well") {
        const wellGeo = new THREE.CylinderGeometry(w / 2, w / 2, 0.08, 16);
        wellGeo.translate(0, 0.04, 0);
        const wellMat = new THREE.MeshStandardMaterial({ color: "#374151", roughness: 0.8 });
        const wellMesh = new THREE.Mesh(wellGeo, wellMat);
        wellMesh.castShadow = true;
        wellMesh.receiveShadow = true;
        buildingGroup.add(wellMesh);

        // Inner manhole cover
        const coverGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.4, 0.02, 16);
        coverGeo.translate(0, 0.09, 0);
        const coverMat = new THREE.MeshStandardMaterial({ color: "#1f2937", roughness: 0.9, metalness: 0.5 });
        const coverMesh = new THREE.Mesh(coverGeo, coverMat);
        coverMesh.castShadow = true;
        buildingGroup.add(coverMesh);
      } else if (type === "water_well") {
        // Stone well cylinder base
        const stoneGeo = new THREE.CylinderGeometry(w / 2, w / 2, 0.8, 16);
        stoneGeo.translate(0, 0.4, 0);
        const stoneMat = new THREE.MeshStandardMaterial({ color: "#78716c", roughness: 0.9 });
        const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
        stoneMesh.castShadow = true;
        stoneMesh.receiveShadow = true;
        buildingGroup.add(stoneMesh);

        // Wooden frame (pillars)
        const pillarMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.8 });
        const p1Geo = new THREE.BoxGeometry(0.08, 1.4, 0.08);
        p1Geo.translate(-w / 3.5, 1.1, 0);
        const p1 = new THREE.Mesh(p1Geo, pillarMat);
        p1.castShadow = true;
        buildingGroup.add(p1);

        const p2Geo = new THREE.BoxGeometry(0.08, 1.4, 0.08);
        p2Geo.translate(w / 3.5, 1.1, 0);
        const p2 = new THREE.Mesh(p2Geo, pillarMat);
        p2.castShadow = true;
        buildingGroup.add(p2);

        // Crossbar
        const barGeo = new THREE.BoxGeometry(w * 0.8, 0.06, 0.06);
        barGeo.translate(0, 1.7, 0);
        const bar = new THREE.Mesh(barGeo, pillarMat);
        bar.castShadow = true;
        buildingGroup.add(bar);

        // Small pitched roof
        const roofGeo = new THREE.ConeGeometry(w * 0.65, 0.6, 4);
        roofGeo.rotateY(Math.PI / 4);
        roofGeo.translate(0, 2.0, 0);
        const rMat = new THREE.MeshStandardMaterial({ color: "#9a2a2a", roughness: 0.6 });
        const roofMesh = new THREE.Mesh(roofGeo, rMat);
        roofMesh.castShadow = true;
        buildingGroup.add(roofMesh);
      } else if (type === "electric_panel") {
        const postMat = new THREE.MeshStandardMaterial({ color: "#4b5563", metalness: 0.7, roughness: 0.3 });
        // Support posts
        const leg1Geo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
        leg1Geo.translate(-w / 4, 0.2, 0);
        const leg1 = new THREE.Mesh(leg1Geo, postMat);
        leg1.castShadow = true;
        buildingGroup.add(leg1);

        const leg2Geo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
        leg2Geo.translate(w / 4, 0.2, 0);
        const leg2 = new THREE.Mesh(leg2Geo, postMat);
        leg2.castShadow = true;
        buildingGroup.add(leg2);

        // Main grey cabinet box
        const cabGeo = new THREE.BoxGeometry(w, 1.1, d);
        cabGeo.translate(0, 0.95, 0);
        const cabMat = new THREE.MeshStandardMaterial({ color: "#6b7280", roughness: 0.4, metalness: 0.6 });
        const cabinet = new THREE.Mesh(cabGeo, cabMat);
        cabinet.castShadow = true;
        buildingGroup.add(cabinet);

        // Lightning bolt yellow shield accent
        const shieldGeo = new THREE.BoxGeometry(0.15, 0.3, 0.02);
        shieldGeo.translate(0, 0.95, d / 2 + 0.01);
        const shieldMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.3 });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        buildingGroup.add(shield);
      } else if (type === "lawn") {
        // Flat green patch of lush grass
        const lawnGeo = new THREE.BoxGeometry(w, 0.03, d);
        lawnGeo.translate(0, 0.015, 0);
        const lawnMat = new THREE.MeshStandardMaterial({ color: "#10b981", roughness: 0.9 });
        const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
        lawnMesh.receiveShadow = true;
        buildingGroup.add(lawnMesh);
      } else if (type === "flower_bed") {
        // Decorative flower bed frame
        const frameGeo = new THREE.BoxGeometry(w, 0.15, d);
        frameGeo.translate(0, 0.075, 0);
        const fMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, fMat);
        frame.castShadow = true;
        frame.receiveShadow = true;
        buildingGroup.add(frame);

        // Dark-brown soil in the middle
        const soilGeo = new THREE.BoxGeometry(w - 0.15, 0.05, d - 0.15);
        soilGeo.translate(0, 0.12, 0);
        const sMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 });
        const soil = new THREE.Mesh(soilGeo, sMat);
        soil.receiveShadow = true;
        buildingGroup.add(soil);

        // Bright small spheres representing flowers
        const flowerColors = ["#ef4444", "#eab308", "#ec4899", "#a855f7", "#3b82f6"];
        for (let f = 0; f < 8; f++) {
          const fx = ((f % 4) / 3 - 0.5) * (w - 0.4);
          const fz = (f < 4 ? -0.25 : 0.25) * (d - 0.4);
          const flGeo = new THREE.SphereGeometry(0.1, 6, 6);
          flGeo.translate(fx, 0.18, fz);
          const flMat = new THREE.MeshStandardMaterial({ 
            color: flowerColors[f % flowerColors.length], 
            roughness: 0.6 
          });
          const flower = new THREE.Mesh(flGeo, flMat);
          flower.castShadow = true;
          buildingGroup.add(flower);

          // Green leaf stem
          const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4);
          stemGeo.translate(fx, 0.12 + 0.05, fz);
          const stemMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.8 });
          const stem = new THREE.Mesh(stemGeo, stemMat);
          buildingGroup.add(stem);
        }
      } else if (isSportsOrWorkout) {
        // 🏋️‍♂️ 3D Спортивный комплекс / Воркаут площадка
        const metalYellowMat = new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.8, roughness: 0.2 });
        const metalBlueMat = new THREE.MeshStandardMaterial({ color: "#0284c7", metalness: 0.8, roughness: 0.2 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: "#f1f5f9", metalness: 0.95, roughness: 0.1 });
        const rubberTileMat = new THREE.MeshStandardMaterial({ color: "#991b1b", roughness: 0.9 }); // Terracotta rubber
        const capMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4 });
        const woodBoardMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.8 });

        // 1. Rubber Safety Mat Base
        const rubberBase = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), rubberTileMat);
        rubberBase.position.y = 0.02;
        rubberBase.receiveShadow = true;
        buildingGroup.add(rubberBase);

        // 2. Main Vertical Posts (4 corner pillars for the main workout rack)
        const pillarH = 2.4;
        const postRadius = 0.045;
        const rackW = Math.min(w * 0.7, 2.5);
        const rackD = Math.min(d * 0.6, 1.2);

        const postsCoords = [
          { x: -rackW / 2, z: -rackD / 2 },
          { x: rackW / 2, z: -rackD / 2 },
          { x: -rackW / 2, z: rackD / 2 },
          { x: rackW / 2, z: rackD / 2 },
        ];

        postsCoords.forEach((p) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, pillarH, 12), metalYellowMat);
          post.position.set(p.x, pillarH / 2 + 0.04, p.z);
          post.castShadow = true;
          buildingGroup.add(post);

          // Plastic top cap
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(postRadius + 0.01, postRadius + 0.01, 0.06, 12), capMat);
          cap.position.set(p.x, pillarH + 0.07, p.z);
          buildingGroup.add(cap);
        });

        // 3. Multi-level Pull-up Bars (Турники разной высоты)
        const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rackW, 12), chromeMat);
        bar1.rotation.z = Math.PI / 2;
        bar1.position.set(0, 2.3, -rackD / 2);
        bar1.castShadow = true;
        buildingGroup.add(bar1);

        const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rackW, 12), chromeMat);
        bar2.rotation.z = Math.PI / 2;
        bar2.position.set(0, 1.95, rackD / 2);
        bar2.castShadow = true;
        buildingGroup.add(bar2);

        const bar3 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rackD, 12), chromeMat);
        bar3.rotation.x = Math.PI / 2;
        bar3.position.set(-rackW / 2, 1.6, 0);
        bar3.castShadow = true;
        buildingGroup.add(bar3);

        // 4. Swedish Wall Ladder (Шведская стенка)
        const numRungs = 7;
        for (let r = 0; r < numRungs; r++) {
          const ry = 0.5 + r * 0.26;
          const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, rackD, 10), chromeMat);
          rung.rotation.x = Math.PI / 2;
          rung.position.set(rackW / 2, ry, 0);
          rung.castShadow = true;
          buildingGroup.add(rung);
        }

        // 5. Monkey Bars Ladder (Рукоход)
        const numMonkeyRungs = 6;
        for (let m = 0; m < numMonkeyRungs; m++) {
          const mx = -rackW / 2 + (rackW / Math.max(1, numMonkeyRungs - 1)) * m;
          const mrung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, rackD, 10), chromeMat);
          mrung.rotation.x = Math.PI / 2;
          mrung.position.set(mx, 2.38, 0);
          mrung.castShadow = true;
          buildingGroup.add(mrung);
        }

        // 6. Parallel Dip Bars (Брусья)
        const dipH = 1.25;
        const dipW = 0.55;
        const dipL = 1.2;
        const dipX = Math.max(-w / 2 + 0.8, -rackW / 2 - 0.7);

        const dipPost1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dipH, 10), metalBlueMat);
        dipPost1.position.set(dipX, dipH / 2 + 0.04, -dipW / 2);
        dipPost1.castShadow = true;
        buildingGroup.add(dipPost1);

        const dipPost2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dipH, 10), metalBlueMat);
        dipPost2.position.set(dipX, dipH / 2 + 0.04, dipW / 2);
        dipPost2.castShadow = true;
        buildingGroup.add(dipPost2);

        const dipBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dipL, 10), chromeMat);
        dipBar1.rotation.z = Math.PI / 2;
        dipBar1.position.set(dipX, dipH + 0.04, -dipW / 2);
        dipBar1.castShadow = true;
        buildingGroup.add(dipBar1);

        const dipBar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dipL, 10), chromeMat);
        dipBar2.rotation.z = Math.PI / 2;
        dipBar2.position.set(dipX, dipH + 0.04, dipW / 2);
        dipBar2.castShadow = true;
        buildingGroup.add(dipBar2);

        // 7. Incline Abdominal Board (Скамья для пресса)
        const benchBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.35), woodBoardMat);
        benchBoard.rotation.z = -0.35;
        benchBoard.position.set(w / 3, 0.5, -d / 4);
        benchBoard.castShadow = true;
        buildingGroup.add(benchBoard);

        const benchLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), metalBlueMat);
        benchLeg.position.set(w / 3 + 0.5, 0.35, -d / 4);
        buildingGroup.add(benchLeg);

        // 8. Basketball Backboard & Hoop
        const bbBoard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.03), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 }));
        bbBoard.position.set(rackW / 2 + 0.02, 2.4, rackD / 2);
        bbBoard.rotation.y = Math.PI / 2;
        bbBoard.castShadow = true;
        buildingGroup.add(bbBoard);

        const bbRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 16), new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.3 }));
        bbRim.rotation.x = Math.PI / 2;
        bbRim.position.set(rackW / 2 + 0.2, 2.25, rackD / 2);
        buildingGroup.add(bbRim);

      } else if (isPlayground) {
        // 🏰 3D Детская площадка с игровой башенкой, горкой и лесенкой
        const sandMat = new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.95 });
        const playWoodMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.7 });
        const slideRedMat = new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.3 });
        const roofYellowMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.4 });
        const railBlueMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.5 });

        // Sand Base
        const sandFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), sandMat);
        sandFloor.position.y = 0.02;
        sandFloor.receiveShadow = true;
        buildingGroup.add(sandFloor);

        // Tower
        const towerW = Math.min(w * 0.4, 1.8);
        const towerD = Math.min(d * 0.4, 1.8);
        const towerH = 1.2;

        const pCoords = [
          { x: -towerW / 2, z: -towerD / 2 },
          { x: towerW / 2, z: -towerD / 2 },
          { x: -towerW / 2, z: towerD / 2 },
          { x: towerW / 2, z: towerD / 2 },
        ];
        pCoords.forEach((p) => {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), playWoodMat);
          pillar.position.set(p.x, 1.1, p.z);
          pillar.castShadow = true;
          buildingGroup.add(pillar);
        });

        const platform = new THREE.Mesh(new THREE.BoxGeometry(towerW, 0.06, towerD), playWoodMat);
        platform.position.set(0, towerH, 0);
        platform.castShadow = true;
        buildingGroup.add(platform);

        const fenceBack = new THREE.Mesh(new THREE.BoxGeometry(towerW, 0.4, 0.03), railBlueMat);
        fenceBack.position.set(0, towerH + 0.2, -towerD / 2);
        buildingGroup.add(fenceBack);

        const fenceLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, towerD), railBlueMat);
        fenceLeft.position.set(-towerW / 2, towerH + 0.2, 0);
        buildingGroup.add(fenceLeft);

        const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(towerW * 0.8, 0.8, 4), roofYellowMat);
        towerRoof.rotation.y = Math.PI / 4;
        towerRoof.position.set(0, 2.2 + 0.4, 0);
        towerRoof.castShadow = true;
        buildingGroup.add(towerRoof);

        // Slide
        const slideLength = 1.8;
        const slideAngle = 0.55;
        const slideGroup = new THREE.Group();
        slideGroup.position.set(0, towerH, towerD / 2);

        const slideTrough = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, slideLength), slideRedMat);
        slideTrough.rotation.x = slideAngle;
        slideTrough.position.set(0, -0.45, slideLength / 2 - 0.1);
        slideTrough.castShadow = true;
        slideGroup.add(slideTrough);

        const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, slideLength), slideRedMat);
        railLeft.rotation.x = slideAngle;
        railLeft.position.set(-0.25, -0.4, slideLength / 2 - 0.1);
        slideGroup.add(railLeft);

        const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, slideLength), slideRedMat);
        railRight.rotation.x = slideAngle;
        railRight.position.set(0.25, -0.4, slideLength / 2 - 0.1);
        slideGroup.add(railRight);

        buildingGroup.add(slideGroup);

        // Steps Ladder
        const numSteps = 5;
        for (let s = 0; s < numSteps; s++) {
          const sy = (towerH / numSteps) * s + 0.1;
          const sz = -towerD / 2 - (s * 0.12);
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.12), playWoodMat);
          step.position.set(0, sy, sz);
          step.castShadow = true;
          buildingGroup.add(step);
        }

      } else if (isSwings) {
        // 🎠 3D Качели
        const sWoodMat = new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.8 });
        const metalFrameMat = new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.8, roughness: 0.2 });
        const chainMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.9, roughness: 0.1 });

        // Left A-frame
        const leftGroup = new THREE.Group();
        const legA1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 10), metalFrameMat);
        legA1.position.set(0, 1.15, -0.45);
        legA1.rotation.x = 0.22;
        legA1.castShadow = true;
        leftGroup.add(legA1);

        const legA2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 10), metalFrameMat);
        legA2.position.set(0, 1.15, 0.45);
        legA2.rotation.x = -0.22;
        legA2.castShadow = true;
        leftGroup.add(legA2);

        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.6), metalFrameMat);
        brace.position.set(0, 0.9, 0);
        leftGroup.add(brace);

        leftGroup.position.set(-w / 2 + 0.15, 0, 0);
        buildingGroup.add(leftGroup);

        // Right A-frame
        const rightGroup = leftGroup.clone();
        rightGroup.position.set(w / 2 - 0.15, 0, 0);
        buildingGroup.add(rightGroup);

        // Top horizontal beam
        const tBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, w, 12), metalFrameMat);
        tBeam.rotation.z = Math.PI / 2;
        tBeam.position.set(0, 2.25, 0);
        tBeam.castShadow = true;
        buildingGroup.add(tBeam);

        // Double Swings Seats & Chains
        const seatPositions = [-w * 0.22, w * 0.22];
        seatPositions.forEach((sx) => {
          const seatW = 0.45;
          const chainL = 1.6;

          const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, chainL, 6), chainMat);
          c1.position.set(sx - seatW / 2, 2.25 - chainL / 2, 0);
          buildingGroup.add(c1);

          const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, chainL, 6), chainMat);
          c2.position.set(sx + seatW / 2, 2.25 - chainL / 2, 0);
          buildingGroup.add(c2);

          const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW + 0.06, 0.035, 0.24), sWoodMat);
          seat.position.set(sx, 2.25 - chainL, 0);
          seat.castShadow = true;
          buildingGroup.add(seat);
        });

      } else if (isBonfire) {
        // 🔥 3D Кострище / Очаг
        const stoneMat = new THREE.MeshStandardMaterial({ color: "#78716c", roughness: 0.9 });
        const ashMat = new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.95 });
        const logMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 });
        const fireMat = new THREE.MeshStandardMaterial({ 
          color: "#f97316", 
          roughness: 0.2, 
          emissive: "#ef4444", 
          emissiveIntensity: 0.8 
        });

        const radius = Math.min(w, d) / 2;

        const baseArea = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.03, 20), stoneMat);
        baseArea.position.y = 0.015;
        baseArea.receiveShadow = true;
        buildingGroup.add(baseArea);

        const ringGeo = new THREE.TorusGeometry(radius * 0.45, 0.12, 8, 16);
        ringGeo.rotateX(Math.PI / 2);
        const stoneRing = new THREE.Mesh(ringGeo, stoneMat);
        stoneRing.position.y = 0.12;
        stoneRing.castShadow = true;
        buildingGroup.add(stoneRing);

        const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, 0.05, 16), ashMat);
        ashBed.position.y = 0.04;
        buildingGroup.add(ashBed);

        for (let l = 0; l < 5; l++) {
          const angle = (l / 5) * Math.PI * 2;
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), logMat);
          log.rotation.z = 0.4;
          log.rotation.y = angle;
          log.position.set(Math.cos(angle) * 0.1, 0.2, Math.sin(angle) * 0.1);
          log.castShadow = true;
          buildingGroup.add(log);
        }

        const fireFlame = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.25, 0.45, 8), fireMat);
        fireFlame.position.y = 0.28;
        buildingGroup.add(fireFlame);

        const benchDist = radius * 0.75;
        const benchAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        benchAngles.forEach((a) => {
          const logBench = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, radius * 0.6, 12), logMat);
          logBench.rotation.z = Math.PI / 2;
          logBench.rotation.y = a;
          logBench.position.set(Math.cos(a) * benchDist, 0.12, Math.sin(a) * benchDist);
          logBench.castShadow = true;
          buildingGroup.add(logBench);
        });

      } else if (isBbq) {
        // 🍖 3D Мангал / Барбекю
        const metalDarkMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4, metalness: 0.8 });
        const metalRoofMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.3, metalness: 0.8 });
        const woodStackMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.9 });
        const grillGridMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.2, metalness: 0.9 });

        const postH = 0.8;
        const bw = Math.min(w * 0.8, 1.4);
        const bd = Math.min(d * 0.7, 0.6);

        const bLegs = [
          { x: -bw / 2 + 0.05, z: -bd / 2 + 0.05 },
          { x: bw / 2 - 0.05, z: -bd / 2 + 0.05 },
          { x: -bw / 2 + 0.05, z: bd / 2 - 0.05 },
          { x: bw / 2 - 0.05, z: bd / 2 - 0.05 },
        ];

        bLegs.forEach((leg) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, postH, 0.04), metalDarkMat);
          p.position.set(leg.x, postH / 2, leg.z);
          p.castShadow = true;
          buildingGroup.add(p);
        });

        const trough = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.22, bd), metalDarkMat);
        trough.position.set(0, postH + 0.11, 0);
        trough.castShadow = true;
        buildingGroup.add(trough);

        const grill = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 0.02, bd * 0.85), grillGridMat);
        grill.position.set(0, postH + 0.23, 0);
        buildingGroup.add(grill);

        const roofH = 1.6;
        bLegs.forEach((leg) => {
          const roofPost = new THREE.Mesh(new THREE.BoxGeometry(0.03, roofH, 0.03), metalDarkMat);
          roofPost.position.set(leg.x, roofH / 2 + 0.1, leg.z);
          buildingGroup.add(roofPost);
        });

        const canopyRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.7, 0.4, 4), metalRoofMat);
        canopyRoof.rotation.y = Math.PI / 4;
        canopyRoof.position.set(0, roofH + 0.2, 0);
        canopyRoof.castShadow = true;
        buildingGroup.add(canopyRoof);

        const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bw * 0.7, 8), woodStackMat);
        log1.rotation.z = Math.PI / 2;
        log1.position.set(0, 0.1, -0.05);
        buildingGroup.add(log1);

        const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, bw * 0.7, 8), woodStackMat);
        log2.rotation.z = Math.PI / 2;
        log2.position.set(0, 0.1, 0.05);
        buildingGroup.add(log2);

      } else if (isPergola) {
        // ⛩️ 3D Беседка / Пергола
        const woodMat = new THREE.MeshStandardMaterial({ color: "#a16207", roughness: 0.8 });
        const roofMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.6 });
        const pw = 0.08;
        const corners = [
          { x: -w / 2 + pw, z: -d / 2 + pw },
          { x: w / 2 - pw, z: -d / 2 + pw },
          { x: -w / 2 + pw, z: d / 2 - pw },
          { x: w / 2 - pw, z: d / 2 - pw },
        ];
        // 4 pillars
        corners.forEach(c => {
          const pGeo = new THREE.BoxGeometry(pw, 2.4, pw);
          pGeo.translate(c.x, 1.2, c.z);
          const pMesh = new THREE.Mesh(pGeo, woodMat);
          pMesh.castShadow = true;
          buildingGroup.add(pMesh);
        });

        // 2 long side beams
        const b1Geo = new THREE.BoxGeometry(w, 0.08, 0.08);
        b1Geo.translate(0, 2.44, -d / 2 + pw);
        const b1 = new THREE.Mesh(b1Geo, woodMat);
        b1.castShadow = true;
        buildingGroup.add(b1);

        const b2Geo = new THREE.BoxGeometry(w, 0.08, 0.08);
        b2Geo.translate(0, 2.44, d / 2 - pw);
        const b2 = new THREE.Mesh(b2Geo, woodMat);
        b2.castShadow = true;
        buildingGroup.add(b2);

        // Pyramid Roof
        const pRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.7, 0.8, 4), roofMat);
        pRoof.rotation.y = Math.PI / 4;
        pRoof.position.set(0, 2.8, 0);
        pRoof.castShadow = true;
        buildingGroup.add(pRoof);
      } else if (type === "health_trail") {
        // Natural pebble/wood walkway
        const pathGeo = new THREE.BoxGeometry(w, 0.02, d);
        pathGeo.translate(0, 0.01, 0);
        const pathMat = new THREE.MeshStandardMaterial({ color: "#d6d3d1", roughness: 0.9 });
        const pathMesh = new THREE.Mesh(pathGeo, pathMat);
        pathMesh.receiveShadow = true;
        buildingGroup.add(pathMesh);

        // Natural logs or stepping stones along the trail
        const segMat1 = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.9 });
        const segMat2 = new THREE.MeshStandardMaterial({ color: "#a8a29e", roughness: 0.8 });
        const numSteps = 6;
        for (let s = 0; s < numSteps; s++) {
          const stepGeo = new THREE.BoxGeometry(w / (numSteps * 1.4), 0.015, d * 0.7);
          const sx = -w / 2 + (w / numSteps) * s + (w / numSteps) * 0.5;
          stepGeo.translate(sx, 0.02, 0);
          const stepMesh = new THREE.Mesh(stepGeo, s % 2 === 0 ? segMat1 : segMat2);
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          buildingGroup.add(stepMesh);
        }
      } else if (type === "wicket" || b.gateType === "wicket" || (b.itemType === "gate" && type === "wicket")) {
        // 🚪 3D Калитка
        const matHex = getFenceColor(b.gateMaterial || b.fenceMaterial || globalFenceMaterial);
        const frameMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.4 });
        const doorMat = new THREE.MeshStandardMaterial({ color: matHex, roughness: 0.6 });

        // 2 Side Posts with caps
        const postLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), frameMat);
        postLeft.position.set(-w / 2 + 0.06, 0.95, 0);
        postLeft.castShadow = true;
        buildingGroup.add(postLeft);

        const postRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), frameMat);
        postRight.position.set(w / 2 - 0.06, 0.95, 0);
        postRight.castShadow = true;
        buildingGroup.add(postRight);

        // Openable Wicket Door Leaf (angled open 35 deg)
        const doorLeafGroup = new THREE.Group();
        doorLeafGroup.position.set(-w / 2 + 0.12, 0.95, 0);
        doorLeafGroup.rotation.y = Math.PI / 5; // 36 deg open

        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.28, 1.7, 0.05), doorMat);
        doorLeaf.position.set((w - 0.28) / 2, 0, 0);
        doorLeaf.castShadow = true;
        doorLeafGroup.add(doorLeaf);

        // Golden Handle
        const handleMat = new THREE.MeshStandardMaterial({ color: "#d97706", metalness: 0.8, roughness: 0.2 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15), handleMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(w - 0.35, 0, 0.05);
        doorLeafGroup.add(handle);

        buildingGroup.add(doorLeafGroup);

      } else if (type === "gate_swing" || b.gateType === "gate_swing") {
        // 🚪🚪 3D Распашные Ворота
        const matHex = getFenceColor(b.gateMaterial || b.fenceMaterial || globalFenceMaterial);
        const postMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.3 });
        const leafMat = new THREE.MeshStandardMaterial({ color: matHex, roughness: 0.5 });

        // Heavy Pillars
        const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), postMat);
        pillar1.position.set(-w / 2 + 0.125, 1.1, 0);
        pillar1.castShadow = true;
        buildingGroup.add(pillar1);

        const pillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), postMat);
        pillar2.position.set(w / 2 - 0.125, 1.1, 0);
        pillar2.castShadow = true;
        buildingGroup.add(pillar2);

        // Left Gate Leaf (open outward -40 deg)
        const leftLeafGroup = new THREE.Group();
        leftLeafGroup.position.set(-w / 2 + 0.25, 1.05, 0);
        leftLeafGroup.rotation.y = -Math.PI / 4.5;
        const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry((w - 0.5) / 2, 1.9, 0.06), leafMat);
        leftLeaf.position.set((w - 0.5) / 4, 0, 0);
        leftLeaf.castShadow = true;
        leftLeafGroup.add(leftLeaf);
        buildingGroup.add(leftLeafGroup);

        // Right Gate Leaf (open outward +40 deg)
        const rightLeafGroup = new THREE.Group();
        rightLeafGroup.position.set(w / 2 - 0.25, 1.05, 0);
        rightLeafGroup.rotation.y = Math.PI / 4.5;
        const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry((w - 0.5) / 2, 1.9, 0.06), leafMat);
        rightLeaf.position.set(-(w - 0.5) / 4, 0, 0);
        rightLeaf.castShadow = true;
        rightLeafGroup.add(rightLeaf);
        buildingGroup.add(rightLeafGroup);

      } else if (type === "gate_sliding" || b.gateType === "gate_sliding") {
        // 🚪➡️ 3D Откатные Ворота
        const matHex = getFenceColor(b.gateMaterial || b.fenceMaterial || globalFenceMaterial);
        const postMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.4 });
        const leafMat = new THREE.MeshStandardMaterial({ color: matHex, roughness: 0.5 });

        // Ground Guide Rail
        const railMat = new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.8, roughness: 0.3 });
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 1.8, 0.03, 0.08), railMat);
        rail.position.set(w * 0.2, 0.015, 0);
        buildingGroup.add(rail);

        // Electric Drive Motor Box
        const motorMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.3 });
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.3), motorMat);
        motor.position.set(w / 2 - 0.2, 0.2, 0.2);
        buildingGroup.add(motor);

        // Support Roller Pillars
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), postMat);
        p1.position.set(-w / 2 + 0.1, 1.1, 0);
        p1.castShadow = true;
        buildingGroup.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), postMat);
        p2.position.set(w / 2 - 0.1, 1.1, 0);
        p2.castShadow = true;
        buildingGroup.add(p2);

        // Sliding Gate Panel (shifted horizontally)
        const panelGroup = new THREE.Group();
        panelGroup.position.set(w * 0.25, 1.1, 0); // Open 50%
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 2.0, 0.06), leafMat);
        panel.castShadow = true;
        panelGroup.add(panel);
        buildingGroup.add(panelGroup);

      } else if (type === "fence_wall" || type === "garden_fence" || b.itemType === "fence") {
        const matHex = getFenceColor(b.fenceMaterial || globalFenceMaterial);
        const fenceMat = new THREE.MeshStandardMaterial({ color: matHex, roughness: 0.7 });

        // End posts
        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), fenceMat);
        post1.position.set(-w / 2 + 0.05, 0.75, 0);
        post1.castShadow = true;
        buildingGroup.add(post1);

        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), fenceMat);
        post2.position.set(w / 2 - 0.05, 0.75, 0);
        post2.castShadow = true;
        buildingGroup.add(post2);

        // Main Fence Panel Body
        const wallGeo = new THREE.BoxGeometry(w - 0.2, 1.3, 0.08);
        const wallMesh = new THREE.Mesh(wallGeo, fenceMat);
        wallMesh.position.set(0, 0.75, 0);
        wallMesh.castShadow = true;
        buildingGroup.add(wallMesh);
      } else if (type === "parking") {
        // Tarmac platform
        const parkGeo = new THREE.BoxGeometry(w, 0.02, d);
        parkGeo.translate(0, 0.01, 0);
        const parkMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.95 });
        const parkMesh = new THREE.Mesh(parkGeo, parkMat);
        parkMesh.receiveShadow = true;
        buildingGroup.add(parkMesh);

        // White lane markings
        const lineMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
        const l1Geo = new THREE.BoxGeometry(w - 0.2, 0.005, 0.05);
        l1Geo.translate(0, 0.021, -d / 2 + 0.1);
        const line1 = new THREE.Mesh(l1Geo, lineMat);
        buildingGroup.add(line1);

        const l2Geo = new THREE.BoxGeometry(w - 0.2, 0.005, 0.05);
        l2Geo.translate(0, 0.021, d / 2 - 0.1);
        const line2 = new THREE.Mesh(l2Geo, lineMat);
        buildingGroup.add(line2);

        // Divider lines
        const numLines = 3;
        for (let l = 0; l <= numLines; l++) {
          const lx = -w / 2 + (w / numLines) * l;
          const divGeo = new THREE.BoxGeometry(0.04, 0.005, d - 0.3);
          divGeo.translate(lx, 0.021, 0);
          const div = new THREE.Mesh(divGeo, lineMat);
          buildingGroup.add(div);
        }
      } else if (type === "carport") {
        const metalMat = new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.8, roughness: 0.2 });
        const polyMat = new THREE.MeshStandardMaterial({ 
          color: "#0284c7", 
          roughness: 0.2, 
          transparent: true, 
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        // 4 pillars
        const cw = 0.06;
        const cCoords = [
          { x: -w / 2 + cw, z: -d / 2 + cw },
          { x: w / 2 - cw, z: -d / 2 + cw },
          { x: -w / 2 + cw, z: d / 2 - cw },
          { x: w / 2 - cw, z: d / 2 - cw },
        ];
        cCoords.forEach(c => {
          const pillarGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8);
          pillarGeo.translate(c.x, 1.25, c.z);
          const pil = new THREE.Mesh(pillarGeo, metalMat);
          pil.castShadow = true;
          buildingGroup.add(pil);
        });

        // Top horizontal outer frame
        const rimGeo = new THREE.BoxGeometry(w, 0.06, d);
        rimGeo.translate(0, 2.5, 0);
        const rim = new THREE.Mesh(rimGeo, metalMat);
        rim.castShadow = true;
        buildingGroup.add(rim);

        // Curved translucent roof
        const canopyGeo = new THREE.CylinderGeometry(w * 1.5, w * 1.5, d, 16, 1, true, 0, Math.PI / 6);
        canopyGeo.rotateZ(Math.PI / 2);
        canopyGeo.rotateX(Math.PI / 2);
        canopyGeo.translate(0, 2.15, 0);
        const canopy = new THREE.Mesh(canopyGeo, polyMat);
        canopy.castShadow = true;
        buildingGroup.add(canopy);
      } else if (type === "water_tap") {
        const pipeMat = new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.8, roughness: 0.2 });
        // Vertical pipe
        const pipeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8);
        pipeGeo.translate(0, 0.4, 0);
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.castShadow = true;
        buildingGroup.add(pipe);

        // Faucet spout
        const spoutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8);
        spoutGeo.rotateX(Math.PI / 2);
        spoutGeo.translate(0, 0.72, 0.06);
        const spout = new THREE.Mesh(spoutGeo, pipeMat);
        spout.castShadow = true;
        buildingGroup.add(spout);

        // Faucet wheel handle (blue)
        const valveMat = new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.4 });
        const valGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 12);
        valGeo.rotateX(Math.PI / 2);
        valGeo.translate(0, 0.8, 0);
        const valve = new THREE.Mesh(valGeo, valveMat);
        valve.castShadow = true;
        buildingGroup.add(valve);
      } else if (type === "electric_outlet") {
        const outMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.6 });
        const coverMat = new THREE.MeshStandardMaterial({ color: "#fb923c", roughness: 0.4 });
        // Post
        const postGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
        postGeo.translate(0, 0.3, 0);
        const post = new THREE.Mesh(postGeo, outMat);
        post.castShadow = true;
        buildingGroup.add(post);

        // Weatherproof socket lid
        const lidGeo = new THREE.BoxGeometry(0.08, 0.1, 0.02);
        lidGeo.translate(0, 0.45, 0.06);
        const lid = new THREE.Mesh(lidGeo, coverMat);
        buildingGroup.add(lid);
      } else if (type === "irrigation") {
        // Sprinkler base
        const spMat = new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.8 });
        const spGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10);
        spGeo.translate(0, 0.06, 0);
        const sprinkler = new THREE.Mesh(spGeo, spMat);
        sprinkler.castShadow = true;
        buildingGroup.add(sprinkler);

        // Water spray effect (cone)
        const waterSprayMat = new THREE.MeshStandardMaterial({ 
          color: "#06b6d4", 
          roughness: 0.1, 
          transparent: true, 
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const sprayGeo = new THREE.ConeGeometry(w * 0.4, 0.4, 12, 1, true);
        sprayGeo.translate(0, 0.3, 0);
        const spray = new THREE.Mesh(sprayGeo, waterSprayMat);
        buildingGroup.add(spray);
      } else if (b.shapeType && b.shapeType !== "rect") {
        // Non-rectangular building 3D Extrude Geometry (L-shape, U-shape, T-shape, circle, polygon)
        const vertices = getBuildingVerticesMeters(b);
        const shape = new THREE.Shape();
        vertices.forEach((v, idx) => {
          const sx = v.x - w / 2;
          const sy = v.y - d / 2;
          if (idx === 0) shape.moveTo(sx, sy);
          else shape.lineTo(sx, sy);
        });
        shape.closePath();

        const extrudeSettings = {
          depth: h,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.05,
          bevelThickness: 0.05
        };

        const extrudedGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        extrudedGeo.rotateX(-Math.PI / 2);

        const wallMat = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.7,
          metalness: 0.1
        });

        const extrudedMesh = new THREE.Mesh(extrudedGeo, wallMat);
        extrudedMesh.castShadow = true;
        extrudedMesh.receiveShadow = true;
        buildingGroup.add(extrudedMesh);

        // Extruded roof cap for non-rectangular shape
        const roofShapeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
        roofShapeGeo.rotateX(-Math.PI / 2);
        const roofMat = new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.6 });
        const roofMesh = new THREE.Mesh(roofShapeGeo, roofMat);
        roofMesh.position.y = h;
        roofMesh.castShadow = true;
        buildingGroup.add(roofMesh);
      } else {
        // Advanced Architectural Building with Wall Materials, Plinth, Custom Roofs, Facade Openings & Cutaway Interior
        const style = b.architecturalStyle;
        const wallMatType = style?.wallMaterial || (type === "banya" ? "wood_timber" : "brick_red");
        const wallColor = style?.wallColor || hexColor;
        const matConfig = WALL_MATERIALS.find((m) => m.id === wallMatType);

        // 1. Plinth (Цокольное основание)
        const plinthH = Math.min(0.6, style?.plinthHeightMeters ?? 0.35);
        const plinthColor = style?.plinthColor || "#334155";
        const plinthMat = new THREE.MeshStandardMaterial({
          color: plinthColor,
          roughness: 0.9,
          metalness: 0.05,
        });
        const plinthMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, plinthH, d + 0.08), plinthMat);
        plinthMesh.position.y = plinthH / 2;
        plinthMesh.castShadow = true;
        plinthMesh.receiveShadow = true;
        buildingGroup.add(plinthMesh);

        // 2. Main Building Walls
        const mainWallH = Math.max(1.5, h - plinthH);
        const boxGeo = new THREE.BoxGeometry(w, mainWallH, d);
        boxGeo.translate(0, plinthH + mainWallH / 2, 0);

        const wallMat = new THREE.MeshStandardMaterial({
          color: wallColor,
          roughness: matConfig?.roughness ?? 0.75,
          metalness: matConfig?.metalness ?? 0.1,
        });

        let materials: THREE.Material[];
        if (facadeTexture) {
          const frontMat = new THREE.MeshStandardMaterial({
            map: facadeTexture,
            roughness: 0.5,
            metalness: 0.1,
          });
          materials = [wallMat, wallMat, wallMat, wallMat, frontMat, wallMat];
        } else {
          materials = [wallMat, wallMat, wallMat, wallMat, wallMat, wallMat];
        }

        const walls = new THREE.Mesh(boxGeo, materials);
        walls.castShadow = true;
        walls.receiveShadow = true;
        buildingGroup.add(walls);

        // 3. Facade Openings (Оконные и дверные конструкции)
        const frameColor = style?.windowFrameColor || "#1e293b";
        const doorColor = style?.doorColor || "#451a03";
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.4 });
        const glassMat = new THREE.MeshStandardMaterial({
          color: "#cce6ff",
          roughness: 0.1,
          metalness: 0.85,
          transparent: true,
          opacity: 0.65,
        });
        const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.5 });
        const handleMat = new THREE.MeshStandardMaterial({ color: "#eab308", metalness: 0.9, roughness: 0.2 });

        const openingsList: FacadeOpening[] = (style?.openings && style.openings.length > 0)
          ? style.openings
          : [
              {
                id: "default_door",
                type: "door_single",
                facadeSide: "front",
                offsetMeters: Math.max(0.2, w / 2 - 0.5),
                elevationMeters: 0,
                widthMeters: 0.95,
                heightMeters: 2.1,
              },
              {
                id: "default_win1",
                type: "window_double",
                facadeSide: "front",
                offsetMeters: Math.max(0.3, w * 0.15),
                elevationMeters: 0.9,
                widthMeters: 1.2,
                heightMeters: 1.4,
              },
              ...(w > 4.5
                ? [
                    {
                      id: "default_win2",
                      type: "window_double" as const,
                      facadeSide: "front" as const,
                      offsetMeters: Math.max(2.8, w * 0.7),
                      elevationMeters: 0.9,
                      widthMeters: 1.2,
                      heightMeters: 1.4,
                    },
                  ]
                : []),
            ];

        openingsList.forEach((op) => {
          const isDoor = op.type.includes("door");
          const ow = op.widthMeters || 1.0;
          const oh = op.heightMeters || 1.4;
          const elev = plinthH + (op.elevationMeters || 0);

          let posX = 0;
          let posZ = 0;
          let rotY = 0;

          if (op.facadeSide === "front") {
            posX = -w / 2 + op.offsetMeters + ow / 2;
            posZ = d / 2 + 0.025;
            rotY = 0;
          } else if (op.facadeSide === "back") {
            posX = w / 2 - op.offsetMeters - ow / 2;
            posZ = -d / 2 - 0.025;
            rotY = Math.PI;
          } else if (op.facadeSide === "left") {
            posX = -w / 2 - 0.025;
            posZ = -d / 2 + op.offsetMeters + ow / 2;
            rotY = -Math.PI / 2;
          } else {
            posX = w / 2 + 0.025;
            posZ = d / 2 - op.offsetMeters - ow / 2;
            rotY = Math.PI / 2;
          }

          const opGroup = new THREE.Group();
          opGroup.position.set(posX, elev + oh / 2, posZ);
          opGroup.rotation.y = rotY;

          if (isDoor) {
            // Door frame
            const dFrame = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.06, oh + 0.04, 0.06), frameMat);
            opGroup.add(dFrame);

            // Door leaf
            const dLeaf = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, 0.04), doorMat);
            dLeaf.position.z = 0.01;
            opGroup.add(dLeaf);

            // Door handle
            const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), handleMat);
            dHandle.rotation.z = Math.PI / 2;
            dHandle.position.set(ow / 2 - 0.12, 0, 0.045);
            opGroup.add(dHandle);

            if (op.type === "door_glass") {
              const dGlass = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.2, oh - 0.3, 0.02), glassMat);
              dGlass.position.z = 0.02;
              opGroup.add(dGlass);
            }
          } else {
            // Window Frame
            const wFrame = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, 0.06), frameMat);
            opGroup.add(wFrame);

            // Glass pane
            const wGlass = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.12, oh - 0.12, 0.02), glassMat);
            wGlass.position.z = 0.01;
            opGroup.add(wGlass);

            // Mullion divider
            if (op.type === "window_double" || op.type === "window_triple") {
              const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, oh - 0.1, 0.04), frameMat);
              mullion.position.z = 0.015;
              opGroup.add(mullion);
            }

            // Window sill ledge (отлив)
            const sill = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.1, 0.04, 0.1), frameMat);
            sill.position.set(0, -oh / 2, 0.04);
            opGroup.add(sill);
          }

          buildingGroup.add(opGroup);
        });

        // 4. Roof Construction (or Cutaway View)
        if (!isCutawayView) {
          const roofType =
            style?.roofType ||
            (type === "garage"
              ? "shed"
              : type === "house" || type === "banya" || type === "other"
              ? "gable"
              : "pyramid");
          const roofMatType = style?.roofMaterial || "metal_tile";
          const roofColor = style?.roofColor || "#7f1d1d";
          const roofHeight = style?.roofHeightMeters ?? (type === "house" ? 2.4 : 1.6);
          const roofMatConfig = ROOF_MATERIALS.find((m) => m.id === roofMatType);
          const roofMat = new THREE.MeshStandardMaterial({
            color: roofColor,
            roughness: roofMatConfig?.roughness ?? 0.5,
            metalness: roofMatConfig?.metalness ?? 0.3,
          });

          const overhang = 0.25; // 25cm eave overhang

          if (roofType === "gable") {
            // 🏠 Classic Gable Roof (Двускатная с фронтонами и свесами)
            const rw = w + overhang * 2;
            const rd = d + overhang * 2;
            const slopeLen = Math.sqrt(Math.pow(rw / 2, 2) + Math.pow(roofHeight, 2));
            const angle = Math.atan2(roofHeight, rw / 2);

            // Left slope
            const leftSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.12, rd), roofMat);
            leftSlope.position.set(-rw / 4, h + roofHeight / 2, 0);
            leftSlope.rotation.z = angle;
            leftSlope.castShadow = true;
            buildingGroup.add(leftSlope);

            // Right slope
            const rightSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.12, rd), roofMat);
            rightSlope.position.set(rw / 4, h + roofHeight / 2, 0);
            rightSlope.rotation.z = -angle;
            rightSlope.castShadow = true;
            buildingGroup.add(rightSlope);

            // Ridge cap (конек)
            const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, rd), roofMat);
            ridge.position.set(0, h + roofHeight + 0.02, 0);
            buildingGroup.add(ridge);

            // Gable Triangular End Walls (фронтоны)
            [-d / 2 + 0.01, d / 2 - 0.01].forEach((gz) => {
              const triShape = new THREE.Shape();
              triShape.moveTo(-w / 2, 0);
              triShape.lineTo(w / 2, 0);
              triShape.lineTo(0, roofHeight);
              triShape.closePath();
              const triGeo = new THREE.ShapeGeometry(triShape);
              const gableTri = new THREE.Mesh(triGeo, wallMat);
              gableTri.position.set(0, h, gz);
              buildingGroup.add(gableTri);
            });
          } else if (roofType === "shed") {
            // 📐 Modern Shed Roof (Односкатная)
            const rw = w + overhang * 2;
            const rd = d + overhang * 2;
            const slopeLen = Math.sqrt(Math.pow(rd, 2) + Math.pow(roofHeight, 2));
            const angle = Math.atan2(roofHeight, rd);

            const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.12, slopeLen), roofMat);
            shedRoof.position.set(0, h + roofHeight / 2, 0);
            shedRoof.rotation.x = angle;
            shedRoof.castShadow = true;
            buildingGroup.add(shedRoof);
          } else if (roofType === "flat") {
            // 🏢 Flat Roof with Parapet (Плоская с парапетом)
            const parapetH = 0.35;
            const parapetThick = 0.15;
            const parapetMat = wallMat;

            const pFront = new THREE.Mesh(new THREE.BoxGeometry(w, parapetH, parapetThick), parapetMat);
            pFront.position.set(0, h + parapetH / 2, d / 2 - parapetThick / 2);
            buildingGroup.add(pFront);

            const pBack = new THREE.Mesh(new THREE.BoxGeometry(w, parapetH, parapetThick), parapetMat);
            pBack.position.set(0, h + parapetH / 2, -d / 2 + parapetThick / 2);
            buildingGroup.add(pBack);

            const pLeft = new THREE.Mesh(new THREE.BoxGeometry(parapetThick, parapetH, d), parapetMat);
            pLeft.position.set(-w / 2 + parapetThick / 2, h + parapetH / 2, 0);
            buildingGroup.add(pLeft);

            const pRight = new THREE.Mesh(new THREE.BoxGeometry(parapetThick, parapetH, d), parapetMat);
            pRight.position.set(w / 2 - parapetThick / 2, h + parapetH / 2, 0);
            buildingGroup.add(pRight);

            const deck = new THREE.Mesh(
              new THREE.BoxGeometry(w - parapetThick * 2, 0.05, d - parapetThick * 2),
              roofMat
            );
            deck.position.set(0, h + 0.08, 0);
            buildingGroup.add(deck);
          } else if (roofType === "mansard") {
            // 🏘️ Mansard Roof (Мансардная ломаная)
            const rw = w + overhang;
            const rd = d + overhang;
            const lowerH = roofHeight * 0.65;
            const upperH = roofHeight * 0.35;

            const lowerRoof = new THREE.Mesh(
              new THREE.ConeGeometry(Math.max(rw, rd) * 0.75, lowerH, 4),
              roofMat
            );
            lowerRoof.rotation.y = Math.PI / 4;
            lowerRoof.position.set(0, h + lowerH / 2, 0);
            buildingGroup.add(lowerRoof);

            const upperRoof = new THREE.Mesh(
              new THREE.ConeGeometry(Math.max(rw, rd) * 0.5, upperH, 4),
              roofMat
            );
            upperRoof.rotation.y = Math.PI / 4;
            upperRoof.position.set(0, h + lowerH + upperH / 2, 0);
            buildingGroup.add(upperRoof);
          } else if (roofType === "hipped") {
            // 🏰 Hipped Roof (Вальмовая)
            const coneGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.75, roofHeight, 4);
            coneGeo.rotateY(Math.PI / 4);
            coneGeo.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
            const hippedMesh = new THREE.Mesh(coneGeo, roofMat);
            hippedMesh.position.set(0, h + roofHeight / 2, 0);
            hippedMesh.castShadow = true;
            buildingGroup.add(hippedMesh);
          } else {
            // 🎪 Pyramid Roof (Шатровая)
            const pyrGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, roofHeight, 4);
            pyrGeo.rotateY(Math.PI / 4);
            const pyrMesh = new THREE.Mesh(pyrGeo, roofMat);
            pyrMesh.position.set(0, h + roofHeight / 2, 0);
            pyrMesh.castShadow = true;
            buildingGroup.add(pyrMesh);
          }
        }

        // 5. 3D Interior Floor Plan & Rooms Cutaway Visualization
        if (isCutawayView && b.floorPlan && b.floorPlan.rooms && b.floorPlan.rooms.length > 0) {
          const interiorGroup = new THREE.Group();

          // Floor slab
          const floorMat = new THREE.MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.6 });
          const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.05, d - 0.2), floorMat);
          floorSlab.position.set(0, plinthH + 0.025, 0);
          interiorGroup.add(floorSlab);

          // Partition walls
          const partWallMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.7 });
          const partWallH = 2.2;

          b.floorPlan.rooms.forEach((room) => {
            const rColor = room.color || "#fef3c7";
            const rMat = new THREE.MeshStandardMaterial({
              color: rColor,
              roughness: 0.5,
              transparent: true,
              opacity: 0.7,
            });
            const rMesh = new THREE.Mesh(
              new THREE.BoxGeometry(room.wMeters - 0.08, 0.02, room.hMeters - 0.08),
              rMat
            );
            const rx = -w / 2 + room.xMeters + room.wMeters / 2;
            const rz = -d / 2 + room.yMeters + room.hMeters / 2;
            rMesh.position.set(rx, plinthH + 0.04, rz);
            interiorGroup.add(rMesh);

            const pWallGeo = new THREE.BoxGeometry(room.wMeters, partWallH, 0.08);
            const pWall = new THREE.Mesh(pWallGeo, partWallMat);
            pWall.position.set(rx, plinthH + partWallH / 2, -d / 2 + room.yMeters + room.hMeters);
            interiorGroup.add(pWall);
          });

          // Interior Elements & Equipment in 3D
          if (b.floorPlan.elements) {
            b.floorPlan.elements.forEach((el) => {
              const elX = -w / 2 + el.xMeters + el.wMeters / 2;
              const elZ = -d / 2 + el.yMeters + el.hMeters / 2;
              const isSocket = el.type.includes("socket");
              const isPlumbing = el.type.includes("water");
              const isAC = el.type.includes("ac");

              if (isSocket) {
                const sockMat = new THREE.MeshStandardMaterial({
                  color: "#f59e0b",
                  emissive: "#f59e0b",
                  emissiveIntensity: 0.6,
                });
                const sock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), sockMat);
                sock.position.set(elX, plinthH + 0.3, elZ);
                interiorGroup.add(sock);
              } else if (isPlumbing) {
                const wMat = new THREE.MeshStandardMaterial({
                  color: "#0284c7",
                  emissive: "#0284c7",
                  emissiveIntensity: 0.6,
                });
                const wPoint = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), wMat);
                wPoint.position.set(elX, plinthH + 0.18, elZ);
                interiorGroup.add(wPoint);
              } else if (isAC) {
                const acMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
                const ac = new THREE.Mesh(new THREE.BoxGeometry(el.wMeters, 0.25, 0.2), acMat);
                ac.position.set(elX, plinthH + 1.8, elZ);
                interiorGroup.add(ac);
              } else {
                const furnMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.6 });
                const furn = new THREE.Mesh(new THREE.BoxGeometry(el.wMeters, 0.45, el.hMeters), furnMat);
                furn.position.set(elX, plinthH + 0.225, elZ);
                interiorGroup.add(furn);
              }
            });
          }

          buildingGroup.add(interiorGroup);
        }
      }

      // Add to group and map
      group.add(buildingGroup);
      meshMapRef.current.set(b.id, buildingGroup);
    });

    // 7. Build 3D Plants / Trees
    plantNodes.forEach((p) => {
      const radius = (p.diameterMeters || 3) / 2;
      const posX = p.xMeters || 0;
      const posZ = H - (p.yMeters || 0);

      const plantGroup = new THREE.Group();
      plantGroup.position.set(posX, 0, posZ);
      plantGroup.name = p.id;

      // Trunk
      const trunkHeight = p.category === "bush" ? 0.3 : 1.5;
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, trunkHeight, 8);
      trunkGeo.translate(0, trunkHeight / 2, 0);
      const trunkMat = new THREE.MeshStandardMaterial({ color: "#6e473b", roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      plantGroup.add(trunk);

      // Foliage
      let foliage: THREE.Mesh;
      if (p.category === "conifer") {
        // Conifer tree (spruce/pine tree cone)
        const coneGeo = new THREE.ConeGeometry(radius, 3.5, 6);
        coneGeo.translate(0, trunkHeight + 1.75, 0);
        const coniferMat = new THREE.MeshStandardMaterial({ color: "#164421", roughness: 0.95 });
        foliage = new THREE.Mesh(coneGeo, coniferMat);
      } else if (p.category === "bush") {
        // Bush sphere sitting low
        const sphereGeo = new THREE.SphereGeometry(radius, 12, 12);
        sphereGeo.translate(0, trunkHeight + radius * 0.7, 0);
        const bushMat = new THREE.MeshStandardMaterial({ color: "#3d7e48", roughness: 0.9 });
        foliage = new THREE.Mesh(sphereGeo, bushMat);
      } else if (p.category === "flowerbed") {
        // Flowerbed cylinder ring with flat blooming particle sphere colors
        const fbGeo = new THREE.CylinderGeometry(radius, radius, 0.25, 12);
        fbGeo.translate(0, 0.12, 0);
        const soilMat = new THREE.MeshStandardMaterial({ color: "#473024", roughness: 0.9 });
        foliage = new THREE.Mesh(fbGeo, soilMat);

        // Tiny colorful nodes (flowers)
        const flowerColors = ["#f87171", "#fbbf24", "#c084fc", "#fb7185", "#f472b6"];
        for (let f = 0; f < 10; f++) {
          const flGeo = new THREE.SphereGeometry(0.12, 6, 6);
          const flMat = new THREE.MeshStandardMaterial({
            color: flowerColors[f % flowerColors.length],
            emissive: flowerColors[f % flowerColors.length],
            emissiveIntensity: 0.2,
          });
          const fl = new THREE.Mesh(flGeo, flMat);
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * (radius - 0.2);
          fl.position.set(Math.cos(angle) * r, 0.25 + Math.random() * 0.15, Math.sin(angle) * r);
          plantGroup.add(fl);
        }
      } else if (p.category === "bed") {
        // Vegetable Bed flat soil box with neat green lines
        const bedGeo = new THREE.BoxGeometry(radius * 2, 0.2, radius * 1.3);
        bedGeo.translate(0, 0.1, 0);
        const bedMat = new THREE.MeshStandardMaterial({ color: "#50382b", roughness: 0.95 });
        foliage = new THREE.Mesh(bedGeo, bedMat);

        // Neat green sprouts rows
        for (let row = -0.5; row <= 0.5; row += 0.5) {
          for (let col = -radius + 0.3; col <= radius - 0.3; col += 0.45) {
            const sproutGeo = new THREE.SphereGeometry(0.06, 4, 4);
            const sproutMat = new THREE.MeshStandardMaterial({ color: "#4ade80" });
            const sprout = new THREE.Mesh(sproutGeo, sproutMat);
            sprout.position.set(col, 0.22, row * radius * 0.8);
            plantGroup.add(sprout);
          }
        }
      } else {
        // Deciduous tree (deciduous apple/oak tree sphere)
        const sphereGeo = new THREE.SphereGeometry(radius * 1.1, 16, 16);
        sphereGeo.translate(0, trunkHeight + radius, 0);
        const treeMat = new THREE.MeshStandardMaterial({ color: "#226a31", roughness: 0.9 });
        foliage = new THREE.Mesh(sphereGeo, treeMat);

        // Little red apples in tree
        for (let a = 0; a < 6; a++) {
          const appleGeo = new THREE.SphereGeometry(0.12, 6, 6);
          const appleMat = new THREE.MeshStandardMaterial({ color: "#ef4444" });
          const apple = new THREE.Mesh(appleGeo, appleMat);
          const angle = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          const r = radius * 0.95;
          apple.position.set(
            Math.sin(theta) * Math.cos(angle) * r,
            trunkHeight + radius + Math.cos(theta) * r * 0.8,
            Math.sin(theta) * Math.sin(angle) * r
          );
          plantGroup.add(apple);
        }
      }

      foliage.castShadow = true;
      foliage.receiveShadow = true;
      plantGroup.add(foliage);

      group.add(plantGroup);
      meshMapRef.current.set(p.id, plantGroup);
    });
  }, [planBuildings, plantNodes, secondaryBuildings, W, H, isSceneReady, isCutawayView]);

  // Focus Camera smoothly onto an object
  const focusCameraOnObject = (id: string) => {
    const mesh = meshMapRef.current.get(id);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!mesh || !camera || !controls) return;

    // Shift camera target to the mesh position with smooth tweening
    const targetX = mesh.position.x;
    const targetZ = mesh.position.z;

    // Move controls focus
    controls.target.set(targetX, 1, targetZ);

    // Move camera slightly closer
    camera.position.set(targetX - 8, camera.position.y * 0.75 + 4, targetZ + 12);
    controls.update();
  };

  // Reset Camera View
  const handleResetCamera = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    controls.target.set(W / 2, 0, H / 2);
    camera.position.set(W / 2, Math.max(W, H) * 0.9, H * 1.3);
    controls.update();
    setSelectedObjectId(null);
    setSelectedObjectType(null);
  };

  // Find info of selected item for HTML inspector panel
  const getSelectedDetails = () => {
    if (!selectedObjectId) return null;
    if (selectedObjectType === "building") {
      const b = planBuildings.find((x) => x.id === selectedObjectId);
      const sb = secondaryBuildings.find((x) => x.id === selectedObjectId);
      return {
        id: b?.id,
        name: b?.label || "Строение",
        type: b?.subType || "Вспомогательное",
        dimensions: `${b?.wMeters || 4}м × ${b?.hMeters || 4}м`,
        square: `${(b?.wMeters || 4) * (b?.hMeters || 4)} м²`,
        coords: `X: ${b?.xMeters || 0}м, Y: ${b?.yMeters || 0}м`,
        materials: sb?.materials || "Не указаны",
        builder: sb?.builderType === "contractor" ? sb.contractorName : "Самостоятельная постройка",
        notes: sb?.operationNotes || "Нет примечаний по эксплуатации.",
        photos: sb?.growthTimeline || [],
      };
    } else {
      const p = plantNodes.find((x) => x.id === selectedObjectId);
      return {
        id: p?.id,
        name: p?.name || "Растение",
        type: p?.category === "conifer" ? "Хвойное" : p?.category === "deciduous" ? "Лиственное" : p?.category === "bush" ? "Куст" : p?.category === "flowerbed" ? "Клумба" : "Грядка",
        dimensions: `Диаметр кроны: ${p?.diameterMeters || 3}м`,
        coords: `X: ${p?.xMeters || 0}м, Y: ${p?.yMeters || 0}м`,
        plantingYear: `${p?.plantingYear || "—"} г.`,
        care: p?.careGuidance || "Обычный полив и сезонная прополка.",
        remarks: p?.remarks || "",
        photos: p?.growthPhotos?.map((ph) => ({ title: ph.date, photoUrl: ph.url })) || [],
      };
    }
  };

  const details = getSelectedDetails();

  return (
    <div className="p-5 rounded-2xl bg-neutral-900/90 text-white border border-neutral-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">3D интерактивное пространство</span>
          <h2 className="text-lg font-black text-white flex items-center gap-1.5 mt-0.5">
            👁️ Моделирование участка {W}м × {H}м
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCutawayView(!isCutawayView)}
            className={`p-1.5 rounded-lg cursor-pointer transition text-xs font-bold flex items-center gap-1.5 ${
              isCutawayView
                ? "bg-amber-500 text-neutral-950 font-black shadow-md"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
            }`}
            title="Снять кровлю и показать внутренние комнаты и сети"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isCutawayView ? "3D Разрез активен" : "Снять крышу (3D разрез)"}</span>
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg cursor-pointer transition text-xs font-bold flex items-center gap-1"
            title="Сбросить камеру"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс камеры</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 bg-red-600/20 hover:bg-red-650 hover:text-white rounded-lg text-red-400 transition cursor-pointer"
            title="Закрыть 3D"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Helper List of all Objects on left */}
        <div className="lg:col-span-1 space-y-3 max-h-[550px] overflow-y-auto pr-1">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2">
            <span className="text-[9px] font-black uppercase text-zinc-500 block">Быстрый выбор объектов</span>
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-amber-500 uppercase block tracking-widest">Строения:</span>
              {planBuildings.length === 0 ? (
                <span className="text-[10px] text-zinc-500 italic block">Нет строений на плане</span>
              ) : (
                planBuildings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedObjectId(b.id);
                      setSelectedObjectType("building");
                      focusCameraOnObject(b.id);
                    }}
                    className={`w-full text-left p-1.5 rounded text-[11px] font-bold flex items-center justify-between transition ${
                      selectedObjectId === b.id
                        ? "bg-amber-550/20 text-amber-400 border border-amber-500/30"
                        : "hover:bg-neutral-800/50 text-neutral-300"
                    }`}
                  >
                    <span className="truncate">🏢 {b.label}</span>
                    <span className="text-[9px] text-zinc-500 shrink-0 font-mono">
                      {b.wMeters}x{b.hMeters}м
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-1 pt-2 border-t border-neutral-800/50">
              <span className="text-[8px] font-bold text-emerald-500 uppercase block tracking-widest">Растения:</span>
              {plantNodes.length === 0 ? (
                <span className="text-[10px] text-zinc-500 italic block">Нет посадок на плане</span>
              ) : (
                plantNodes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedObjectId(p.id);
                      setSelectedObjectType("plant");
                      focusCameraOnObject(p.id);
                    }}
                    className={`w-full text-left p-1.5 rounded text-[11px] font-bold flex items-center justify-between transition ${
                      selectedObjectId === p.id
                        ? "bg-emerald-550/20 text-emerald-400 border border-emerald-500/30"
                        : "hover:bg-neutral-800/50 text-neutral-300"
                    }`}
                  >
                    <span className="truncate">🌿 {p.name}</span>
                    <span className="text-[9px] text-zinc-500 shrink-0 font-mono">Ø {p.diameterMeters || 3}м</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {showHelperPanel && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1 text-[11px] text-zinc-400 relative">
              <button
                onClick={() => setShowHelperPanel(false)}
                className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 text-[10px]"
              >
                ×
              </button>
              <span className="font-extrabold text-blue-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Навигация в 3D:
              </span>
              <p className="leading-relaxed">
                • <strong>Вращение:</strong> Левая кнопка мыши + перемещение.
                <br />• <strong>Зум:</strong> Колесико мыши вверх/вниз.
                <br />• <strong>Перемещение:</strong> Правая кнопка мыши (или Shift + ЛКМ).
                <br />• <strong>Клик по объекту:</strong> Показывает его характеристики и фотографии прямо из реестра!
              </p>
            </div>
          )}
        </div>

        {/* Interactive 3D Canvas center */}
        <div className="lg:col-span-2 relative bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 min-h-[450px] lg:min-h-[550px]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ height: "550px" }} />
          
          <div className="absolute top-4 left-4 bg-neutral-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 text-[10px] text-zinc-400 flex items-center gap-2 font-bold pointer-events-none shadow-md">
            <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>WebGL 3D Ускоритель активен</span>
          </div>
        </div>

        {/* Selected Object Detailed Card on right */}
        <div className="lg:col-span-1">
          {details ? (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4 max-h-[550px] overflow-y-auto animate-fadeIn text-xs text-neutral-300">
              <div className="border-b border-neutral-800 pb-2.5">
                <span className="text-[9px] font-black uppercase text-amber-500 block">Карточка объекта в 3D</span>
                <h3 className="font-extrabold text-sm text-white mt-0.5">{details.name}</h3>
                <span className="text-[10px] text-zinc-400 italic block mt-0.5">{details.type}</span>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-900 p-2 rounded-lg border border-neutral-800/50">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-mono">Габариты:</span>
                    <span className="font-extrabold text-white">{details.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-mono">Координаты:</span>
                    <span className="font-bold text-zinc-300">{details.coords}</span>
                  </div>
                </div>

                {"square" in details && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Площадь пятна застройки:</span>
                    <span className="font-extrabold text-white text-xs">{details.square}</span>
                  </div>
                )}

                {"materials" in details && (
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block">Материалы:</span>
                      <span className="font-semibold text-zinc-200">{details.materials}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block">Исполнитель работ:</span>
                      <span className="font-semibold text-zinc-200">{details.builder}</span>
                    </div>
                  </div>
                )}

                {"plantingYear" in details && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Год посадки:</span>
                    <span className="font-extrabold text-emerald-400">{details.plantingYear}</span>
                  </div>
                )}

                {"care" in details && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Рекомендации по уходу:</span>
                    <p className="text-zinc-400 leading-relaxed font-semibold">{details.care}</p>
                  </div>
                )}

                {selectedObjectType === "building" && (() => {
                  const bObj = planBuildings.find((x) => x.id === selectedObjectId);
                  if (!bObj) return null;
                  const arch = bObj.architecturalStyle;
                  const wallMat = WALL_MATERIALS.find((m) => m.id === arch?.wallMaterial)?.label || "Красный кирпич";
                  const roofType = ROOF_TYPES.find((r) => r.id === arch?.roofType)?.label || "Двускатная";
                  const openingsCount = arch?.openings?.length ?? 3;
                  const roomsCount = bObj.floorPlan?.rooms?.length ?? 0;

                  return (
                    <div className="space-y-2 border-t border-neutral-800 pt-2.5">
                      <span className="text-[9px] font-black uppercase text-amber-500 block">
                        3D Архитектура и внутренняя планировка:
                      </span>

                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Стены:</span>
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                              style={{ backgroundColor: arch?.wallColor || bObj.color || "#9a3412" }}
                            />
                            <span>{wallMat}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Кровля:</span>
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                              style={{ backgroundColor: arch?.roofColor || "#7f1d1d" }}
                            />
                            <span>{roofType}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Окна и двери:</span>
                          <span className="font-mono font-bold text-sky-400">{openingsCount} конструкций</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Внутренний план:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {roomsCount > 0 ? `${roomsCount} комнат` : "Черновик"}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setCustomizingBuilding(bObj)}
                          className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5" />
                          <span>Настроить стены, кровлю, окна</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFloorPlanningBuilding(bObj)}
                          className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>План этажей и сети (вид сверху)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Photo Display if uploaded! */}
                {details.photos && details.photos.length > 0 ? (
                  <div className="space-y-2 border-t border-neutral-800 pt-2.5">
                    <span className="text-[9px] text-amber-500 uppercase font-bold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Прикрепленные фото ({details.photos.length}):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {details.photos.map((ph: any, i: number) => (
                        <div key={i} className="rounded border border-neutral-800 overflow-hidden bg-neutral-900 group relative">
                          <img
                            src={ph.photoUrl}
                            alt={ph.title}
                            className="w-full h-16 object-cover group-hover:scale-105 transition"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/75 p-0.5 text-[8px] text-zinc-300 truncate block text-center">
                            {ph.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 text-center text-[10px] text-zinc-500 italic">
                    У объекта нет прикрепленных фотографий. Добавьте фотографии в форму объекта на схеме участка, и они автоматически подгрузятся сюда!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-neutral-950/50 border border-neutral-800/80 text-center text-zinc-500 space-y-2 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Box className="w-8 h-8 text-neutral-700 animate-pulse" />
              <div className="text-[11px] font-bold">Выберите объект в 3D</div>
              <p className="text-[10px] text-zinc-600 max-w-[160px] leading-relaxed">
                Кликните на строение или растение в 3D сцене для детального просмотра характеристик и фото
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3D Architectural Customizer Modal */}
      {customizingBuilding && (
        <Building3DCustomizerModal
          buildingLabel={customizingBuilding.label}
          wMeters={customizingBuilding.wMeters || 4}
          hMeters={customizingBuilding.hMeters || 4}
          subType={customizingBuilding.subType}
          currentStyle={customizingBuilding.architecturalStyle}
          onSave={(newStyle) => {
            if (onUpdateBuilding) {
              onUpdateBuilding(customizingBuilding.id, { architecturalStyle: newStyle });
            }
            setCustomizingBuilding(null);
          }}
          onClose={() => setCustomizingBuilding(null)}
        />
      )}

      {/* Floor Plan & Engineering Modeling Modal */}
      {floorPlanningBuilding && (
        <FloorPlanModal
          buildingLabel={floorPlanningBuilding.label}
          wMeters={floorPlanningBuilding.wMeters || 4}
          hMeters={floorPlanningBuilding.hMeters || 4}
          subType={floorPlanningBuilding.subType}
          initialFloorPlan={floorPlanningBuilding.floorPlan}
          onSave={(newPlan) => {
            if (onUpdateBuilding) {
              onUpdateBuilding(floorPlanningBuilding.id, { floorPlan: newPlan });
            }
            setFloorPlanningBuilding(null);
          }}
          onClose={() => setFloorPlanningBuilding(null)}
        />
      )}
    </div>
  );
};
