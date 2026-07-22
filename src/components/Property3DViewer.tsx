import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { X, ZoomIn, RotateCcw, Box, Info, Image as ImageIcon } from "lucide-react";

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
  plotWidth: number; // in meters (W)
  plotHeight: number; // in meters (H)
  plotCorners?: Array<{ x: number; y: number }>;
  onClose: () => void;
}

export const Property3DViewer: React.FC<Property3DViewerProps> = ({
  planBuildings,
  secondaryBuildings,
  plantNodes,
  plotWidth,
  plotHeight,
  plotCorners,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<"building" | "plant" | null>(null);
  const [showHelperPanel, setShowHelperPanel] = useState<boolean>(true);
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);

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

    mountRef.current.appendChild(renderer.domElement);

    // 2. Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera going below ground
    controls.minDistance = 3;
    controls.maxDistance = Math.max(W, H) * 3;
    controls.target.set(W / 2, 0, H / 2); // Look at center of plot
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

    // Build fence columns and rails
    for (let i = 0; i < cornerCoordinates.length; i++) {
      const p1 = cornerCoordinates[i];
      const p2 = cornerCoordinates[(i + 1) % cornerCoordinates.length];

      // Add a pillar at corner
      const pillarGeo = new THREE.CylinderGeometry(0.2, 0.25, 2, 8);
      pillarGeo.translate(p1.x, 1, p1.z);
      const pillar = new THREE.Mesh(pillarGeo, fenceMat);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      // Add rails
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
      if (dist > 0.1) {
        const railGeo = new THREE.BoxGeometry(0.08, 0.4, dist);
        const railMesh = new THREE.Mesh(railGeo, fenceMat);
        railMesh.position.set((p1.x + p2.x) / 2, 0.8, (p1.z + p2.z) / 2);
        railMesh.lookAt(new THREE.Vector3(p2.x, 0.8, p2.z));
        railMesh.castShadow = true;
        scene.add(railMesh);
      }
    }

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
        case "gazebo":
          h = 3.2;
          break;
        case "pool":
          h = 0.15; // Sunk flat pool
          break;
        case "bonfire":
          h = 0.4;
          break;
        case "bbq":
          h = 1.3;
          break;
        case "playground":
          h = 2.4;
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
        case "pergola":
          h = 2.5;
          break;
        case "swings":
          h = 2.2;
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
        // Curved glasshouse cylinder sliced
        const ghFrameMat = new THREE.MeshStandardMaterial({
          color: "#dedede",
          roughness: 0.1,
          metalness: 0.9,
          wireframe: false,
        });
        const ghGlassMat = new THREE.MeshStandardMaterial({
          color: "#a0e0ff",
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });

        // Semi-cylindrical shell
        const domeGeo = new THREE.CylinderGeometry(w / 2, w / 2, d, 12, 1, false, 0, Math.PI);
        domeGeo.rotateZ(Math.PI / 2);
        domeGeo.rotateX(Math.PI / 2);
        domeGeo.translate(0, 0, 0);

        const dome = new THREE.Mesh(domeGeo, ghGlassMat);
        dome.position.y = 0.1;
        dome.castShadow = true;
        buildingGroup.add(dome);

        // Ribs
        for (let r = -d / 2; r <= d / 2; r += d / 3) {
          const ribGeo = new THREE.CylinderGeometry(w / 2 + 0.03, w / 2 + 0.03, 0.08, 12, 1, true, 0, Math.PI);
          ribGeo.rotateZ(Math.PI / 2);
          ribGeo.rotateX(Math.PI / 2);
          const rib = new THREE.Mesh(ribGeo, ghFrameMat);
          rib.position.set(0, 0.1, r);
          buildingGroup.add(rib);
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
      } else if (type === "pergola") {
        const woodMat = new THREE.MeshStandardMaterial({ color: "#a16207", roughness: 0.8 });
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

        // Cross rafters
        const numRafters = 6;
        for (let r = 0; r < numRafters; r++) {
          const rx = -w / 2 + (w / (numRafters - 1)) * r;
          const rafGeo = new THREE.BoxGeometry(0.04, 0.06, d * 1.1);
          rafGeo.translate(rx, 2.5, 0);
          const raf = new THREE.Mesh(rafGeo, woodMat);
          raf.castShadow = true;
          buildingGroup.add(raf);
        }
      } else if (type === "swings") {
        const sWoodMat = new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.8 });
        const ropeMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.5 });

        // Left A-frame
        const leftGeo = new THREE.Group();
        const legA1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), sWoodMat);
        legA1.position.set(0, 1.1, -0.4);
        legA1.rotation.x = 0.2;
        leftGeo.add(legA1);
        const legA2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), sWoodMat);
        legA2.position.set(0, 1.1, 0.4);
        legA2.rotation.x = -0.2;
        leftGeo.add(legA2);
        leftGeo.position.set(-w / 2 + 0.1, 0, 0);
        buildingGroup.add(leftGeo);

        // Right A-frame
        const rightGeo = leftGeo.clone();
        rightGeo.position.set(w / 2 - 0.1, 0, 0);
        buildingGroup.add(rightGeo);

        // Top horizontal beam
        const tBeamGeo = new THREE.BoxGeometry(w, 0.06, 0.06);
        tBeamGeo.translate(0, 2.15, 0);
        const tBeam = new THREE.Mesh(tBeamGeo, sWoodMat);
        tBeam.castShadow = true;
        buildingGroup.add(tBeam);

        // Swing Seat chains & board
        const seatWidth = w * 0.4;
        const chain1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6), ropeMat);
        chain1.position.set(-seatWidth / 2, 1.35, 0);
        buildingGroup.add(chain1);

        const chain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6), ropeMat);
        chain2.position.set(seatWidth / 2, 1.35, 0);
        buildingGroup.add(chain2);

        const sBoard = new THREE.Mesh(new THREE.BoxGeometry(seatWidth * 1.1, 0.03, 0.35), sWoodMat);
        sBoard.position.set(0, 0.6, 0);
        sBoard.castShadow = true;
        buildingGroup.add(sBoard);
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
      } else if (type === "garden_fence") {
        const fenceWood = new THREE.MeshStandardMaterial({ color: "#d6cbbe", roughness: 0.8 });
        // 2 rails
        const r1Geo = new THREE.BoxGeometry(w, 0.03, 0.04);
        r1Geo.translate(0, 0.3, 0);
        const r1 = new THREE.Mesh(r1Geo, fenceWood);
        r1.castShadow = true;
        buildingGroup.add(r1);

        const r2Geo = new THREE.BoxGeometry(w, 0.03, 0.04);
        r2Geo.translate(0, 0.7, 0);
        const r2 = new THREE.Mesh(r2Geo, fenceWood);
        r2.castShadow = true;
        buildingGroup.add(r2);

        // End posts
        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), fenceWood);
        post1.position.set(-w / 2 + 0.03, 0.5, 0);
        post1.castShadow = true;
        buildingGroup.add(post1);

        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), fenceWood);
        post2.position.set(w / 2 - 0.03, 0.5, 0);
        post2.castShadow = true;
        buildingGroup.add(post2);

        // Pickers
        const numPickers = 10;
        for (let p = 1; p < numPickers - 1; p++) {
          const px = -w / 2 + (w / (numPickers - 1)) * p;
          const pickerGeo = new THREE.BoxGeometry(0.04, 0.8, 0.02);
          pickerGeo.translate(px, 0.45, 0);
          const picker = new THREE.Mesh(pickerGeo, fenceWood);
          picker.castShadow = true;
          buildingGroup.add(picker);
        }
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
      } else {
        // Standard Building Box with walls & roof
        const boxGeo = new THREE.BoxGeometry(w, h, d);
        boxGeo.translate(0, h / 2, 0);

        let materials: THREE.Material[];

        if (facadeTexture) {
          // If we have a custom photo, load it on the front face (face index 4 is usually positive Z facade)
          const sideMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.7, metalness: 0.1 });
          const frontMat = new THREE.MeshStandardMaterial({
            map: facadeTexture,
            roughness: 0.5,
            metalness: 0.1,
          });

          // Material array order in ThreeJS BoxGeometry: [right, left, top, bottom, front, back]
          materials = [
            sideMat, // right (+X)
            sideMat, // left (-X)
            sideMat, // top (+Y)
            sideMat, // bottom (-Y)
            frontMat, // front (+Z) -> facade
            sideMat,  // back (-Z)
          ];
        } else {
          // Standard wall material
          const wallMat = new THREE.MeshStandardMaterial({
            color: hexColor,
            roughness: 0.7,
            metalness: 0.1,
          });
          materials = [wallMat, wallMat, wallMat, wallMat, wallMat, wallMat];
        }

        const walls = new THREE.Mesh(boxGeo, materials);
        walls.castShadow = true;
        walls.receiveShadow = true;
        buildingGroup.add(walls);

        // Add visual window/doors frames to make it look highly stylized and realistic
        const frameMat = new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.5 });
        const doorGeo = new THREE.BoxGeometry(0.8, 1.8, 0.05);
        const door = new THREE.Mesh(doorGeo, frameMat);
        door.position.set(0, 0.9, d / 2 + 0.03); // center facade door
        buildingGroup.add(door);

        const windowGeo = new THREE.BoxGeometry(1.0, 0.8, 0.05);
        const winLeft = new THREE.Mesh(windowGeo, frameMat);
        winLeft.position.set(-w / 3, h / 2, d / 2 + 0.03);
        buildingGroup.add(winLeft);

        const winRight = new THREE.Mesh(windowGeo, frameMat);
        winRight.position.set(w / 3, h / 2, d / 2 + 0.03);
        buildingGroup.add(winRight);

        // Add 3D Pitched Roof for residential house / banya / guest house
        if (type === "house" || type === "banya" || type === "guest_house" || type === "other") {
          const roofHeight = type === "house" ? 2.5 : 1.5;
          const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.75, roofHeight, 4);
          roofGeo.rotateY(Math.PI / 4); // Align square base
          roofGeo.translate(0, h + roofHeight / 2, 0);

          const roofMat = new THREE.MeshStandardMaterial({ color: "#9a2a2a", roughness: 0.5 }); // Rustic tile-red roof
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.castShadow = true;
          buildingGroup.add(roof);
        }

        // Gazebo roof
        if (type === "gazebo") {
          const roofGeo = new THREE.ConeGeometry(w * 0.6, 1.2, 6);
          roofGeo.translate(0, h + 0.6, 0);
          const roofMat = new THREE.MeshStandardMaterial({ color: "#304030", roughness: 0.7 });
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.castShadow = true;
          buildingGroup.add(roof);
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
  }, [planBuildings, plantNodes, secondaryBuildings, W, H, isSceneReady]);

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
                    У объекта нет прикрепленных фотографий. Добавьте фотографии в форму объекта на планограмме, и они автоматически подгрузятся сюда!
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
    </div>
  );
};
