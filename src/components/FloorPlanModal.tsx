import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Plus,
  Printer,
  Layers,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Box,
  Flame,
  Zap,
  Droplets,
  Eye,
  EyeOff
} from "lucide-react";
import {
  BuildingFloorPlan,
  PlanRoom,
  FloorPartition,
  FloorOpening,
  FloorPlanElement,
  RoomPreset,
  ElementCatalogItem,
  createDefaultFloorPlan,
  createDefaultElectricalPanels,
  createDefaultCollectorSchemes,
  UnderfloorHeatingLoop,
  EngineeringRoute,
  RouteSystem,
  RoutePoint,
  EngineeringLayerVisibility,
  DEFAULT_LAYER_VISIBILITY
} from "../types/architecturalTypes";
import { FloorPlanCanvas } from "./floorplan/FloorPlanCanvas";
import { FloorPlanSidebar, WorkflowStep } from "./floorplan/FloorPlanSidebar";
import { FloorPlanInspector } from "./floorplan/FloorPlanInspector";
import { FloorPlanSpecTable } from "./floorplan/FloorPlanSpecTable";
import { FloorPlanAxonometry } from "./floorplan/FloorPlanAxonometry";
import { FloorPlanElectricScheme } from "./floorplan/FloorPlanElectricScheme";
import { FloorPlanCollectorScheme } from "./floorplan/FloorPlanCollectorScheme";
import {
  autoGenerateRoomsFromPartitions,
  snapVal,
  findMagneticWallSnap,
  calculateRouteLength,
  generateUnderfloorHeatingSvg
} from "./floorplan/floorPlanUtils";

interface FloorPlanModalProps {
  buildingLabel: string;
  wMeters: number;
  hMeters: number;
  subType?: string;
  initialFloorPlan?: BuildingFloorPlan;
  onSave: (floorPlan: BuildingFloorPlan) => void;
  onClose: () => void;
}

export const FloorPlanModal: React.FC<FloorPlanModalProps> = ({
  buildingLabel,
  wMeters,
  hMeters,
  subType,
  initialFloorPlan,
  onSave,
  onClose,
}) => {
  // Ensure valid base dimensions
  const [W, setW] = useState<number>(() => Math.max(3, Math.round((wMeters || 6) * 10) / 10));
  const [H, setH] = useState<number>(() => Math.max(3, Math.round((hMeters || 6) * 10) / 10));
  const [outerWallThickness, setOuterWallThickness] = useState<number>(() => {
    return initialFloorPlan?.outerWallThicknessMeters || 0.35;
  });

  // Collapsible sidebars state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);

  // Layer Visibility State (Слои проекта)
  const [layerVisibility, setLayerVisibility] = useState<EngineeringLayerVisibility>(DEFAULT_LAYER_VISIBILITY);

  // Main Floor Plan State
  const [floorPlan, setFloorPlan] = useState<BuildingFloorPlan>(() => {
    if (initialFloorPlan && initialFloorPlan.floors && initialFloorPlan.floors.length > 0) {
      return {
        ...initialFloorPlan,
        outerWallThicknessMeters: initialFloorPlan.outerWallThicknessMeters || 0.35,
        partitions: initialFloorPlan.partitions || [],
        openings: initialFloorPlan.openings || [],
        elements: initialFloorPlan.elements || [],
        routes: initialFloorPlan.routes || [],
        heatingLoops: initialFloorPlan.heatingLoops || [],
        electricalPanels:
          initialFloorPlan.electricalPanels && initialFloorPlan.electricalPanels.length > 0
            ? initialFloorPlan.electricalPanels
            : createDefaultElectricalPanels(),
        collectorSchemes:
          initialFloorPlan.collectorSchemes && initialFloorPlan.collectorSchemes.length > 0
            ? initialFloorPlan.collectorSchemes
            : createDefaultCollectorSchemes()
      };
    }
    return createDefaultFloorPlan(W, H, subType);
  });

  const [currentFloor, setCurrentFloor] = useState<number>(floorPlan.currentFloor || 1);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("step1_perimeter");
  const [activeTab, setActiveTab] = useState<
    "editor" | "axonometry" | "electric_scheme" | "collector_scheme" | "spec"
  >("editor");

  // Selection states
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedHeatingLoopId, setSelectedHeatingLoopId] = useState<string | null>(null);

  // Active route drawing state (Прокладка трасс)
  const [drawingRoute, setDrawingRoute] = useState<{
    system: RouteSystem;
    points: RoutePoint[];
    name: string;
    cableCores?: string;
    diameterMm?: number;
    color?: string;
  } | null>(null);

  // Active heating loop drawing state
  const [drawingHeatingLoop, setDrawingHeatingLoop] = useState<boolean>(false);

  // Active element placement / stamp state
  const [placingElement, setPlacingElement] = useState<ElementCatalogItem | null>(null);

  // Zoom & Display options (from 50% to 350%)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [showRulers, setShowRulers] = useState<boolean>(true);

  // Snapped wall feedback while dragging
  const [snappedWallFeedback, setSnappedWallFeedback] = useState<{
    label: string;
    x?: number;
    y?: number;
    orientation?: "horizontal" | "vertical";
  } | null>(null);

  // Dragging interaction state
  const [draggingItem, setDraggingItem] = useState<{
    type: "room" | "partition" | "opening" | "element" | "heating_loop";
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Underfloor heating loop edge & corner resizing state
  const [resizingHeatingLoop, setResizingHeatingLoop] = useState<{
    id: string;
    handle: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Filter current floor items
  const currentRooms = floorPlan.rooms.filter((r) => r.floorLevel === currentFloor);
  const currentPartitions = (floorPlan.partitions || []).filter((p) => p.floorLevel === currentFloor);
  const currentOpenings = (floorPlan.openings || []).filter((o) => o.floorLevel === currentFloor);
  const currentElements = floorPlan.elements.filter((e) => e.floorLevel === currentFloor);
  const currentHeatingLoops = (floorPlan.heatingLoops || []).filter((h) => h.floorLevel === currentFloor);
  const currentRoutes = (floorPlan.routes || []).filter((r) => r.floorLevel === currentFloor);

  // Selected item references for Inspector
  const activeRoom = currentRooms.find((r) => r.id === selectedRoomId);
  const activePartition = currentPartitions.find((p) => p.id === selectedPartitionId);
  const activeOpening = currentOpenings.find((o) => o.id === selectedOpeningId);
  const activeElement = currentElements.find((e) => e.id === selectedElementId);
  const activeHeatingLoop = currentHeatingLoops.find((h) => h.id === selectedHeatingLoopId);
  const activeRoute = currentRoutes.find((r) => r.id === selectedRouteId);

  // Layer Visibility Handlers
  const handleToggleLayer = (layer: keyof EngineeringLayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleSetSoloLayer = (layer: keyof EngineeringLayerVisibility | "all") => {
    if (layer === "all") {
      setLayerVisibility(DEFAULT_LAYER_VISIBILITY);
    } else {
      setLayerVisibility({
        architecture: layer === "architecture",
        furniture: layer === "furniture",
        electric: layer === "electric",
        plumbing: layer === "plumbing",
        heating: layer === "heating",
        ventilation: layer === "ventilation"
      });
    }
  };

  // Route Drawing Handlers
  const handleStartDrawingRoute = (
    system: RouteSystem,
    name: string,
    coresOrDia?: string,
    color?: string
  ) => {
    setDrawingRoute({
      system,
      name,
      cableCores: system === "electric" ? coresOrDia || "3x2.5" : undefined,
      diameterMm: system !== "electric" ? parseInt(coresOrDia || "16") || 16 : undefined,
      color:
        color ||
        (system === "electric"
          ? "#f59e0b"
          : system === "plumbing_cold"
          ? "#0284c7"
          : system === "plumbing_hot"
          ? "#ef4444"
          : system === "sewer"
          ? "#475569"
          : "#ea580c"),
      points: []
    });
    setSelectedRouteId(null);
    setSelectedHeatingLoopId(null);
    setSelectedElementId(null);
    setSelectedRoomId(null);
    setSelectedPartitionId(null);
    setSelectedOpeningId(null);
  };

  const handleAddRoutePoint = (x: number, y: number) => {
    if (!drawingRoute) return;
    setDrawingRoute((prev) => {
      if (!prev) return null;
      const defaultZ =
        prev.system === "electric"
          ? 2.5
          : prev.system === "sewer"
          ? 0.08
          : prev.system === "plumbing_hot"
          ? 0.25
          : 0.18;
      const newPt: RoutePoint = { x, y, z: defaultZ };
      return {
        ...prev,
        points: [...prev.points, newPt]
      };
    });
  };

  const handleFinishDrawingRoute = () => {
    if (!drawingRoute || drawingRoute.points.length < 2) {
      setDrawingRoute(null);
      return;
    }
    const newRoute: EngineeringRoute = {
      id: `route_${Date.now()}`,
      floorLevel: currentFloor,
      system: drawingRoute.system,
      name: drawingRoute.name,
      points: drawingRoute.points,
      cableCores: drawingRoute.cableCores,
      diameterMm: drawingRoute.diameterMm,
      color: drawingRoute.color
    };
    setFloorPlan((prev) => ({
      ...prev,
      routes: [...(prev.routes || []), newRoute]
    }));
    setDrawingRoute(null);
    setSelectedRouteId(newRoute.id);
  };

  const handleCancelDrawingRoute = () => {
    setDrawingRoute(null);
  };

  const handleUndoRoutePoint = () => {
    if (!drawingRoute) return;
    setDrawingRoute((prev) => {
      if (!prev || prev.points.length === 0) return prev;
      return {
        ...prev,
        points: prev.points.slice(0, -1)
      };
    });
  };

  // Underfloor Heating Handlers
  const handleStartDrawingHeatingLoop = () => {
    setDrawingHeatingLoop(true);
    setDrawingRoute(null);
    setPlacingElement(null);
    setSelectedHeatingLoopId(null);
  };

  const handleFinishDrawingHeatingLoop = (x: number, y: number, w: number, h: number) => {
    const count = (floorPlan.heatingLoops || []).filter((l) => l.floorLevel === currentFloor).length;
    const newLoop: UnderfloorHeatingLoop = {
      id: `loop_${Date.now()}`,
      floorLevel: currentFloor,
      name: `Контур ТП #${count + 1}`,
      xMeters: x,
      yMeters: y,
      wMeters: w,
      hMeters: h,
      stepMm: 150,
      wallOffsetMm: 100,
      pattern: "snail",
      pipeDiameterMm: 16
    };
    const { lengthMeters } = generateUnderfloorHeatingSvg(newLoop, 1, 0);
    newLoop.pipeLengthMeters = lengthMeters;

    setFloorPlan((prev) => ({
      ...prev,
      heatingLoops: [...(prev.heatingLoops || []), newLoop]
    }));
    setDrawingHeatingLoop(false);
    setSelectedHeatingLoopId(newLoop.id);
  };

  const handleCancelDrawingHeatingLoop = () => {
    setDrawingHeatingLoop(false);
  };

  // Element Placement & Stamping Handlers
  const handleStartPlacingElement = (catItem: ElementCatalogItem) => {
    setPlacingElement(catItem);
    setDrawingRoute(null);
    setDrawingHeatingLoop(false);
    setSelectedElementId(null);
  };

  const handlePlaceElementAt = (catItem: ElementCatalogItem, x: number, y: number) => {
    const newEl: FloorPlanElement = {
      id: "el_" + Date.now(),
      type: catItem.type,
      floorLevel: currentFloor,
      xMeters: Math.max(0, Math.min(W - catItem.defaultW, Math.round(x * 20) / 20)),
      yMeters: Math.max(0, Math.min(H - catItem.defaultH, Math.round(y * 20) / 20)),
      wMeters: catItem.defaultW,
      hMeters: catItem.defaultH,
      rotation: 0,
      label: catItem.label,
      circuitNumber: catItem.category === "electric" ? "Гр-1" : catItem.category === "plumbing" ? "ХВС" : undefined
    };

    setFloorPlan((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl]
    }));
    setSelectedElementId(newEl.id);
  };

  const handleCancelPlacingElement = () => {
    setPlacingElement(null);
  };

  const handleAddHeatingLoop = (loop: UnderfloorHeatingLoop) => {
    setFloorPlan((prev) => ({
      ...prev,
      heatingLoops: [...(prev.heatingLoops || []), loop]
    }));
    setSelectedHeatingLoopId(loop.id);
  };

  const handleUpdateHeatingLoop = (updated: UnderfloorHeatingLoop) => {
    setFloorPlan((prev) => ({
      ...prev,
      heatingLoops: (prev.heatingLoops || []).map((h) => (h.id === updated.id ? updated : h))
    }));
  };

  const handleDeleteHeatingLoop = (id: string) => {
    setFloorPlan((prev) => ({
      ...prev,
      heatingLoops: (prev.heatingLoops || []).filter((h) => h.id !== id)
    }));
    if (selectedHeatingLoopId === id) setSelectedHeatingLoopId(null);
  };

  // Engineering Route Handlers
  const handleUpdateRoute = (updated: EngineeringRoute) => {
    setFloorPlan((prev) => ({
      ...prev,
      routes: (prev.routes || []).map((r) => (r.id === updated.id ? updated : r))
    }));
  };

  const handleDeleteRoute = (id: string) => {
    setFloorPlan((prev) => ({
      ...prev,
      routes: (prev.routes || []).filter((r) => r.id !== id)
    }));
    if (selectedRouteId === id) setSelectedRouteId(null);
  };

  // Step 1: Update Perimeter
  const handleUpdatePerimeter = (newW: number, newH: number, newThick: number) => {
    setW(newW);
    setH(newH);
    setOuterWallThickness(newThick);
    setFloorPlan((prev) => ({
      ...prev,
      outerWallThicknessMeters: newThick
    }));
  };

  // Step 1: Quick Templates
  const handleApplyTemplate = (type: "open_space" | "house" | "banya") => {
    const freshPlan = createDefaultFloorPlan(W, H, type === "open_space" ? "generic" : type);
    setFloorPlan(freshPlan);
    setSelectedRoomId(null);
    setSelectedPartitionId(null);
    setSelectedOpeningId(null);
    setSelectedElementId(null);
  };

  // Step 2: Add Partition
  const handleAddPartition = (orientation: "vertical" | "horizontal") => {
    const newPartition: FloorPartition = {
      id: "part_" + Date.now(),
      floorLevel: currentFloor,
      orientation,
      x1: orientation === "vertical" ? Math.round((W / 2) * 10) / 10 : 0,
      y1: orientation === "vertical" ? 0 : Math.round((H / 2) * 10) / 10,
      x2: orientation === "vertical" ? Math.round((W / 2) * 10) / 10 : W,
      y2: orientation === "vertical" ? H : Math.round((H / 2) * 10) / 10,
      thicknessMeters: 0.12,
      wallType: "partition",
      label: orientation === "vertical" ? "Вертикальная стена" : "Горизонтальная стена"
    };

    setFloorPlan((prev) => ({
      ...prev,
      partitions: [...(prev.partitions || []), newPartition]
    }));
    setSelectedPartitionId(newPartition.id);
    setSelectedRoomId(null);
    setSelectedOpeningId(null);
    setSelectedElementId(null);
  };

  // Step 2: Split space
  const handleSplitSpace = (mode: "half_v" | "half_h" | "hallway" | "entry") => {
    let p: FloorPartition;
    if (mode === "half_v") {
      const x = Math.round((W / 2) * 10) / 10;
      p = {
        id: "part_v_" + Date.now(),
        floorLevel: currentFloor,
        orientation: "vertical",
        x1: x,
        y1: 0,
        x2: x,
        y2: H,
        thicknessMeters: 0.15,
        wallType: "bearing",
        label: "Стена по центру"
      };
    } else if (mode === "half_h") {
      const y = Math.round((H / 2) * 10) / 10;
      p = {
        id: "part_h_" + Date.now(),
        floorLevel: currentFloor,
        orientation: "horizontal",
        x1: 0,
        y1: y,
        x2: W,
        y2: y,
        thicknessMeters: 0.15,
        wallType: "bearing",
        label: "Стена поперек"
      };
    } else if (mode === "hallway") {
      p = {
        id: "part_hall_" + Date.now(),
        floorLevel: currentFloor,
        orientation: "horizontal",
        x1: 0,
        y1: 1.5,
        x2: W,
        y2: 1.5,
        thicknessMeters: 0.12,
        wallType: "partition",
        label: "Стена коридора"
      };
    } else {
      p = {
        id: "part_entry_" + Date.now(),
        floorLevel: currentFloor,
        orientation: "vertical",
        x1: 2.0,
        y1: 0,
        x2: 2.0,
        y2: Math.min(3.0, H),
        thicknessMeters: 0.12,
        wallType: "partition",
        label: "Перегородка прихожей"
      };
    }

    setFloorPlan((prev) => ({
      ...prev,
      partitions: [...(prev.partitions || []), p]
    }));
    setSelectedPartitionId(p.id);
  };

  // Step 3: Auto-generate rooms from partitions
  const handleAutoGenerateRooms = () => {
    const generated = autoGenerateRoomsFromPartitions(W, H, floorPlan.partitions || [], currentFloor);
    setFloorPlan((prev) => ({
      ...prev,
      rooms: [...prev.rooms.filter((r) => r.floorLevel !== currentFloor), ...generated]
    }));
    if (generated.length > 0) {
      setSelectedRoomId(generated[0].id);
    }
  };

  // Step 3: Add Room Preset
  const handleAddRoomPreset = (preset: RoomPreset) => {
    const rw = Math.min(preset.defaultW, W);
    const rh = Math.min(preset.defaultH, H);
    const newRoom: PlanRoom = {
      id: "room_" + Date.now(),
      name: preset.label,
      type: preset.type,
      xMeters: 0,
      yMeters: 0,
      wMeters: rw,
      hMeters: rh,
      floorLevel: currentFloor,
      color: preset.color,
      floorFinish: "Ламинат 33 класс",
      ceilingHeight: 2.8
    };

    setFloorPlan((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom]
    }));
    setSelectedRoomId(newRoom.id);
  };

  // Step 4: Add Door / Window Opening (directly onto partition or wall)
  const handleAddOpening = (
    type: "door_interior" | "door_entrance" | "window_standard" | "window_panoramic",
    targetPartitionId?: string
  ) => {
    const isDoor = type.includes("door");
    const width =
      type === "window_panoramic"
        ? 2.4
        : type === "window_standard"
        ? 1.4
        : type === "door_entrance"
        ? 1.0
        : 0.85;

    // Check if there is a target partition or currently selected partition
    const targetPart =
      (floorPlan.partitions || []).find(
        (p) => p.id === (targetPartitionId || selectedPartitionId) && p.floorLevel === currentFloor
      ) || (floorPlan.partitions || []).find((p) => p.floorLevel === currentFloor);

    let newX = Math.round((W / 2 - width / 2) * 20) / 20;
    let newY = isDoor ? 0 : H;
    let orientation: "horizontal" | "vertical" = "horizontal";
    let rotation = 0;
    let wallId: string | undefined = undefined;
    let wallThick = 0.15;

    if (targetPart) {
      const isVert = targetPart.orientation === "vertical" || Math.abs(targetPart.x1 - targetPart.x2) < 0.05;
      wallId = targetPart.id;
      wallThick = targetPart.thicknessMeters || 0.12;

      if (isVert) {
        orientation = "vertical";
        rotation = 90;
        newX = targetPart.x1;
        const midY = (targetPart.y1 + targetPart.y2) / 2;
        newY = Math.round((midY - width / 2) * 20) / 20;
      } else {
        orientation = "horizontal";
        rotation = 0;
        newY = targetPart.y1;
        const midX = (targetPart.x1 + targetPart.x2) / 2;
        newX = Math.round((midX - width / 2) * 20) / 20;
      }
    } else {
      // Default to outer bottom wall (e.g. entrance door or facade window)
      newY = H;
      wallId = "outer_bottom";
      wallThick = outerWallThickness;
    }

    const newOpening: FloorOpening = {
      id: "op_" + Date.now(),
      floorLevel: currentFloor,
      type,
      xMeters: newX,
      yMeters: newY,
      widthMeters: width,
      orientation,
      rotation,
      swingDirection: "right_in",
      wallId,
      wallThickness: wallThick,
      label:
        type === "door_entrance"
          ? "Входная дверь"
          : isDoor
          ? "Межкомнатная дверь"
          : type === "window_panoramic"
          ? "Панорамное окно"
          : "Окно"
    };

    setFloorPlan((prev) => ({
      ...prev,
      openings: [...(prev.openings || []), newOpening]
    }));
    setSelectedOpeningId(newOpening.id);
  };

  // Direct 1-click install onto specific partition
  const handleInstallOpeningOnPartition = (
    partitionId: string,
    type: "door_interior" | "door_entrance" | "window_standard" | "window_panoramic"
  ) => {
    handleAddOpening(type, partitionId);
  };

  // Step 4: Add MEP Element
  const handleAddElement = (catItem: ElementCatalogItem) => {
    let newX = 1.0;
    let newY = 1.0;
    if (activeRoom) {
      const roomEls = currentElements.filter(
        (e) =>
          e.xMeters >= activeRoom.xMeters &&
          e.xMeters <= activeRoom.xMeters + activeRoom.wMeters &&
          e.yMeters >= activeRoom.yMeters &&
          e.yMeters <= activeRoom.yMeters + activeRoom.hMeters
      );
      const off = (roomEls.length % 5) * 0.35;
      newX = Math.max(
        activeRoom.xMeters,
        Math.min(activeRoom.xMeters + activeRoom.wMeters - catItem.defaultW, activeRoom.xMeters + 0.4 + off)
      );
      newY = Math.max(
        activeRoom.yMeters,
        Math.min(activeRoom.yMeters + activeRoom.hMeters - catItem.defaultH, activeRoom.yMeters + 0.4 + off)
      );
    } else {
      const count = currentElements.length;
      newX = Math.min(W - catItem.defaultW - 0.3, 1.0 + (count % 8) * 0.4);
      newY = Math.min(H - catItem.defaultH - 0.3, 1.0 + (Math.floor(count / 8) % 6) * 0.4);
    }

    const newEl: FloorPlanElement = {
      id: "el_" + Date.now(),
      type: catItem.type,
      floorLevel: currentFloor,
      xMeters: Math.round(newX * 20) / 20,
      yMeters: Math.round(newY * 20) / 20,
      wMeters: catItem.defaultW,
      hMeters: catItem.defaultH,
      rotation: 0,
      label: catItem.label,
      circuitNumber: catItem.category === "electric" ? "Гр-1" : catItem.category === "plumbing" ? "ХВС" : undefined
    };

    setFloorPlan((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl]
    }));
    setSelectedElementId(newEl.id);
  };

  // Rotate Opening 90 degrees
  const handleRotateOpening = (id: string) => {
    setFloorPlan((prev) => ({
      ...prev,
      openings: (prev.openings || []).map((o) => {
        if (o.id !== id) return o;
        return { ...o, rotation: ((o.rotation || 0) + 90) % 360 };
      })
    }));
  };

  // Rotate Element 90 degrees
  const handleRotateElement = (id: string) => {
    setFloorPlan((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id !== id) return el;
        return { ...el, rotation: ((el.rotation || 0) + 90) % 360 };
      })
    }));
  };

  // Mouse drag coordination
  const handleMouseDownItem = (
    e: React.MouseEvent,
    type: "room" | "partition" | "opening" | "element" | "heating_loop" | "route",
    id: string,
    origX: number,
    origY: number
  ) => {
    // If currently routing, drawing heating loop, or placing items, ignore dragging
    if (drawingRoute || drawingHeatingLoop || placingElement) {
      return;
    }
    e.stopPropagation();
    if (type === "room") {
      setSelectedRoomId(id);
      setSelectedPartitionId(null);
      setSelectedOpeningId(null);
      setSelectedElementId(null);
      setSelectedHeatingLoopId(null);
      setSelectedRouteId(null);
    } else if (type === "partition") {
      setSelectedPartitionId(id);
      setSelectedRoomId(null);
      setSelectedOpeningId(null);
      setSelectedElementId(null);
      setSelectedHeatingLoopId(null);
      setSelectedRouteId(null);
    } else if (type === "opening") {
      setSelectedOpeningId(id);
      setSelectedRoomId(null);
      setSelectedPartitionId(null);
      setSelectedElementId(null);
      setSelectedHeatingLoopId(null);
      setSelectedRouteId(null);
    } else if (type === "heating_loop") {
      setSelectedHeatingLoopId(id);
      setSelectedRoomId(null);
      setSelectedPartitionId(null);
      setSelectedOpeningId(null);
      setSelectedElementId(null);
      setSelectedRouteId(null);
    } else if (type === "route") {
      setSelectedRouteId(id);
      setSelectedRoomId(null);
      setSelectedPartitionId(null);
      setSelectedOpeningId(null);
      setSelectedElementId(null);
      setSelectedHeatingLoopId(null);
    } else {
      setSelectedElementId(id);
      setSelectedRoomId(null);
      setSelectedPartitionId(null);
      setSelectedOpeningId(null);
      setSelectedHeatingLoopId(null);
      setSelectedRouteId(null);
    }

    if (type !== "route") {
      setDraggingItem({
        type,
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY
      });
    }
  };

  // Heating loop edge and corner resizing handler
  const handleMouseDownResizeHeatingLoop = (
    e: React.MouseEvent,
    id: string,
    handle: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se",
    initialLoop: UnderfloorHeatingLoop
  ) => {
    if (drawingRoute || drawingHeatingLoop || placingElement) {
      return;
    }
    e.stopPropagation();
    setSelectedHeatingLoopId(id);
    setSelectedRoomId(null);
    setSelectedPartitionId(null);
    setSelectedOpeningId(null);
    setSelectedElementId(null);
    setSelectedRouteId(null);

    setResizingHeatingLoop({
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: initialLoop.xMeters,
      origY: initialLoop.yMeters,
      origW: initialLoop.wMeters,
      origH: initialLoop.hMeters
    });
  };

  // Unified drag and resize processor
  const processDragOrResize = (clientX: number, clientY: number) => {
    const basePpm = 60 * zoomScale;

    // A. RESIZING HEATING LOOP
    if (resizingHeatingLoop) {
      const dx = (clientX - resizingHeatingLoop.startX) / basePpm;
      const dy = (clientY - resizingHeatingLoop.startY) / basePpm;
      const { id, handle, origX, origY, origW, origH } = resizingHeatingLoop;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;

      // Handle Horizontal (East / West / Corners)
      if (handle === "e" || handle === "ne" || handle === "se") {
        const maxAllowedW = Math.max(0.4, W - origX);
        newW = Math.max(0.4, Math.min(maxAllowedW, Math.round((origW + dx) * 20) / 20));
      } else if (handle === "w" || handle === "nw" || handle === "sw") {
        const clampedDx = Math.max(-origX, Math.min(origW - 0.4, dx));
        const snappedNewX = Math.round((origX + clampedDx) * 20) / 20;
        newW = Math.max(0.4, Math.round((origW - (snappedNewX - origX)) * 20) / 20);
        newX = snappedNewX;
      }

      // Handle Vertical (North / South / Corners)
      if (handle === "s" || handle === "se" || handle === "sw") {
        const maxAllowedH = Math.max(0.4, H - origY);
        newH = Math.max(0.4, Math.min(maxAllowedH, Math.round((origH + dy) * 20) / 20));
      } else if (handle === "n" || handle === "ne" || handle === "nw") {
        const clampedDy = Math.max(-origY, Math.min(origH - 0.4, dy));
        const snappedNewY = Math.round((origY + clampedDy) * 20) / 20;
        newH = Math.max(0.4, Math.round((origH - (snappedNewY - origY)) * 20) / 20);
        newY = snappedNewY;
      }

      setFloorPlan((prev) => {
        const loop = (prev.heatingLoops || []).find((l) => l.id === id);
        if (!loop) return prev;
        const updated: UnderfloorHeatingLoop = {
          ...loop,
          xMeters: newX,
          yMeters: newY,
          wMeters: newW,
          hMeters: newH
        };
        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
        updated.pipeLengthMeters = lengthMeters;

        return {
          ...prev,
          heatingLoops: (prev.heatingLoops || []).map((l) => (l.id === id ? updated : l))
        };
      });
      return;
    }

    // B. DRAGGING ITEMS
    if (!draggingItem) return;
    const dx = (clientX - draggingItem.startX) / basePpm;
    const dy = (clientY - draggingItem.startY) / basePpm;

    if (draggingItem.type === "room") {
      const room = currentRooms.find((r) => r.id === draggingItem.id);
      if (!room) return;
      const newX = snapVal(Math.max(0, Math.min(W - room.wMeters, draggingItem.origX + dx)));
      const newY = snapVal(Math.max(0, Math.min(H - room.hMeters, draggingItem.origY + dy)));
      setFloorPlan((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === draggingItem.id ? { ...r, xMeters: newX, yMeters: newY } : r))
      }));
    } else if (draggingItem.type === "partition") {
      const p = currentPartitions.find((x) => x.id === draggingItem.id);
      if (!p) return;
      const isVert = p.orientation === "vertical" || Math.abs(p.x1 - p.x2) < 0.05;
      if (isVert) {
        const newX = snapVal(Math.max(0, Math.min(W, draggingItem.origX + dx)));
        setFloorPlan((prev) => ({
          ...prev,
          partitions: (prev.partitions || []).map((item) =>
            item.id === p.id ? { ...item, x1: newX, x2: newX } : item
          )
        }));
      } else {
        const newY = snapVal(Math.max(0, Math.min(H, draggingItem.origY + dy)));
        setFloorPlan((prev) => ({
          ...prev,
          partitions: (prev.partitions || []).map((item) =>
            item.id === p.id ? { ...item, y1: newY, y2: newY } : item
          )
        }));
      }
    } else if (draggingItem.type === "opening") {
      const op = currentOpenings.find((o) => o.id === draggingItem.id);
      if (!op) return;
      const rawX = draggingItem.origX + dx;
      const rawY = draggingItem.origY + dy;

      const snap = findMagneticWallSnap(
        rawX,
        rawY,
        op.widthMeters,
        currentPartitions,
        currentFloor,
        W,
        H,
        outerWallThickness,
        0.45
      );

      if (snap) {
        setSnappedWallFeedback({
          label: snap.wallLabel,
          x: snap.orientation === "vertical" ? snap.xMeters : undefined,
          y: snap.orientation === "horizontal" ? snap.yMeters : undefined,
          orientation: snap.orientation
        });
        setFloorPlan((prev) => ({
          ...prev,
          openings: (prev.openings || []).map((o) =>
            o.id === op.id
              ? {
                  ...o,
                  xMeters: snap.xMeters,
                  yMeters: snap.yMeters,
                  orientation: snap.orientation,
                  rotation: snap.rotation,
                  wallId: snap.wallId,
                  wallThickness: snap.thicknessMeters
                }
              : o
          )
        }));
      } else {
        setSnappedWallFeedback(null);
        const newX = Math.round(Math.max(0, Math.min(W - op.widthMeters, rawX)) * 20) / 20;
        const newY = Math.round(Math.max(0, Math.min(H, rawY)) * 20) / 20;
        setFloorPlan((prev) => ({
          ...prev,
          openings: (prev.openings || []).map((o) =>
            o.id === op.id ? { ...o, xMeters: newX, yMeters: newY, wallId: undefined } : o
          )
        }));
      }
    } else if (draggingItem.type === "element") {
      const el = currentElements.find((item) => item.id === draggingItem.id);
      if (!el) return;
      const newX = snapVal(Math.max(0, Math.min(W - el.wMeters, draggingItem.origX + dx)));
      const newY = snapVal(Math.max(0, Math.min(H - el.hMeters, draggingItem.origY + dy)));
      setFloorPlan((prev) => ({
        ...prev,
        elements: prev.elements.map((item) =>
          item.id === el.id ? { ...item, xMeters: newX, yMeters: newY } : item
        )
      }));
    } else if (draggingItem.type === "heating_loop") {
      const loop = currentHeatingLoops.find((item) => item.id === draggingItem.id);
      if (!loop) return;
      const newX = snapVal(Math.max(0, Math.min(W - loop.wMeters, draggingItem.origX + dx)));
      const newY = snapVal(Math.max(0, Math.min(H - loop.hMeters, draggingItem.origY + dy)));
      setFloorPlan((prev) => ({
        ...prev,
        heatingLoops: (prev.heatingLoops || []).map((l) =>
          l.id === loop.id ? { ...l, xMeters: newX, yMeters: newY } : l
        )
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    processDragOrResize(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
    setResizingHeatingLoop(null);
    setSnappedWallFeedback(null);
  };

  // Global window mouse listeners during drag or resize for 100% reliable tracking
  useEffect(() => {
    if (!draggingItem && !resizingHeatingLoop) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      processDragOrResize(e.clientX, e.clientY);
    };

    const onGlobalMouseUp = () => {
      setDraggingItem(null);
      setResizingHeatingLoop(null);
      setSnappedWallFeedback(null);
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
  }, [draggingItem, resizingHeatingLoop, zoomScale, W, H, outerWallThickness, currentFloor]);

  // Delete selected item
  const handleDeleteSelected = () => {
    if (selectedPartitionId) {
      setFloorPlan((prev) => ({
        ...prev,
        partitions: (prev.partitions || []).filter((p) => p.id !== selectedPartitionId)
      }));
      setSelectedPartitionId(null);
    } else if (selectedRoomId) {
      setFloorPlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== selectedRoomId)
      }));
      setSelectedRoomId(null);
    } else if (selectedOpeningId) {
      setFloorPlan((prev) => ({
        ...prev,
        openings: (prev.openings || []).filter((o) => o.id !== selectedOpeningId)
      }));
      setSelectedOpeningId(null);
    } else if (selectedElementId) {
      setFloorPlan((prev) => ({
        ...prev,
        elements: prev.elements.filter((e) => e.id !== selectedElementId)
      }));
      setSelectedElementId(null);
    } else if (selectedHeatingLoopId) {
      handleDeleteHeatingLoop(selectedHeatingLoopId);
    } else if (selectedRouteId) {
      handleDeleteRoute(selectedRouteId);
    }
  };

  // Add floor
  const handleAddFloor = () => {
    const nextLevel = floorPlan.floors.length + 1;
    setFloorPlan((prev) => ({
      ...prev,
      floors: [...prev.floors, { level: nextLevel, name: `${nextLevel} этаж`, heightMeters: 2.7 }]
    }));
    setCurrentFloor(nextLevel);
  };

  // Save & close
  const handleSave = () => {
    onSave({
      ...floorPlan,
      outerWallThicknessMeters: outerWallThickness
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[125] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-[1440px] h-[96vh] shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Архитектурный план помещений: {buildingLabel || "Строение"}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-amber-400 font-mono font-bold">
                  {W}м × {H}м ({Math.round(W * H * 10) / 10} м² пятно)
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                1. Периметр строения → 2. Расстановка перегородок → 3. Формирование комнат и площадей → 4. Двери, мебель и оборудование
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sidebar toggle buttons */}
            <button
              type="button"
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isLeftSidebarOpen
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              title={isLeftSidebarOpen ? "Свернуть панель инструментов" : "Показать панель инструментов"}
            >
              {isLeftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              <span>{isLeftSidebarOpen ? "Панель" : "Панель"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isRightSidebarOpen
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
              title={isRightSidebarOpen ? "Свернуть инспектор свойств" : "Показать инспектор свойств"}
            >
              {isRightSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              <span>{isRightSidebarOpen ? "Свойства" : "Свойства"}</span>
            </button>

            {/* View Mode Tabs: 2D Plan / Electrical Board / Collector Schemes / 3D Axonometry / Specification */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "editor"
                    ? "bg-amber-500 text-neutral-950 font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>📐</span>
                <span>2D Чертёж</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("electric_scheme")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "electric_scheme"
                    ? "bg-amber-400 text-neutral-950 font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Схема электрощита (DIN-рейки, автоматы, УЗО, реле напряжения, балансировка фаз)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Электрощит (DIN)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("collector_scheme")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "collector_scheme"
                    ? "bg-rose-500 text-white font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Коллекторные схемы (Тёплый пол со смесительным узлом, Радиаторы, Водопровод)"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Коллекторы (ТП/Рад/Вода)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("axonometry")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "axonometry"
                    ? "bg-sky-500 text-neutral-950 font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="3D Аксонометрическая схема слоёв и коммуникаций"
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>3D Аксонометрия</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("spec")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "spec"
                    ? "bg-emerald-500 text-neutral-950 font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Экспликация</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floor Switcher, Layer Toggles, Zoom & Quick Rotation Bar */}
        <div className="px-5 py-2 border-b border-neutral-800 bg-neutral-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Floors switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-400 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Этаж:</span>
            </span>

            {floorPlan.floors.map((fl) => (
              <button
                key={fl.level}
                type="button"
                onClick={() => {
                  setCurrentFloor(fl.level);
                  setSelectedRoomId(null);
                  setSelectedPartitionId(null);
                  setSelectedOpeningId(null);
                  setSelectedElementId(null);
                  setSelectedRouteId(null);
                  setSelectedHeatingLoopId(null);
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currentFloor === fl.level
                    ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {fl.name}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAddFloor}
              className="p-1 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить этаж</span>
            </button>
          </div>

          {/* Layer Visibility Pills on Top Bar */}
          <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
            <span className="text-[9px] font-mono uppercase text-neutral-400 mr-1 font-bold">
              Слои:
            </span>
            {[
              { key: "architecture" as const, label: "Стены", icon: "🏛️" },
              { key: "electric" as const, label: "Электрика", icon: "⚡" },
              { key: "heating" as const, label: "Тёплый пол", icon: "🔥" },
              { key: "plumbing" as const, label: "Сантехника", icon: "💧" },
              { key: "furniture" as const, label: "Мебель", icon: "🛋️" }
            ].map((l) => {
              const active = layerVisibility[l.key];
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => handleToggleLayer(l.key)}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer border flex items-center gap-1 ${
                    active
                      ? "bg-neutral-800 border-neutral-700 text-white shadow-sm"
                      : "bg-neutral-950 border-neutral-900 text-neutral-500 line-through opacity-70"
                  }`}
                  title={active ? `Скрыть слой ${l.label}` : `Показать слой ${l.label}`}
                >
                  <span>{l.icon}</span>
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Rotation Action Bar if Door, Window, or Furniture is Selected */}
          {(selectedOpeningId || selectedElementId) && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
              <span className="text-[11px] text-amber-300 font-bold">Выбран элемент:</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedOpeningId) handleRotateOpening(selectedOpeningId);
                  else if (selectedElementId) handleRotateElement(selectedElementId);
                }}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1 cursor-pointer transition shadow-sm"
                title="Повернуть на 90 градусов"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Повернуть на 90°</span>
              </button>
            </div>
          )}

          {/* Enhanced Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.5, Math.round((z - 0.2) * 100) / 100))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Уменьшить масштаб (Ctrl + колесико мыши)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Quick scale buttons */}
            {[
              { val: 0.75, label: "75%" },
              { val: 1.0, label: "100%" },
              { val: 1.5, label: "150%" },
              { val: 2.0, label: "200%" }
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setZoomScale(s.val)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                  Math.abs(zoomScale - s.val) < 0.05
                    ? "bg-amber-500 text-neutral-950 font-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(3.5, Math.round((z + 0.2) * 100) / 100))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Увеличить масштаб (Ctrl + колесико мыши)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-neutral-600">|</span>

            {/* Fit button */}
            <button
              type="button"
              onClick={() => {
                const fitScale = Math.min(1.2, Math.max(0.6, Math.min(12 / W, 8 / H)));
                setZoomScale(Math.round(fitScale * 100) / 100);
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-[10px] font-mono text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              title="Вписать план в окно"
            >
              Вписать
            </button>
          </div>
        </div>

        {/* Main Body */}
        {activeTab === "editor" ? (
          <div className="flex-1 flex overflow-hidden relative">
            {/* 1. LEFT SIDEBAR OR COLLAPSED TAB */}
            {isLeftSidebarOpen ? (
              <div className="relative flex shrink-0 h-full">
                <FloorPlanSidebar
                  workflowStep={workflowStep}
                  setWorkflowStep={setWorkflowStep}
                  W={W}
                  H={H}
                  outerWallThickness={outerWallThickness}
                  onUpdatePerimeter={handleUpdatePerimeter}
                  onApplyTemplate={handleApplyTemplate}
                  currentPartitions={currentPartitions}
                  onAddPartition={handleAddPartition}
                  onSplitSpace={handleSplitSpace}
                  onDeletePartition={(id) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      partitions: (prev.partitions || []).filter((p) => p.id !== id)
                    }));
                    if (selectedPartitionId === id) setSelectedPartitionId(null);
                  }}
                  onSelectPartition={(id) => {
                    setSelectedPartitionId(id);
                    setSelectedRoomId(null);
                    setSelectedOpeningId(null);
                    setSelectedElementId(null);
                    setSelectedRouteId(null);
                    setSelectedHeatingLoopId(null);
                  }}
                  currentRooms={currentRooms}
                  onAutoGenerateRooms={handleAutoGenerateRooms}
                  onAddRoomPreset={handleAddRoomPreset}
                  onDeleteRoom={(id) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      rooms: prev.rooms.filter((r) => r.id !== id)
                    }));
                    if (selectedRoomId === id) setSelectedRoomId(null);
                  }}
                  onSelectRoom={(id) => {
                    setSelectedRoomId(id);
                    setSelectedPartitionId(null);
                    setSelectedOpeningId(null);
                    setSelectedElementId(null);
                    setSelectedRouteId(null);
                    setSelectedHeatingLoopId(null);
                  }}
                  onAddOpening={handleAddOpening}
                  onAddElement={handleAddElement}
                  onInstallOpeningOnPartition={handleInstallOpeningOnPartition}
                  layerVisibility={layerVisibility}
                  onToggleLayer={handleToggleLayer}
                  onSetSoloLayer={handleSetSoloLayer}
                  currentHeatingLoops={currentHeatingLoops}
                  currentRoutes={currentRoutes}
                  onAddHeatingLoop={handleAddHeatingLoop}
                  onDeleteHeatingLoop={handleDeleteHeatingLoop}
                  onSelectHeatingLoop={setSelectedHeatingLoopId}
                  onStartDrawingHeatingLoop={handleStartDrawingHeatingLoop}
                  onStartPlacingElement={handleStartPlacingElement}
                  onStartDrawingRoute={handleStartDrawingRoute}
                  onDeleteRoute={handleDeleteRoute}
                  onSelectRoute={setSelectedRouteId}
                  isDrawingRoute={!!drawingRoute}
                  onCancelDrawingRoute={handleCancelDrawingRoute}
                />
                {/* Collapse button on edge */}
                <button
                  type="button"
                  onClick={() => setIsLeftSidebarOpen(false)}
                  className="absolute top-3 right-[-14px] z-20 w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 shadow-md flex items-center justify-center cursor-pointer transition"
                  title="Свернуть панель инструментов"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLeftSidebarOpen(true)}
                className="w-9 h-full bg-neutral-950/80 hover:bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-4 gap-3 text-neutral-400 hover:text-amber-400 transition cursor-pointer select-none shrink-0"
                title="Развернуть панель инструментов"
              >
                <ChevronRight className="w-4 h-4 text-amber-500" />
                <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-wider">
                  Инструменты
                </span>
              </button>
            )}

            {/* 2. CENTER CANVAS: Full Building Floor Plan View with Zoom & Rotation */}
            <FloorPlanCanvas
              W={W}
              H={H}
              outerWallThickness={outerWallThickness}
              currentFloor={currentFloor}
              currentRooms={currentRooms}
              currentPartitions={currentPartitions}
              currentOpenings={currentOpenings}
              currentElements={currentElements}
              currentRoutes={currentRoutes}
              currentHeatingLoops={currentHeatingLoops}
              layerVisibility={layerVisibility}
              selectedRoomId={selectedRoomId}
              selectedPartitionId={selectedPartitionId}
              selectedOpeningId={selectedOpeningId}
              selectedElementId={selectedElementId}
              selectedRouteId={selectedRouteId}
              selectedHeatingLoopId={selectedHeatingLoopId}
              drawingRoute={drawingRoute}
              drawingHeatingLoop={drawingHeatingLoop}
              placingElement={placingElement}
              showRulers={showRulers}
              zoomScale={zoomScale}
              snappedWallInfo={snappedWallFeedback}
              onZoomChange={setZoomScale}
              onSelectRoom={setSelectedRoomId}
              onSelectPartition={setSelectedPartitionId}
              onSelectOpening={setSelectedOpeningId}
              onSelectElement={setSelectedElementId}
              onSelectRoute={setSelectedRouteId}
              onSelectHeatingLoop={setSelectedHeatingLoopId}
              onAddRoutePoint={handleAddRoutePoint}
              onFinishDrawingRoute={handleFinishDrawingRoute}
              onCancelDrawingRoute={handleCancelDrawingRoute}
              onUndoRoutePoint={handleUndoRoutePoint}
              onFinishDrawingHeatingLoop={handleFinishDrawingHeatingLoop}
              onCancelDrawingHeatingLoop={handleCancelDrawingHeatingLoop}
              onPlaceElementAt={handlePlaceElementAt}
              onCancelPlacingElement={handleCancelPlacingElement}
              onStartPlacingElement={handleStartPlacingElement}
              onStartDrawingHeatingLoop={handleStartDrawingHeatingLoop}
              onStartDrawingRoute={handleStartDrawingRoute}
              onMouseDownItem={handleMouseDownItem}
              onMouseDownResizeHeatingLoop={handleMouseDownResizeHeatingLoop}
              onRotateOpening={handleRotateOpening}
            />

            {/* 3. RIGHT INSPECTOR OR COLLAPSED TAB */}
            {isRightSidebarOpen ? (
              <div className="relative flex shrink-0 h-full">
                {/* Collapse button on edge */}
                <button
                  type="button"
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="absolute top-3 left-[-14px] z-20 w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 shadow-md flex items-center justify-center cursor-pointer transition"
                  title="Свернуть инспектор"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <FloorPlanInspector
                  W={W}
                  H={H}
                  outerWallThickness={outerWallThickness}
                  activeRoom={activeRoom}
                  activePartition={activePartition}
                  activeOpening={activeOpening}
                  activeElement={activeElement}
                  activeHeatingLoop={activeHeatingLoop}
                  activeRoute={activeRoute}
                  currentRooms={currentRooms}
                  currentPartitions={currentPartitions}
                  currentElements={currentElements}
                  onUpdateRoom={(updated) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      rooms: prev.rooms.map((r) => (r.id === updated.id ? updated : r))
                    }));
                  }}
                  onUpdatePartition={(updated) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      partitions: (prev.partitions || []).map((p) => (p.id === updated.id ? updated : p))
                    }));
                  }}
                  onUpdateOpening={(updated) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      openings: (prev.openings || []).map((o) => (o.id === updated.id ? updated : o))
                    }));
                  }}
                  onUpdateElement={(updated) => {
                    setFloorPlan((prev) => ({
                      ...prev,
                      elements: prev.elements.map((el) => (el.id === updated.id ? updated : el))
                    }));
                  }}
                  onUpdateHeatingLoop={handleUpdateHeatingLoop}
                  onUpdateRoute={handleUpdateRoute}
                  onDeleteSelected={handleDeleteSelected}
                  onRotateElement={handleRotateElement}
                  onInstallOpeningOnPartition={handleInstallOpeningOnPartition}
                  onOpenTab={(tab) => setActiveTab(tab)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsRightSidebarOpen(true)}
                className="w-9 h-full bg-neutral-950/80 hover:bg-neutral-900 border-l border-neutral-800 flex flex-col items-center py-4 gap-3 text-neutral-400 hover:text-amber-400 transition cursor-pointer select-none shrink-0"
                title="Развернуть инспектор свойств"
              >
                <ChevronLeft className="w-4 h-4 text-amber-500" />
                <span className="[writing-mode:vertical-lr] text-[10px] font-bold uppercase tracking-wider">
                  Свойства
                </span>
              </button>
            )}
          </div>
        ) : activeTab === "electric_scheme" ? (
          /* ELECTRICAL PANEL SCHEMATICS (DIN-RAIL MODULAR LAYOUT & BREAKER NUMBERING) */
          <FloorPlanElectricScheme
            panels={floorPlan.electricalPanels || createDefaultElectricalPanels()}
            onUpdatePanels={(updatedPanels) => {
              setFloorPlan((prev) => ({
                ...prev,
                electricalPanels: updatedPanels
              }));
            }}
            onClose={() => setActiveTab("editor")}
          />
        ) : activeTab === "collector_scheme" ? (
          /* COLLECTOR SCHEMATICS (UNDERFLOOR HEATING, RADIATORS & WATER SUPPLY) */
          <FloorPlanCollectorScheme
            schemes={floorPlan.collectorSchemes || createDefaultCollectorSchemes()}
            onUpdateSchemes={(updatedSchemes) => {
              setFloorPlan((prev) => ({
                ...prev,
                collectorSchemes: updatedSchemes
              }));
            }}
            onClose={() => setActiveTab("editor")}
          />
        ) : activeTab === "axonometry" ? (
          /* 3D AXONOMETRY VIEW OF LAYERS */
          <FloorPlanAxonometry
            W={W}
            H={H}
            outerWallThickness={outerWallThickness}
            floorPlan={floorPlan}
            currentFloor={currentFloor}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
            onSetSoloLayer={handleSetSoloLayer}
            onClose={() => setActiveTab("editor")}
          />
        ) : (
          /* SPECIFICATION & EXPLICATION TABLE */
          <FloorPlanSpecTable
            buildingLabel={buildingLabel}
            W={W}
            H={H}
            currentFloor={currentFloor}
            currentRooms={currentRooms}
            currentPartitions={currentPartitions}
            currentOpenings={currentOpenings}
            currentElements={currentElements}
            currentHeatingLoops={currentHeatingLoops}
            currentRoutes={currentRoutes}
            onBackToEditor={() => setActiveTab("editor")}
          />
        )}

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-neutral-800 bg-neutral-950 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Масштабирование {Math.round(zoomScale * 100)}% (Ctrl + колесико мыши) · Поворот окон и дверей на 90° · Сворачиваемые панели для черчения
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить в паспорт объекта</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

