import React, { useState, useEffect } from "react";
import {
  Check,
  X,
  Undo2,
  Zap,
  Droplets,
  Flame,
  Wind,
  Plus,
  Shield,
  Radio,
  Tv,
  Power,
  RotateCw,
  Sparkles,
  MousePointer,
  HelpCircle
} from "lucide-react";
import {
  FloorPartition,
  PlanRoom,
  FloorPlanElement,
  FloorOpening,
  EngineeringRoute,
  UnderfloorHeatingLoop,
  EngineeringLayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  ELEMENT_CATALOG,
  ElementCatalogItem,
  RoutePoint,
  RouteSystem
} from "../../types/architecturalTypes";
import {
  getOpeningsOnPartition,
  getOpeningsOnOuterWall,
  getWallSegmentsWithOpenings,
  generateUnderfloorHeatingSvg,
  calculateRouteLength
} from "./floorPlanUtils";

interface FloorPlanCanvasProps {
  W: number;
  H: number;
  outerWallThickness: number;
  currentFloor?: number;
  currentRooms: PlanRoom[];
  currentPartitions: FloorPartition[];
  currentOpenings: FloorOpening[];
  currentElements: FloorPlanElement[];
  currentRoutes?: EngineeringRoute[];
  currentHeatingLoops?: UnderfloorHeatingLoop[];
  layerVisibility?: EngineeringLayerVisibility;
  selectedRoomId: string | null;
  selectedPartitionId: string | null;
  selectedOpeningId: string | null;
  selectedElementId: string | null;
  selectedRouteId?: string | null;
  selectedHeatingLoopId?: string | null;
  showRulers: boolean;
  zoomScale: number;
  snappedWallInfo?: { label: string; x?: number; y?: number; orientation?: "horizontal" | "vertical" } | null;
  drawingRoute?: {
    system: RouteSystem;
    points: RoutePoint[];
    name: string;
    cableCores?: string;
    diameterMm?: number;
    color?: string;
  } | null;
  drawingHeatingLoop?: boolean;
  placingElement?: ElementCatalogItem | null;
  onZoomChange?: (newScale: number) => void;
  onSelectRoom: (id: string | null) => void;
  onSelectPartition: (id: string | null) => void;
  onSelectOpening: (id: string | null) => void;
  onSelectElement: (id: string | null) => void;
  onSelectRoute?: (id: string | null) => void;
  onSelectHeatingLoop?: (id: string | null) => void;
  onAddRoutePoint?: (x: number, y: number) => void;
  onUndoRoutePoint?: () => void;
  onFinishDrawingRoute?: () => void;
  onCancelDrawingRoute?: () => void;
  onFinishDrawingHeatingLoop?: (x: number, y: number, w: number, h: number) => void;
  onCancelDrawingHeatingLoop?: () => void;
  onPlaceElementAt?: (catItem: ElementCatalogItem, x: number, y: number) => void;
  onCancelPlacingElement?: () => void;
  onDropElement?: (catItem: ElementCatalogItem, x: number, y: number) => void;
  onQuickStartRoute?: (system: RouteSystem, name: string, coresOrDia: string, color: string) => void;
  onQuickStartHeatingLoop?: () => void;
  onQuickStartPlacingElement?: (catItem: ElementCatalogItem) => void;
  onMouseDownItem: (
    e: React.MouseEvent,
    type: "room" | "partition" | "opening" | "element" | "heating_loop" | "route",
    id: string,
    origX: number,
    origY: number
  ) => void;
  onMouseDownResizeHeatingLoop?: (
    e: React.MouseEvent,
    id: string,
    handle: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se",
    initialLoop: UnderfloorHeatingLoop
  ) => void;
  onRotateOpening?: (id: string) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  W,
  H,
  outerWallThickness,
  currentFloor = 1,
  currentRooms,
  currentPartitions,
  currentOpenings,
  currentElements,
  currentRoutes = [],
  currentHeatingLoops = [],
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  selectedRoomId,
  selectedPartitionId,
  selectedOpeningId,
  selectedElementId,
  selectedRouteId,
  selectedHeatingLoopId,
  showRulers,
  zoomScale,
  snappedWallInfo,
  drawingRoute,
  drawingHeatingLoop,
  placingElement,
  onZoomChange,
  onSelectRoom,
  onSelectPartition,
  onSelectOpening,
  onSelectElement,
  onSelectRoute,
  onSelectHeatingLoop,
  onAddRoutePoint,
  onUndoRoutePoint,
  onFinishDrawingRoute,
  onCancelDrawingRoute,
  onFinishDrawingHeatingLoop,
  onCancelDrawingHeatingLoop,
  onPlaceElementAt,
  onCancelPlacingElement,
  onDropElement,
  onQuickStartRoute,
  onQuickStartHeatingLoop,
  onQuickStartPlacingElement,
  onMouseDownItem,
  onMouseDownResizeHeatingLoop,
  onRotateOpening
}) => {
  const canvasPadding = 60;
  const basePpm = 60;
  const pixelsPerMeter = basePpm * zoomScale;
  const svgWidth = W * pixelsPerMeter + canvasPadding * 2;
  const svgHeight = H * pixelsPerMeter + canvasPadding * 2;

  const wallThickPx = Math.max(4, outerWallThickness * pixelsPerMeter);

  const [hoverMeters, setHoverMeters] = useState<{ x: number; y: number } | null>(null);
  const [snappedElementInfo, setSnappedElementInfo] = useState<{ label: string; x: number; y: number; type: string } | null>(null);

  // Heating Loop interactive drag-to-draw state
  const [loopDragStart, setLoopDragStart] = useState<{ x: number; y: number } | null>(null);
  const [loopDragCurrent, setLoopDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Element Stamp / Placement Cursor
  const [placingCursor, setPlacingCursor] = useState<{ x: number; y: number; snappedWall?: string } | null>(null);
  const [multiPlaceMode, setMultiPlaceMode] = useState<boolean>(false);
  const [quickDockOpen, setQuickDockOpen] = useState<boolean>(true);

  // Global keyboard shortcuts for CAD workflows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawingRoute && onCancelDrawingRoute) onCancelDrawingRoute();
        if (drawingHeatingLoop && onCancelDrawingHeatingLoop) onCancelDrawingHeatingLoop();
        if (placingElement && onCancelPlacingElement) onCancelPlacingElement();
      } else if (e.key === "Enter") {
        if (drawingRoute && onFinishDrawingRoute && drawingRoute.points.length >= 2) {
          onFinishDrawingRoute();
        }
      } else if (e.key === "Backspace") {
        if (drawingRoute && onUndoRoutePoint && drawingRoute.points.length > 0) {
          onUndoRoutePoint();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    drawingRoute,
    drawingHeatingLoop,
    placingElement,
    onCancelDrawingRoute,
    onFinishDrawingRoute,
    onUndoRoutePoint,
    onCancelDrawingHeatingLoop,
    onCancelPlacingElement
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      if (onZoomChange) {
        onZoomChange(Math.max(0.5, Math.min(3.5, Math.round((zoomScale + delta) * 100) / 100)));
      }
    }
  };

  // Outer walls segmentation with cutouts for doors & windows
  const topOpenings = getOpeningsOnOuterWall("top", currentOpenings, currentFloor, W, H);
  const bottomOpenings = getOpeningsOnOuterWall("bottom", currentOpenings, currentFloor, W, H);
  const leftOpenings = getOpeningsOnOuterWall("left", currentOpenings, currentFloor, W, H);
  const rightOpenings = getOpeningsOnOuterWall("right", currentOpenings, currentFloor, W, H);

  const topSegments = getWallSegmentsWithOpenings(0, W, topOpenings);
  const bottomSegments = getWallSegmentsWithOpenings(0, W, bottomOpenings);
  const leftSegments = getWallSegmentsWithOpenings(0, H, leftOpenings);
  const rightSegments = getWallSegmentsWithOpenings(0, H, rightOpenings);

  // Helper to convert mouse event to floor meters
  const getEventMeters = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pxX = e.clientX - rect.left - canvasPadding;
    const pxY = e.clientY - rect.top - canvasPadding;
    const rawX = pxX / pixelsPerMeter;
    const rawY = pxY / pixelsPerMeter;
    return {
      x: Math.max(0, Math.min(W, Math.round(rawX * 20) / 20)),
      y: Math.max(0, Math.min(H, Math.round(rawY * 20) / 20))
    };
  };

  // 1. Interactive Mouse Move (Top capture layer)
  const handleInteractiveMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const { x: rawX, y: rawY } = getEventMeters(e);
    let mx = rawX;
    let my = rawY;

    if (drawingRoute) {
      // Orthogonal lock with Shift key
      if (e.shiftKey && drawingRoute.points.length > 0) {
        const lastPt = drawingRoute.points[drawingRoute.points.length - 1];
        const dx = Math.abs(mx - lastPt.x);
        const dy = Math.abs(my - lastPt.y);
        if (dx > dy) {
          my = lastPt.y;
        } else {
          mx = lastPt.x;
        }
      }

      // Magnetic snap to nearest element center (socket, panel, manifold, radiator, pump)
      let foundSnap: { label: string; x: number; y: number; type: string } | null = null;
      for (const el of currentElements) {
        const cx = el.xMeters + el.wMeters / 2;
        const cy = el.yMeters + el.hMeters / 2;
        const dist = Math.hypot(mx - cx, my - cy);
        if (dist < 0.45) {
          mx = Math.round(cx * 20) / 20;
          my = Math.round(cy * 20) / 20;
          foundSnap = { label: el.label, x: mx, y: my, type: el.type };
          break;
        }
      }
      setSnappedElementInfo(foundSnap);
      setHoverMeters({ x: mx, y: my });
    } else if (drawingHeatingLoop) {
      if (loopDragStart) {
        setLoopDragCurrent({ x: mx, y: my });
      } else {
        setHoverMeters({ x: mx, y: my });
      }
    } else if (placingElement) {
      // Magnetic snap to walls for wall-mounted items
      let snappedWall: string | undefined = undefined;
      const isWallItem =
        placingElement.category === "electric" ||
        placingElement.type.includes("socket") ||
        placingElement.type.includes("switch") ||
        placingElement.type.includes("radiator") ||
        placingElement.type.includes("vacuum_inlet") ||
        placingElement.type.includes("diffuser");

      if (isWallItem) {
        if (my < 0.4) {
          my = 0.15;
          snappedWall = "Северная стена";
        } else if (my > H - 0.4) {
          my = H - 0.15;
          snappedWall = "Южная стена";
        } else if (mx < 0.4) {
          mx = 0.15;
          snappedWall = "Западная стена";
        } else if (mx > W - 0.4) {
          mx = W - 0.15;
          snappedWall = "Восточная стена";
        } else {
          // Check interior partitions
          for (const p of currentPartitions) {
            const isVert = p.orientation === "vertical" || Math.abs(p.x1 - p.x2) < 0.05;
            if (isVert && Math.abs(mx - p.x1) < 0.35 && my >= Math.min(p.y1, p.y2) && my <= Math.max(p.y1, p.y2)) {
              mx = p.x1;
              snappedWall = p.label || "Перегородка";
              break;
            } else if (!isVert && Math.abs(my - p.y1) < 0.35 && mx >= Math.min(p.x1, p.x2) && mx <= Math.max(p.x1, p.x2)) {
              my = p.y1;
              snappedWall = p.label || "Перегородка";
              break;
            }
          }
        }
      }

      setPlacingCursor({ x: mx, y: my, snappedWall });
      setHoverMeters({ x: mx, y: my });
    }
  };

  // 2. Interactive Mouse Down
  const handleInteractiveMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    if (drawingHeatingLoop) {
      const { x, y } = getEventMeters(e);
      setLoopDragStart({ x, y });
      setLoopDragCurrent({ x, y });
    }
  };

  // 3. Interactive Mouse Up
  const handleInteractiveMouseUp = (e: React.MouseEvent<SVGRectElement>) => {
    if (drawingHeatingLoop && loopDragStart && loopDragCurrent) {
      const minX = Math.min(loopDragStart.x, loopDragCurrent.x);
      const minY = Math.min(loopDragStart.y, loopDragCurrent.y);
      const w = Math.abs(loopDragCurrent.x - loopDragStart.x);
      const h = Math.abs(loopDragCurrent.y - loopDragStart.y);

      if (w < 0.35 && h < 0.35) {
        // Single click without dragging: place a 2.0 x 2.0m loop centered at click
        const targetW = Math.min(2.0, Math.max(1.0, W - 0.4));
        const targetH = Math.min(2.0, Math.max(1.0, H - 0.4));
        const targetX = Math.max(0.2, Math.min(W - targetW - 0.2, loopDragStart.x - targetW / 2));
        const targetY = Math.max(0.2, Math.min(H - targetH - 0.2, loopDragStart.y - targetH / 2));
        onFinishDrawingHeatingLoop?.(
          Math.round(targetX * 20) / 20,
          Math.round(targetY * 20) / 20,
          Math.round(targetW * 20) / 20,
          Math.round(targetH * 20) / 20
        );
      } else {
        onFinishDrawingHeatingLoop?.(
          Math.round(minX * 20) / 20,
          Math.round(minY * 20) / 20,
          Math.max(0.6, Math.round(w * 20) / 20),
          Math.max(0.6, Math.round(h * 20) / 20)
        );
      }
      setLoopDragStart(null);
      setLoopDragCurrent(null);
    }
  };

  // 4. Interactive Click (Adding points or stamping elements)
  const handleInteractiveClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (drawingRoute && onAddRoutePoint) {
      let { x: mx, y: my } = getEventMeters(e);

      // Orthogonal lock with Shift key
      if (e.shiftKey && drawingRoute.points.length > 0) {
        const lastPt = drawingRoute.points[drawingRoute.points.length - 1];
        const dx = Math.abs(mx - lastPt.x);
        const dy = Math.abs(my - lastPt.y);
        if (dx > dy) {
          my = lastPt.y;
        } else {
          mx = lastPt.x;
        }
      }

      // Magnetic snap
      for (const el of currentElements) {
        const cx = el.xMeters + el.wMeters / 2;
        const cy = el.yMeters + el.hMeters / 2;
        if (Math.hypot(mx - cx, my - cy) < 0.45) {
          mx = Math.round(cx * 20) / 20;
          my = Math.round(cy * 20) / 20;
          break;
        }
      }

      onAddRoutePoint(mx, my);
      return;
    }

    if (placingElement && placingCursor && onPlaceElementAt) {
      onPlaceElementAt(
        placingElement,
        Math.max(0, Math.min(W - (placingElement.defaultW || 0.4), placingCursor.x - (placingElement.defaultW || 0.4) / 2)),
        Math.max(0, Math.min(H - (placingElement.defaultH || 0.4), placingCursor.y - (placingElement.defaultH || 0.4) / 2))
      );
      if (!multiPlaceMode) {
        onCancelPlacingElement?.();
      }
    }
  };

  // 5. Interactive Double Click (Finish route)
  const handleInteractiveDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
    if (drawingRoute && onFinishDrawingRoute && drawingRoute.points.length >= 2) {
      onFinishDrawingRoute();
    }
  };

  // Drag and Drop from Sidebar onto Floor Plan Canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const catItem = JSON.parse(raw) as ElementCatalogItem;
      const rect = e.currentTarget.getBoundingClientRect();
      const pxX = e.clientX - rect.left - canvasPadding;
      const pxY = e.clientY - rect.top - canvasPadding;
      const rawX = pxX / pixelsPerMeter - (catItem.defaultW || 0.4) / 2;
      const rawY = pxY / pixelsPerMeter - (catItem.defaultH || 0.4) / 2;
      const mx = Math.max(0, Math.min(W - (catItem.defaultW || 0.4), Math.round(rawX * 20) / 20));
      const my = Math.max(0, Math.min(H - (catItem.defaultH || 0.4), Math.round(rawY * 20) / 20));

      if (onDropElement) {
        onDropElement(catItem, mx, my);
      } else if (onPlaceElementAt) {
        onPlaceElementAt(catItem, mx, my);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Normal Background Canvas Click (Deselect all)
  const handleSvgClick = () => {
    onSelectRoom(null);
    onSelectPartition(null);
    onSelectOpening(null);
    onSelectElement(null);
    onSelectRoute?.(null);
    onSelectHeatingLoop?.(null);
  };

  return (
    <div
      onWheel={handleWheel}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      className="flex-1 h-full overflow-auto bg-[#070b14] flex items-center justify-center p-4 relative select-none"
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block shadow-2xl rounded-lg overflow-visible"
        onClick={handleSvgClick}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <defs>
          {/* 0.5m sub-grid */}
          <pattern
            id="fpSmallGrid"
            width={0.5 * pixelsPerMeter}
            height={0.5 * pixelsPerMeter}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${0.5 * pixelsPerMeter} 0 L 0 0 0 ${0.5 * pixelsPerMeter}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="0.8"
            />
          </pattern>
          {/* 1m main grid */}
          <pattern
            id="fpMainGrid"
            width={pixelsPerMeter}
            height={pixelsPerMeter}
            patternUnits="userSpaceOnUse"
          >
            <rect width={pixelsPerMeter} height={pixelsPerMeter} fill="url(#fpSmallGrid)" />
            <path
              d={`M ${pixelsPerMeter} 0 L 0 0 0 ${pixelsPerMeter}`}
              fill="none"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth="1.2"
            />
          </pattern>
          {/* Glow filter for cable routes */}
          <filter id="wireGlow2D" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#f59e0b" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Canvas background & grid */}
        <rect width="100%" height="100%" fill="#090e1a" />
        <rect
          x={canvasPadding}
          y={canvasPadding}
          width={W * pixelsPerMeter}
          height={H * pixelsPerMeter}
          fill="url(#fpMainGrid)"
        />

        {/* Rulers */}
        {showRulers && (
          <g className="text-[10px] font-mono fill-sky-400/70 select-none">
            {Array.from({ length: Math.ceil(W) + 1 }).map((_, i) => (
              <g key={`rx_${i}`}>
                <line
                  x1={canvasPadding + i * pixelsPerMeter}
                  y1={canvasPadding - 10}
                  x2={canvasPadding + i * pixelsPerMeter}
                  y2={canvasPadding}
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth="1"
                />
                <text x={canvasPadding + i * pixelsPerMeter} y={canvasPadding - 14} textAnchor="middle">
                  {i}м
                </text>
              </g>
            ))}
            {Array.from({ length: Math.ceil(H) + 1 }).map((_, j) => (
              <g key={`ry_${j}`}>
                <line
                  x1={canvasPadding - 10}
                  y1={canvasPadding + j * pixelsPerMeter}
                  x2={canvasPadding}
                  y2={canvasPadding + j * pixelsPerMeter}
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth="1"
                />
                <text x={canvasPadding - 14} y={canvasPadding + j * pixelsPerMeter + 3} textAnchor="end">
                  {j}м
                </text>
              </g>
            ))}
          </g>
        )}

        {/* 1. ROOMS AREAS (Formed Spaces) */}
        {currentRooms.map((room) => {
          const rx = canvasPadding + room.xMeters * pixelsPerMeter;
          const ry = canvasPadding + room.yMeters * pixelsPerMeter;
          const rw = room.wMeters * pixelsPerMeter;
          const rh = room.hMeters * pixelsPerMeter;
          const isSelected = selectedRoomId === room.id;
          const area = Math.round(room.wMeters * room.hMeters * 10) / 10;
          const roomOpacity = layerVisibility.architecture ? (isSelected ? 0.38 : 0.22) : 0.08;

          return (
            <g
              key={room.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoom(room.id);
                onSelectPartition(null);
                onSelectOpening(null);
                onSelectElement(null);
                onSelectRoute?.(null);
                onSelectHeatingLoop?.(null);
              }}
              onMouseDown={(e) => onMouseDownItem(e, "room", room.id, room.xMeters, room.yMeters)}
              className="cursor-move group"
            >
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={room.color || "#fef3c7"}
                fillOpacity={roomOpacity}
                stroke={isSelected ? "#f59e0b" : "rgba(148, 163, 184, 0.2)"}
                strokeWidth={isSelected ? 3 : 1}
                rx={2}
                className="transition-all"
              />
              {/* Room Name & Area Badge */}
              <g transform={`translate(${rx + rw / 2}, ${ry + rh / 2})`} className="pointer-events-none">
                <text
                  x={0}
                  y={-8}
                  textAnchor="middle"
                  className="font-extrabold text-[12px] fill-white drop-shadow-md select-none tracking-tight opacity-90"
                >
                  {room.name}
                </text>
                <text
                  x={0}
                  y={10}
                  textAnchor="middle"
                  className="font-mono font-bold text-[11px] fill-amber-300 drop-shadow select-none"
                >
                  {area} м² ({room.wMeters}×{room.hMeters}м)
                </text>
                {room.floorFinish && layerVisibility.architecture && (
                  <text x={0} y={24} textAnchor="middle" className="text-[9px] fill-neutral-400 select-none">
                    {room.floorFinish}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* 2. UNDERFLOOR HEATING LOOPS (СЛОЙ ТЁПЛОГО ПОЛА С РЕАЛЬНЫМ ШАГОМ ТРУБ И ИНТЕРАКТИВНЫМ ИЗМЕНЕНИЕМ РАЗМЕРОВ) */}
        {layerVisibility.heating &&
          currentHeatingLoops.map((loop) => {
            const isSelected = selectedHeatingLoopId === loop.id;
            const isEdge = loop.zoneType === "edge_window";
            const loopColor = loop.color || (isEdge ? "#dc2626" : "#ef4444");
            const { pathD, lengthMeters } = generateUnderfloorHeatingSvg(loop, pixelsPerMeter, canvasPadding);

            const wallOffsetPx = (loop.wallOffsetMm / 1000) * pixelsPerMeter;
            const zoneX = canvasPadding + loop.xMeters * pixelsPerMeter + wallOffsetPx;
            const zoneY = canvasPadding + loop.yMeters * pixelsPerMeter + wallOffsetPx;
            const zoneW = loop.wMeters * pixelsPerMeter - 2 * wallOffsetPx;
            const zoneH = loop.hMeters * pixelsPerMeter - 2 * wallOffsetPx;

            const outerZoneX = canvasPadding + loop.xMeters * pixelsPerMeter;
            const outerZoneY = canvasPadding + loop.yMeters * pixelsPerMeter;
            const outerZoneW = loop.wMeters * pixelsPerMeter;
            const outerZoneH = loop.hMeters * pixelsPerMeter;

            const centerPxX = canvasPadding + (loop.xMeters + loop.wMeters / 2) * pixelsPerMeter;
            const centerPxY = canvasPadding + (loop.yMeters + loop.hMeters / 2) * pixelsPerMeter;

            return (
              <g key={loop.id}>
                {/* 1. Base Clickable & Draggable Zone (Moves the Loop) */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHeatingLoop?.(loop.id);
                    onSelectRoom(null);
                    onSelectPartition(null);
                    onSelectOpening(null);
                    onSelectElement(null);
                    onSelectRoute?.(null);
                  }}
                  onMouseDown={(e) => onMouseDownItem(e, "heating_loop", loop.id, loop.xMeters, loop.yMeters)}
                  className="cursor-move group"
                >
                  {/* Active Heating Zone Outer Boundary */}
                  <rect
                    x={zoneX}
                    y={zoneY}
                    width={zoneW}
                    height={zoneH}
                    fill={loopColor}
                    fillOpacity={isSelected ? (isEdge ? 0.24 : 0.18) : isEdge ? 0.12 : 0.07}
                    stroke={isSelected ? "#f59e0b" : loopColor}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeDasharray={isEdge ? "6 3" : "4 3"}
                    className="transition-colors hover:fill-opacity-25"
                  />

                  {/* Real-scale Pipe Coils with actual pitch (шаг труб) and non-intersecting snail/snake */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? "#ffffff" : loopColor}
                      strokeWidth={isSelected ? (isEdge ? 4 : 3.5) : isEdge ? 3.2 : 2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all"
                    />
                  )}

                  {/* Subtle hover outline when not selected */}
                  {!isSelected && (
                    <rect
                      x={outerZoneX}
                      y={outerZoneY}
                      width={outerZoneW}
                      height={outerZoneH}
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.45)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </g>

                {/* 2. Interactive Selection & Edge/Corner Resizing System (When loop is selected) */}
                {isSelected && (
                  <g className="select-none">
                    {/* Outer dashed bounding box */}
                    <rect
                      x={outerZoneX}
                      y={outerZoneY}
                      width={outerZoneW}
                      height={outerZoneH}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    />

                    {/* LIVE DIMENSION LABELS */}
                    {/* Top Width Dimension: e.g. "↔ 3.20 м" */}
                    <g transform={`translate(${outerZoneX + outerZoneW / 2}, ${outerZoneY - 12})`} pointerEvents="none">
                      <rect x={-40} y={-14} width={80} height={18} rx={4} fill="#18181b" stroke="#f59e0b" strokeWidth={1} />
                      <text x={0} y={-2} textAnchor="middle" className="font-mono text-[9px] font-black fill-amber-400">
                        ↔ {loop.wMeters.toFixed(2)} м
                      </text>
                    </g>

                    {/* Right Height Dimension: e.g. "↕ 2.50 м" */}
                    <g transform={`translate(${outerZoneX + outerZoneW + 12}, ${outerZoneY + outerZoneH / 2})`} pointerEvents="none">
                      <rect x={0} y={-9} width={74} height={18} rx={4} fill="#18181b" stroke="#f59e0b" strokeWidth={1} />
                      <text x={37} y={3} textAnchor="middle" className="font-mono text-[9px] font-black fill-amber-400">
                        ↕ {loop.hMeters.toFixed(2)} м
                      </text>
                    </g>

                    {/* --- EDGE HIT RECTANGLES (14px thickness for easy grabbing anywhere along edges) --- */}
                    {/* North (Top) Edge */}
                    <rect
                      x={outerZoneX}
                      y={outerZoneY - 8}
                      width={outerZoneW}
                      height={16}
                      fill="transparent"
                      className="cursor-ns-resize hover:fill-amber-400/30 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "n", loop);
                      }}
                    />

                    {/* South (Bottom) Edge */}
                    <rect
                      x={outerZoneX}
                      y={outerZoneY + outerZoneH - 8}
                      width={outerZoneW}
                      height={16}
                      fill="transparent"
                      className="cursor-ns-resize hover:fill-amber-400/30 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "s", loop);
                      }}
                    />

                    {/* West (Left) Edge */}
                    <rect
                      x={outerZoneX - 8}
                      y={outerZoneY}
                      width={16}
                      height={outerZoneH}
                      fill="transparent"
                      className="cursor-ew-resize hover:fill-amber-400/30 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "w", loop);
                      }}
                    />

                    {/* East (Right) Edge */}
                    <rect
                      x={outerZoneX + outerZoneW - 8}
                      y={outerZoneY}
                      width={16}
                      height={outerZoneH}
                      fill="transparent"
                      className="cursor-ew-resize hover:fill-amber-400/30 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "e", loop);
                      }}
                    />

                    {/* --- MID-EDGE HANDLES (Pills with grip line) --- */}
                    {/* North Mid Handle */}
                    <g
                      transform={`translate(${outerZoneX + outerZoneW / 2}, ${outerZoneY})`}
                      className="cursor-ns-resize hover:scale-110 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "n", loop);
                      }}
                    >
                      <rect x={-15} y={-5} width={30} height={10} rx={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} className="shadow-md" />
                      <line x1={-7} y1={0} x2={7} y2={0} stroke="#18181b" strokeWidth={1.5} />
                    </g>

                    {/* South Mid Handle */}
                    <g
                      transform={`translate(${outerZoneX + outerZoneW / 2}, ${outerZoneY + outerZoneH})`}
                      className="cursor-ns-resize hover:scale-110 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "s", loop);
                      }}
                    >
                      <rect x={-15} y={-5} width={30} height={10} rx={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} className="shadow-md" />
                      <line x1={-7} y1={0} x2={7} y2={0} stroke="#18181b" strokeWidth={1.5} />
                    </g>

                    {/* West Mid Handle */}
                    <g
                      transform={`translate(${outerZoneX}, ${outerZoneY + outerZoneH / 2})`}
                      className="cursor-ew-resize hover:scale-110 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "w", loop);
                      }}
                    >
                      <rect x={-5} y={-15} width={10} height={30} rx={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} className="shadow-md" />
                      <line x1={0} y1={-7} x2={0} y2={7} stroke="#18181b" strokeWidth={1.5} />
                    </g>

                    {/* East Mid Handle */}
                    <g
                      transform={`translate(${outerZoneX + outerZoneW}, ${outerZoneY + outerZoneH / 2})`}
                      className="cursor-ew-resize hover:scale-110 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "e", loop);
                      }}
                    >
                      <rect x={-5} y={-15} width={10} height={30} rx={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} className="shadow-md" />
                      <line x1={0} y1={-7} x2={0} y2={7} stroke="#18181b" strokeWidth={1.5} />
                    </g>

                    {/* --- 4 CORNER HANDLES --- */}
                    {/* NW (Top-Left) */}
                    <g
                      transform={`translate(${outerZoneX}, ${outerZoneY})`}
                      className="cursor-nwse-resize hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "nw", loop);
                      }}
                    >
                      <circle cx={0} cy={0} r={14} fill="transparent" />
                      <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} className="shadow-lg" />
                    </g>

                    {/* NE (Top-Right) */}
                    <g
                      transform={`translate(${outerZoneX + outerZoneW}, ${outerZoneY})`}
                      className="cursor-nesw-resize hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "ne", loop);
                      }}
                    >
                      <circle cx={0} cy={0} r={14} fill="transparent" />
                      <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} className="shadow-lg" />
                    </g>

                    {/* SE (Bottom-Right) */}
                    <g
                      transform={`translate(${outerZoneX + outerZoneW}, ${outerZoneY + outerZoneH})`}
                      className="cursor-nwse-resize hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "se", loop);
                      }}
                    >
                      <circle cx={0} cy={0} r={14} fill="transparent" />
                      <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} className="shadow-lg" />
                    </g>

                    {/* SW (Bottom-Left) */}
                    <g
                      transform={`translate(${outerZoneX}, ${outerZoneY + outerZoneH})`}
                      className="cursor-nesw-resize hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDownResizeHeatingLoop?.(e, loop.id, "sw", loop);
                      }}
                    >
                      <circle cx={0} cy={0} r={14} fill="transparent" />
                      <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} className="shadow-lg" />
                    </g>
                  </g>
                )}

                {/* Pipe Loop Specification Badge on floor */}
                <g transform={`translate(${centerPxX}, ${centerPxY})`} className="pointer-events-none">
                  <rect
                    x={isEdge ? -68 : -58}
                    y={-14}
                    width={isEdge ? 136 : 116}
                    height={28}
                    rx={5}
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={isSelected ? "#f59e0b" : loopColor}
                    strokeWidth={1.5}
                    className="shadow-lg"
                  />
                  <text
                    x={0}
                    y={-2}
                    textAnchor="middle"
                    className="font-mono text-[9px] font-black fill-white"
                  >
                    {isEdge ? "🔥 [РАНТОВАЯ 50°C] " : "🔥 "}{loop.name}
                  </text>
                  <text
                    x={0}
                    y={10}
                    textAnchor="middle"
                    className="font-mono text-[8px] font-bold fill-rose-300"
                  >
                    Шаг {loop.stepMm}мм · {loop.pattern === "snail" ? "Улитка" : "Змейка"} · L={loop.pipeLengthMeters || lengthMeters}м
                  </text>
                </g>
              </g>
            );
          })}

        {/* 3. ENGINEERING ROUTES (ТРАССЫ ЭЛЕКТРОПРОВОДКИ И ТРУБОПРОВОДОВ) */}
        {currentRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const isElectric = route.system === "electric";
          const isCold = route.system === "plumbing_cold";
          const isHot = route.system === "plumbing_hot";
          const isSewer = route.system === "sewer";
          const isHeating = route.system === "heating";

          // Visibility filter
          if (isElectric && !layerVisibility.electric) return null;
          if ((isCold || isHot || isSewer) && !layerVisibility.plumbing) return null;
          if (isHeating && !layerVisibility.heating) return null;

          if (route.points.length < 2) return null;

          let pathD = "";
          route.points.forEach((pt, idx) => {
            const px = canvasPadding + pt.x * pixelsPerMeter;
            const py = canvasPadding + pt.y * pixelsPerMeter;
            if (idx === 0) pathD += `M ${px} ${py}`;
            else pathD += ` L ${px} ${py}`;
          });

          const strokeColor =
            route.color ||
            (isElectric
              ? "#f59e0b"
              : isCold
              ? "#0284c7"
              : isHot
              ? "#ef4444"
              : isSewer
              ? "#475569"
              : "#ea580c");

          const strokeW = isSewer ? 5 : isElectric ? 2.5 : 3;
          const totalLen = calculateRouteLength(route.points);

          // Center coordinate for badge
          const midIdx = Math.floor(route.points.length / 2);
          const midPt = route.points[midIdx] || route.points[0];
          const midPxX = canvasPadding + midPt.x * pixelsPerMeter;
          const midPxY = canvasPadding + midPt.y * pixelsPerMeter;

          return (
            <g
              key={route.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoute?.(route.id);
                onSelectRoom(null);
                onSelectPartition(null);
                onSelectOpening(null);
                onSelectElement(null);
                onSelectHeatingLoop?.(null);
              }}
              className="cursor-pointer"
            >
              {/* Route line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? strokeW + 2 : strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isElectric ? "url(#wireGlow2D)" : undefined}
              />

              {/* Waypoint nodes / junction points */}
              {route.points.map((pt, pIdx) => {
                const px = canvasPadding + pt.x * pixelsPerMeter;
                const py = canvasPadding + pt.y * pixelsPerMeter;
                return (
                  <circle
                    key={`rpt_${pIdx}`}
                    cx={px}
                    cy={py}
                    r={isSelected ? 4 : 3}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Cable/Pipe Specification Badge */}
              <g transform={`translate(${midPxX}, ${midPxY - 8})`} className="pointer-events-none">
                <rect
                  x={-45}
                  y={-8}
                  width={90}
                  height={16}
                  rx={3}
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={isSelected ? "#f59e0b" : strokeColor}
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  className="font-mono text-[8px] font-bold fill-white"
                >
                  {route.cableCores || (route.diameterMm ? `Ø${route.diameterMm}` : "")} · {totalLen}м
                </text>
              </g>
            </g>
          );
        })}

        {/* 4. OUTER LOAD-BEARING ENVELOPE WALLS (Segmented with actual openings) */}
        <g className="pointer-events-none">
          {/* Top Wall segments */}
          {topSegments.map((seg, idx) => (
            <line
              key={`top_seg_${idx}`}
              x1={canvasPadding + seg.s * pixelsPerMeter}
              y1={canvasPadding}
              x2={canvasPadding + seg.e * pixelsPerMeter}
              y2={canvasPadding}
              stroke="#38bdf8"
              strokeWidth={wallThickPx}
              strokeLinecap="square"
              opacity={layerVisibility.architecture ? 1 : 0.25}
            />
          ))}
          {/* Bottom Wall segments */}
          {bottomSegments.map((seg, idx) => (
            <line
              key={`bottom_seg_${idx}`}
              x1={canvasPadding + seg.s * pixelsPerMeter}
              y1={canvasPadding + H * pixelsPerMeter}
              x2={canvasPadding + seg.e * pixelsPerMeter}
              y2={canvasPadding + H * pixelsPerMeter}
              stroke="#38bdf8"
              strokeWidth={wallThickPx}
              strokeLinecap="square"
              opacity={layerVisibility.architecture ? 1 : 0.25}
            />
          ))}
          {/* Left Wall segments */}
          {leftSegments.map((seg, idx) => (
            <line
              key={`left_seg_${idx}`}
              x1={canvasPadding}
              y1={canvasPadding + seg.s * pixelsPerMeter}
              x2={canvasPadding}
              y2={canvasPadding + seg.e * pixelsPerMeter}
              stroke="#38bdf8"
              strokeWidth={wallThickPx}
              strokeLinecap="square"
              opacity={layerVisibility.architecture ? 1 : 0.25}
            />
          ))}
          {/* Right Wall segments */}
          {rightSegments.map((seg, idx) => (
            <line
              key={`right_seg_${idx}`}
              x1={canvasPadding + W * pixelsPerMeter}
              y1={canvasPadding + seg.s * pixelsPerMeter}
              x2={canvasPadding + W * pixelsPerMeter}
              y2={canvasPadding + seg.e * pixelsPerMeter}
              stroke="#38bdf8"
              strokeWidth={wallThickPx}
              strokeLinecap="square"
              opacity={layerVisibility.architecture ? 1 : 0.25}
            />
          ))}

          {/* Wall Cutout Jamb Caps */}
          {topOpenings.map((op, idx) => (
            <g key={`top_jamb_${idx}`}>
              <line
                x1={canvasPadding + op.start * pixelsPerMeter}
                y1={canvasPadding - wallThickPx / 2}
                x2={canvasPadding + op.start * pixelsPerMeter}
                y2={canvasPadding + wallThickPx / 2}
                stroke="#0284c7"
                strokeWidth={2}
              />
              <line
                x1={canvasPadding + op.end * pixelsPerMeter}
                y1={canvasPadding - wallThickPx / 2}
                x2={canvasPadding + op.end * pixelsPerMeter}
                y2={canvasPadding + wallThickPx / 2}
                stroke="#0284c7"
                strokeWidth={2}
              />
            </g>
          ))}
          {bottomOpenings.map((op, idx) => (
            <g key={`bot_jamb_${idx}`}>
              <line
                x1={canvasPadding + op.start * pixelsPerMeter}
                y1={canvasPadding + H * pixelsPerMeter - wallThickPx / 2}
                x2={canvasPadding + op.start * pixelsPerMeter}
                y2={canvasPadding + H * pixelsPerMeter + wallThickPx / 2}
                stroke="#0284c7"
                strokeWidth={2}
              />
              <line
                x1={canvasPadding + op.end * pixelsPerMeter}
                y1={canvasPadding + H * pixelsPerMeter - wallThickPx / 2}
                x2={canvasPadding + op.end * pixelsPerMeter}
                y2={canvasPadding + H * pixelsPerMeter + wallThickPx / 2}
                stroke="#0284c7"
                strokeWidth={2}
              />
            </g>
          ))}
          {leftOpenings.map((op, idx) => (
            <g key={`left_jamb_${idx}`}>
              <line
                x1={canvasPadding - wallThickPx / 2}
                y1={canvasPadding + op.start * pixelsPerMeter}
                x2={canvasPadding + wallThickPx / 2}
                y2={canvasPadding + op.start * pixelsPerMeter}
                stroke="#0284c7"
                strokeWidth={2}
              />
              <line
                x1={canvasPadding - wallThickPx / 2}
                y1={canvasPadding + op.end * pixelsPerMeter}
                x2={canvasPadding + wallThickPx / 2}
                y2={canvasPadding + op.end * pixelsPerMeter}
                stroke="#0284c7"
                strokeWidth={2}
              />
            </g>
          ))}
          {rightOpenings.map((op, idx) => (
            <g key={`right_jamb_${idx}`}>
              <line
                x1={canvasPadding + W * pixelsPerMeter - wallThickPx / 2}
                y1={canvasPadding + op.start * pixelsPerMeter}
                x2={canvasPadding + W * pixelsPerMeter + wallThickPx / 2}
                y2={canvasPadding + op.start * pixelsPerMeter}
                stroke="#0284c7"
                strokeWidth={2}
              />
              <line
                x1={canvasPadding + W * pixelsPerMeter - wallThickPx / 2}
                y1={canvasPadding + op.end * pixelsPerMeter}
                x2={canvasPadding + W * pixelsPerMeter + wallThickPx / 2}
                y2={canvasPadding + op.end * pixelsPerMeter}
                stroke="#0284c7"
                strokeWidth={2}
              />
            </g>
          ))}

          {/* Dimension markings on outer perimeter */}
          {layerVisibility.architecture && (
            <>
              <text
                x={canvasPadding + (W * pixelsPerMeter) / 2}
                y={canvasPadding + H * pixelsPerMeter + 28}
                textAnchor="middle"
                className="fill-sky-400 font-mono text-xs font-bold"
              >
                ↔ {W} м (Общая длина)
              </text>
              <text
                x={canvasPadding + W * pixelsPerMeter + 28}
                y={canvasPadding + (H * pixelsPerMeter) / 2}
                textAnchor="middle"
                transform={`rotate(90 ${canvasPadding + W * pixelsPerMeter + 28} ${
                  canvasPadding + (H * pixelsPerMeter) / 2
                })`}
                className="fill-sky-400 font-mono text-xs font-bold"
              >
                ↕ {H} м (Общая ширина)
              </text>
            </>
          )}
        </g>

        {/* 5. PARTITIONS (Interior Walls with real cutouts for openings) */}
        {currentPartitions.map((part) => {
          const isVert = part.orientation === "vertical" || Math.abs(part.x1 - part.x2) < 0.05;
          const px1 = canvasPadding + part.x1 * pixelsPerMeter;
          const py1 = canvasPadding + part.y1 * pixelsPerMeter;
          const px2 = canvasPadding + part.x2 * pixelsPerMeter;
          const py2 = canvasPadding + part.y2 * pixelsPerMeter;
          const isSelected = selectedPartitionId === part.id;
          const thick = Math.max(4, (part.thicknessMeters || 0.12) * pixelsPerMeter);

          const lenMeters = Math.round(
            Math.sqrt(Math.pow(part.x2 - part.x1, 2) + Math.pow(part.y2 - part.y1, 2)) * 10
          ) / 10;

          // Openings on this partition
          const openingsOnPart = getOpeningsOnPartition(part, currentOpenings);
          const wallStart = isVert ? Math.min(part.y1, part.y2) : Math.min(part.x1, part.x2);
          const wallEnd = isVert ? Math.max(part.y1, part.y2) : Math.max(part.x1, part.x2);
          const segments = getWallSegmentsWithOpenings(wallStart, wallEnd, openingsOnPart);
          const wallAlpha = layerVisibility.architecture ? 1 : 0.25;

          return (
            <g
              key={part.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPartition(part.id);
                onSelectRoom(null);
                onSelectOpening(null);
                onSelectElement(null);
                onSelectRoute?.(null);
                onSelectHeatingLoop?.(null);
              }}
              onMouseDown={(e) => onMouseDownItem(e, "partition", part.id, part.x1, part.y1)}
              className="cursor-move"
            >
              {/* Solid segments of the partition */}
              {segments.map((seg, idx) => {
                const sx1 = isVert ? px1 : canvasPadding + seg.s * pixelsPerMeter;
                const sy1 = isVert ? canvasPadding + seg.s * pixelsPerMeter : py1;
                const sx2 = isVert ? px1 : canvasPadding + seg.e * pixelsPerMeter;
                const sy2 = isVert ? canvasPadding + seg.e * pixelsPerMeter : py1;

                return (
                  <g key={`pseg_${idx}`}>
                    <line
                      x1={sx1}
                      y1={sy1}
                      x2={sx2}
                      y2={sy2}
                      stroke={isSelected ? "#f59e0b" : part.wallType === "bearing" ? "#cbd5e1" : "#94a3b8"}
                      strokeWidth={thick}
                      strokeLinecap="square"
                      opacity={wallAlpha}
                    />
                    {/* Center divider dashed line */}
                    <line
                      x1={sx1}
                      y1={sy1}
                      x2={sx2}
                      y2={sy2}
                      stroke={isSelected ? "#78350f" : "#475569"}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      opacity={wallAlpha}
                    />
                  </g>
                );
              })}

              {/* Wall Jamb Caps (Торцы стены у проёмов) */}
              {openingsOnPart.map((op, idx) => {
                if (isVert) {
                  const yStartPx = canvasPadding + op.start * pixelsPerMeter;
                  const yEndPx = canvasPadding + op.end * pixelsPerMeter;
                  return (
                    <g key={`pjamb_${idx}`} opacity={wallAlpha}>
                      <line
                        x1={px1 - thick / 2}
                        y1={yStartPx}
                        x2={px1 + thick / 2}
                        y2={yStartPx}
                        stroke="#64748b"
                        strokeWidth={2}
                      />
                      <line
                        x1={px1 - thick / 2}
                        y1={yEndPx}
                        x2={px1 + thick / 2}
                        y2={yEndPx}
                        stroke="#64748b"
                        strokeWidth={2}
                      />
                    </g>
                  );
                } else {
                  const xStartPx = canvasPadding + op.start * pixelsPerMeter;
                  const xEndPx = canvasPadding + op.end * pixelsPerMeter;
                  return (
                    <g key={`pjamb_${idx}`} opacity={wallAlpha}>
                      <line
                        x1={xStartPx}
                        y1={py1 - thick / 2}
                        x2={xStartPx}
                        y2={py1 + thick / 2}
                        stroke="#64748b"
                        strokeWidth={2}
                      />
                      <line
                        x1={xEndPx}
                        y1={py1 - thick / 2}
                        x2={xEndPx}
                        y2={py1 + thick / 2}
                        stroke="#64748b"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }
              })}

              {/* Length indicator label on wall */}
              {layerVisibility.architecture && (
                <g
                  transform={`translate(${(px1 + px2) / 2}, ${(py1 + py2) / 2})`}
                  className="pointer-events-none select-none"
                >
                  <rect
                    x={-24}
                    y={-10}
                    width={48}
                    height={16}
                    rx={4}
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke={isSelected ? "#f59e0b" : "#475569"}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={2}
                    textAnchor="middle"
                    className="font-mono text-[9px] font-bold fill-white"
                  >
                    {lenMeters}м
                  </text>
                </g>
              )}

              {/* Selection grips at start and end */}
              {isSelected && (
                <>
                  <circle cx={px1} cy={py1} r={6} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                  <circle cx={px2} cy={py2} r={6} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                </>
              )}
            </g>
          );
        })}

        {/* Visual highlight if snapped during drag */}
        {snappedWallInfo && (
          <g className="pointer-events-none">
            {snappedWallInfo.orientation === "horizontal" && typeof snappedWallInfo.y === "number" && (
              <line
                x1={canvasPadding}
                y1={canvasPadding + snappedWallInfo.y * pixelsPerMeter}
                x2={canvasPadding + W * pixelsPerMeter}
                y2={canvasPadding + snappedWallInfo.y * pixelsPerMeter}
                stroke="#10b981"
                strokeWidth={4}
                strokeDasharray="6 4"
                opacity={0.8}
              />
            )}
            {snappedWallInfo.orientation === "vertical" && typeof snappedWallInfo.x === "number" && (
              <line
                x1={canvasPadding + snappedWallInfo.x * pixelsPerMeter}
                y1={canvasPadding}
                x2={canvasPadding + snappedWallInfo.x * pixelsPerMeter}
                y2={canvasPadding + H * pixelsPerMeter}
                stroke="#10b981"
                strokeWidth={4}
                strokeDasharray="6 4"
                opacity={0.8}
              />
            )}
          </g>
        )}

        {/* 6. OPENINGS (Doors with swing arc & Windows with double lines inside the carved wall opening) */}
        {layerVisibility.architecture &&
          currentOpenings.map((op) => {
            const isVert = op.orientation === "vertical" || op.rotation === 90 || op.rotation === 270;
            const ox = canvasPadding + op.xMeters * pixelsPerMeter;
            const oy = canvasPadding + op.yMeters * pixelsPerMeter;
            const ow = op.widthMeters * pixelsPerMeter;
            const isSelected = selectedOpeningId === op.id;
            const isDoor = op.type.includes("door");
            const isLeft = op.swingDirection?.startsWith("left");
            const isOut = op.swingDirection?.endsWith("out");

            const wallThickM = op.wallThickness || 0.15;
            const opThickPx = Math.max(6, wallThickM * pixelsPerMeter);

            return (
              <g
                key={op.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOpening(op.id);
                  onSelectRoom(null);
                  onSelectPartition(null);
                  onSelectElement(null);
                  onSelectRoute?.(null);
                  onSelectHeatingLoop?.(null);
                }}
                onMouseDown={(e) => onMouseDownItem(e, "opening", op.id, op.xMeters, op.yMeters)}
                className="cursor-move group"
              >
                {!isVert ? (
                  // HORIZONTAL OPENING
                  <g transform={`translate(${ox}, ${oy})`}>
                    <rect
                      x={0}
                      y={-opThickPx / 2 - 1}
                      width={ow}
                      height={opThickPx + 2}
                      fill="#090e1a"
                      stroke={isSelected ? "#f59e0b" : "transparent"}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />

                    {isDoor ? (
                      <g>
                        <rect
                          x={0}
                          y={-opThickPx / 2}
                          width={4}
                          height={opThickPx}
                          fill={isSelected ? "#f59e0b" : "#e2e8f0"}
                        />
                        <rect
                          x={ow - 4}
                          y={-opThickPx / 2}
                          width={4}
                          height={opThickPx}
                          fill={isSelected ? "#f59e0b" : "#e2e8f0"}
                        />

                        <line
                          x1={0}
                          y1={0}
                          x2={ow}
                          y2={0}
                          stroke="#64748b"
                          strokeWidth={1}
                          strokeDasharray="2 2"
                        />

                        {(() => {
                          const hingeX = isLeft ? ow : 0;
                          const leafEndY = isOut ? ow : -ow;
                          return (
                            <g>
                              <line
                                x1={hingeX}
                                y1={0}
                                x2={hingeX}
                                y2={leafEndY}
                                stroke={isSelected ? "#f59e0b" : "#cbd5e1"}
                                strokeWidth={3}
                              />
                              <path
                                d={
                                  !isLeft
                                    ? `M ${ow} 0 A ${ow} ${ow} 0 0 ${isOut ? 1 : 0} 0 ${leafEndY}`
                                    : `M 0 0 A ${ow} ${ow} 0 0 ${isOut ? 0 : 1} ${ow} ${leafEndY}`
                                }
                                fill="none"
                                stroke={isSelected ? "#f59e0b" : "rgba(226, 232, 240, 0.45)"}
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                              />
                            </g>
                          );
                        })()}

                        <g transform={`translate(${ow / 2}, ${isOut ? -14 : 18})`}>
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={16}
                            rx={3}
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={isSelected ? "#f59e0b" : "rgba(100, 116, 139, 0.5)"}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-amber-300 select-none"
                          >
                            {op.widthMeters}м
                          </text>
                        </g>
                      </g>
                    ) : (
                      <g>
                        <rect x={0} y={-opThickPx / 2} width={5} height={opThickPx} fill="#38bdf8" />
                        <rect x={ow - 5} y={-opThickPx / 2} width={5} height={opThickPx} fill="#38bdf8" />

                        <rect
                          x={0}
                          y={-opThickPx / 2 + 1}
                          width={ow}
                          height={opThickPx - 2}
                          fill="#0284c7"
                          fillOpacity={0.25}
                        />
                        <line x1={0} y1={-2.5} x2={ow} y2={-2.5} stroke="#38bdf8" strokeWidth={1.8} />
                        <line x1={0} y1={2.5} x2={ow} y2={2.5} stroke="#38bdf8" strokeWidth={1.8} />

                        <line x1={-3} y1={-opThickPx / 2} x2={ow + 3} y2={-opThickPx / 2} stroke="#7dd3fc" strokeWidth={1.5} />
                        <line x1={-3} y1={opThickPx / 2} x2={ow + 3} y2={opThickPx / 2} stroke="#7dd3fc" strokeWidth={1.5} />

                        <g transform={`translate(${ow / 2}, ${opThickPx / 2 + 14})`}>
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={16}
                            rx={3}
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={isSelected ? "#f59e0b" : "rgba(56, 189, 248, 0.5)"}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-sky-300 select-none"
                          >
                            {op.widthMeters}м
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                ) : (
                  // VERTICAL OPENING
                  <g transform={`translate(${ox}, ${oy})`}>
                    <rect
                      x={-opThickPx / 2 - 1}
                      y={0}
                      width={opThickPx + 2}
                      height={ow}
                      fill="#090e1a"
                      stroke={isSelected ? "#f59e0b" : "transparent"}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />

                    {isDoor ? (
                      <g>
                        <rect x={-opThickPx / 2} y={0} width={opThickPx} height={4} fill={isSelected ? "#f59e0b" : "#e2e8f0"} />
                        <rect x={-opThickPx / 2} y={ow - 4} width={opThickPx} height={4} fill={isSelected ? "#f59e0b" : "#e2e8f0"} />

                        <line x1={0} y1={0} x2={0} y2={ow} stroke="#64748b" strokeWidth={1} strokeDasharray="2 2" />

                        {(() => {
                          const hingeY = isLeft ? ow : 0;
                          const leafEndX = isOut ? ow : -ow;
                          return (
                            <g>
                              <line
                                x1={0}
                                y1={hingeY}
                                x2={leafEndX}
                                y2={hingeY}
                                stroke={isSelected ? "#f59e0b" : "#cbd5e1"}
                                strokeWidth={3}
                              />
                              <path
                                d={
                                  !isLeft
                                    ? `M 0 ${ow} A ${ow} ${ow} 0 0 ${isOut ? 0 : 1} ${leafEndX} 0`
                                    : `M 0 0 A ${ow} ${ow} 0 0 ${isOut ? 1 : 0} ${leafEndX} ${ow}`
                                }
                                fill="none"
                                stroke={isSelected ? "#f59e0b" : "rgba(226, 232, 240, 0.45)"}
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                              />
                            </g>
                          );
                        })()}

                        <g transform={`translate(${isOut ? -18 : 18}, ${ow / 2})`}>
                          <rect
                            x={-24}
                            y={-9}
                            width={48}
                            height={16}
                            rx={3}
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={isSelected ? "#f59e0b" : "rgba(100, 116, 139, 0.5)"}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-amber-300 select-none"
                          >
                            {op.widthMeters}м
                          </text>
                        </g>
                      </g>
                    ) : (
                      <g>
                        <rect x={-opThickPx / 2} y={0} width={opThickPx} height={5} fill="#38bdf8" />
                        <rect x={-opThickPx / 2} y={ow - 5} width={opThickPx} height={5} fill="#38bdf8" />

                        <rect
                          x={-opThickPx / 2 + 1}
                          y={0}
                          width={opThickPx - 2}
                          height={ow}
                          fill="#0284c7"
                          fillOpacity={0.25}
                        />
                        <line x1={-2.5} y1={0} x2={-2.5} y2={ow} stroke="#38bdf8" strokeWidth={1.8} />
                        <line x1={2.5} y1={0} x2={2.5} y2={ow} stroke="#38bdf8" strokeWidth={1.8} />

                        <line x1={-opThickPx / 2} y1={-3} x2={-opThickPx / 2} y2={ow + 3} stroke="#7dd3fc" strokeWidth={1.5} />
                        <line x1={opThickPx / 2} y1={-3} x2={opThickPx / 2} y2={ow + 3} stroke="#7dd3fc" strokeWidth={1.5} />

                        <g transform={`translate(${opThickPx / 2 + 18}, ${ow / 2})`}>
                          <rect
                            x={-24}
                            y={-9}
                            width={48}
                            height={16}
                            rx={3}
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={isSelected ? "#f59e0b" : "rgba(56, 189, 248, 0.5)"}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-sky-300 select-none"
                          >
                            {op.widthMeters}м
                          </text>
                        </g>
                      </g>
                    )}
                  </g>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <circle
                    cx={ox + (isVert ? 0 : ow / 2)}
                    cy={oy + (isVert ? ow / 2 : 0)}
                    r={8}
                    fill="#f59e0b"
                    fillOpacity={0.4}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

        {/* 7. FURNITURE & MEP EQUIPMENT (FILTERED BY ACTIVE LAYER) */}
        {currentElements.map((el) => {
          const catItem = ELEMENT_CATALOG.find((c) => c.type === el.type);
          const isElectric = catItem?.category === "electric";
          const isPlumbing = catItem?.category === "plumbing";
          const isHeating = catItem?.category === "heating";
          const isHvac = catItem?.category === "hvac";
          const isFurniture = catItem?.category === "furniture";

          // Layer visibility filters
          if (isElectric && !layerVisibility.electric) return null;
          if (isPlumbing && !layerVisibility.plumbing) return null;
          if (isHeating && !layerVisibility.heating) return null;
          if (isHvac && !layerVisibility.ventilation) return null;
          if (isFurniture && !layerVisibility.furniture) return null;

          const ex = canvasPadding + el.xMeters * pixelsPerMeter;
          const ey = canvasPadding + el.yMeters * pixelsPerMeter;
          const ew = el.wMeters * pixelsPerMeter;
          const eh = el.hMeters * pixelsPerMeter;
          const isSelected = selectedElementId === el.id;

          return (
            <g
              key={el.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(el.id);
                onSelectRoom(null);
                onSelectPartition(null);
                onSelectOpening(null);
                onSelectRoute?.(null);
                onSelectHeatingLoop?.(null);
              }}
              onMouseDown={(e) => onMouseDownItem(e, "element", el.id, el.xMeters, el.yMeters)}
              transform={`rotate(${el.rotation || 0} ${ex + ew / 2} ${ey + eh / 2})`}
              className="cursor-move"
            >
              {el.type === "junction_box" ? (
                <g>
                  {/* Distinctive Junction Box square terminal housing */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={3}
                    fill="#18181b"
                    stroke={isSelected ? "#f59e0b" : "#e11d48"}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {/* Circular inner commutation chamber */}
                  <circle
                    cx={ex + ew / 2}
                    cy={ey + eh / 2}
                    r={Math.min(ew, eh) / 3.2}
                    fill="#e11d48"
                    fillOpacity={0.25}
                    stroke="#e11d48"
                    strokeWidth={1.2}
                  />
                  {/* Wiring cross terminal lines */}
                  <line
                    x1={ex + ew / 2 - 4}
                    y1={ey + eh / 2}
                    x2={ex + ew / 2 + 4}
                    y2={ey + eh / 2}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={ex + ew / 2}
                    y1={ey + eh / 2 - 4}
                    x2={ex + ew / 2}
                    y2={ey + eh / 2 + 4}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  {/* Text badge */}
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[7px] fill-white select-none pointer-events-none"
                  >
                    РК
                  </text>
                </g>
              ) : el.type === "convector_floor" ? (
                <g>
                  {/* In-floor trench body */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={2}
                    fill="#1e1e24"
                    stroke={isSelected ? "#f59e0b" : "#d97706"}
                    strokeWidth={isSelected ? 3 : 1.8}
                  />
                  {/* Copper-Aluminum heat exchanger pipe core inside */}
                  <rect
                    x={ex + 4}
                    y={ey + eh / 2 - Math.min(eh * 0.25, 5)}
                    width={Math.max(4, ew - 8)}
                    height={Math.min(eh * 0.5, 10)}
                    rx={2}
                    fill="#ea580c"
                    fillOpacity={0.65}
                  />
                  {/* Slotted decorative floor grille lines */}
                  {Array.from({ length: Math.max(3, Math.floor(ew / 6)) }).map((_, gi) => (
                    <line
                      key={gi}
                      x1={ex + 3 + gi * 6}
                      y1={ey + 2}
                      x2={ex + 3 + gi * 6}
                      y2={ey + eh - 2}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                      strokeOpacity={0.75}
                    />
                  ))}
                  {/* In-floor convector label badge */}
                  <rect
                    x={ex + ew / 2 - 20}
                    y={ey + eh / 2 - 7}
                    width={40}
                    height={14}
                    rx={3}
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="#d97706"
                    strokeWidth={1}
                  />
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[8px] fill-amber-300 select-none pointer-events-none"
                  >
                    ВК-ПОЛ
                  </text>
                </g>
              ) : el.type === "radiator" || el.type === "radiator_low" ? (
                <g>
                  {/* Radiator casing */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={3}
                    fill="#27272a"
                    stroke={isSelected ? "#f59e0b" : "#ea580c"}
                    strokeWidth={isSelected ? 3 : 1.8}
                  />
                  {/* Vertical radiator heating sections/fins */}
                  {Array.from({ length: Math.max(2, Math.floor(ew / 7)) }).map((_, ri) => (
                    <line
                      key={ri}
                      x1={ex + 4 + ri * 7}
                      y1={ey + 2}
                      x2={ex + 4 + ri * 7}
                      y2={ey + eh - 2}
                      stroke="#f97316"
                      strokeWidth={1.4}
                      strokeOpacity={0.8}
                    />
                  ))}
                  {/* Thermostatic valve on side */}
                  <circle
                    cx={ex + 3}
                    cy={ey + eh / 2}
                    r={3}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[7px] fill-white select-none pointer-events-none bg-black/60"
                  >
                    {el.type === "radiator_low" ? "НИЗК.РАД" : "РАДИАТОР"}
                  </text>
                </g>
              ) : el.type === "fan_heater" ? (
                <g>
                  {/* Fan heater casing */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={4}
                    fill="#1c1917"
                    stroke={isSelected ? "#f59e0b" : "#dc2626"}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {/* Circular fan impeller chamber */}
                  <circle
                    cx={ex + ew / 2}
                    cy={ey + eh / 2}
                    r={Math.min(ew, eh) / 2.8}
                    fill="#dc2626"
                    fillOpacity={0.2}
                    stroke="#dc2626"
                    strokeWidth={1.2}
                  />
                  {/* Airflow direction arrows */}
                  <line
                    x1={ex + ew / 2 - 8}
                    y1={ey + eh / 2}
                    x2={ex + ew / 2 + 8}
                    y2={ey + eh / 2}
                    stroke="#ffffff"
                    strokeWidth={1.8}
                  />
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[7px] fill-red-300 select-none pointer-events-none"
                  >
                    ЗАВЕСА
                  </text>
                </g>
              ) : el.type === "towel_dryer" ? (
                <g>
                  {/* Towel dryer ladder frame */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={2}
                    fill="#0f172a"
                    stroke={isSelected ? "#f59e0b" : "#f43f5e"}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  {/* Ladder horizontal rungs */}
                  {Array.from({ length: 4 }).map((_, ti) => (
                    <line
                      key={ti}
                      x1={ex + 2}
                      y1={ey + 3 + (ti * (eh - 6)) / 3}
                      x2={ex + ew - 2}
                      y2={ey + 3 + (ti * (eh - 6)) / 3}
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                    />
                  ))}
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[6px] fill-rose-300 select-none pointer-events-none"
                  >
                    П/СУШ
                  </text>
                </g>
              ) : el.type === "electric_panel" ? (
                <g>
                  {/* Distribution Board / Electric Panel enclosure */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={3}
                    fill="#171717"
                    stroke={isSelected ? "#f59e0b" : "#dc2626"}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {/* DIN rails inside */}
                  <line x1={ex + 3} y1={ey + eh * 0.35} x2={ex + ew - 3} y2={ey + eh * 0.35} stroke="#52525b" strokeWidth={1.5} />
                  <line x1={ex + 3} y1={ey + eh * 0.65} x2={ex + ew - 3} y2={ey + eh * 0.65} stroke="#52525b" strokeWidth={1.5} />
                  {/* Miniature modular breaker blocks */}
                  {Array.from({ length: Math.max(3, Math.floor(ew / 8)) }).map((_, mi) => (
                    <rect
                      key={mi}
                      x={ex + 4 + mi * 8}
                      y={ey + eh * 0.22}
                      width={6}
                      height={eh * 0.56}
                      rx={1}
                      fill="#27272a"
                      stroke="#ef4444"
                      strokeWidth={0.8}
                    />
                  ))}
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 3}
                    textAnchor="middle"
                    className="font-mono font-black text-[7px] fill-amber-300 select-none pointer-events-none bg-black/60"
                  >
                    ЩИТ ВРУ
                  </text>
                </g>
              ) : el.type === "floor_heating_manifold" ? (
                <g>
                  {/* Heating Manifold Cabinet */}
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={3}
                    fill="#0f172a"
                    stroke={isSelected ? "#f59e0b" : "#f97316"}
                    strokeWidth={isSelected ? 3 : 1.8}
                  />
                  {/* Left inlet ball valves */}
                  <circle cx={ex + 3.5} cy={ey + eh * 0.3} r={2} fill="#ef4444" />
                  <circle cx={ex + 3.5} cy={ey + eh * 0.7} r={2} fill="#3b82f6" />
                  {/* Red supply bar top */}
                  <line x1={ex + 6} y1={ey + eh * 0.3} x2={ex + ew - 6} y2={ey + eh * 0.3} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" />
                  {/* Blue return bar bottom */}
                  <line x1={ex + 6} y1={ey + eh * 0.7} x2={ex + ew - 6} y2={ey + eh * 0.7} stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" />
                  {/* Small outlet nipples */}
                  {Array.from({ length: 4 }).map((_, oi) => (
                    <g key={oi}>
                      <circle cx={ex + 9 + oi * ((ew - 18) / 3)} cy={ey + eh * 0.3} r={1.5} fill="#fde047" />
                      <circle cx={ex + 9 + oi * ((ew - 18) / 3)} cy={ey + eh * 0.7} r={1.5} fill="#fde047" />
                    </g>
                  ))}
                  {/* Right end air vent symbols */}
                  <rect x={ex + ew - 4.5} y={ey + eh * 0.3 - 3.5} width={3} height={3} rx={0.5} fill="#38bdf8" />
                  <rect x={ex + ew - 4.5} y={ey + eh * 0.7 + 0.5} width={3} height={3} rx={0.5} fill="#38bdf8" />
                  <text
                    x={ex + ew / 2}
                    y={ey + eh / 2 + 2.5}
                    textAnchor="middle"
                    className="font-mono font-black text-[6.5px] fill-orange-300 select-none pointer-events-none"
                  >
                    ШРН-ТП
                  </text>
                </g>
              ) : el.type === "socket_internet" ? (
                <g>
                  {/* RJ45 Network socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#1e293b" stroke={isSelected ? "#f59e0b" : "#3b82f6"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {/* RJ-45 jack symbol */}
                  <rect x={ex + ew / 2 - 4} y={ey + eh / 2 - 3} width={8} height={6} rx={1} fill="#3b82f6" fillOpacity={0.4} stroke="#3b82f6" strokeWidth={1} />
                  <path d={`M ${ex + ew / 2 - 2} ${ey + eh / 2 + 3} L ${ex + ew / 2 + 2} ${ey + eh / 2 + 3}`} stroke="#ffffff" strokeWidth={1.2} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[7px] fill-blue-400 select-none pointer-events-none">
                    RJ45
                  </text>
                </g>
              ) : el.type === "socket_tv" ? (
                <g>
                  {/* Coaxial TV socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#1e1b4b" stroke={isSelected ? "#f59e0b" : "#8b5cf6"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3.2} fill="none" stroke="#8b5cf6" strokeWidth={1.5} />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={2} fill="#c4b5fd" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[7px] fill-purple-400 select-none pointer-events-none">
                    TV
                  </text>
                </g>
              ) : el.type === "socket_usb" ? (
                <g>
                  {/* USB-A + Type-C socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#064e3b" stroke={isSelected ? "#f59e0b" : "#10b981"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {/* Type-A slot */}
                  <rect x={ex + ew / 2 - 4} y={ey + eh / 2 - 4} width={8} height={2.5} rx={0.5} fill="#ffffff" />
                  {/* Type-C pill slot */}
                  <rect x={ex + ew / 2 - 3} y={ey + eh / 2 + 1} width={6} height={2.5} rx={1.2} fill="#34d399" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-emerald-400 select-none pointer-events-none">
                    Type-C
                  </text>
                </g>
              ) : el.type === "socket_380v" ? (
                <g>
                  {/* 3-Phase 380V High Power Socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={3} fill="#450a0a" stroke={isSelected ? "#f59e0b" : "#dc2626"} strokeWidth={isSelected ? 2.5 : 2} />
                  {/* 3 phases + N + PE dots */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 2.8} fill="none" stroke="#ef4444" strokeWidth={1.2} strokeDasharray="2,2" />
                  <circle cx={ex + ew / 2 - 3} cy={ey + eh / 2 - 2} r={1.5} fill="#fca5a5" />
                  <circle cx={ex + ew / 2 + 3} cy={ey + eh / 2 - 2} r={1.5} fill="#fca5a5" />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2 + 3} r={1.5} fill="#fca5a5" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[7px] fill-red-400 select-none pointer-events-none">
                    380V
                  </text>
                </g>
              ) : el.type === "socket_wet" ? (
                <g>
                  {/* IP44 Waterproof Socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#082f49" stroke={isSelected ? "#f59e0b" : "#0284c7"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {/* Protective flip cover border */}
                  <rect x={ex + 2} y={ey + 2} width={ew - 4} height={eh - 4} rx={1} fill="none" stroke="#38bdf8" strokeWidth={1} strokeDasharray="1,1" />
                  {/* Droplet icon */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={2.5} fill="#38bdf8" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-sky-400 select-none pointer-events-none">
                    IP44
                  </text>
                </g>
              ) : el.type === "central_vacuum" ? (
                <g>
                  {/* Central vacuum power unit */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={4} fill="#0c4a6e" stroke={isSelected ? "#f59e0b" : "#0284c7"} strokeWidth={isSelected ? 3 : 2} />
                  {/* Vacuum cyclone cylinder */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3} fill="#0369a1" stroke="#38bdf8" strokeWidth={1.2} />
                  {/* Exhaust & Intake pipe ports */}
                  <rect x={ex + 2} y={ey + eh / 2 - 2} width={4} height={4} fill="#e0f2fe" />
                  <rect x={ex + ew - 6} y={ey + eh / 2 - 2} width={4} height={4} fill="#e0f2fe" />
                  <text x={ex + ew / 2} y={ey + eh / 2 + 2.5} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-white select-none pointer-events-none">
                    Ц-ПЫЛ
                  </text>
                </g>
              ) : el.type === "vacuum_inlet" ? (
                <g>
                  {/* Vacuum wall inlet socket */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#0369a1" stroke={isSelected ? "#f59e0b" : "#38bdf8"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3.5} fill="#082f49" stroke="#ffffff" strokeWidth={1} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-sky-300 select-none pointer-events-none">
                    ПНЕВМО
                  </text>
                </g>
              ) : el.type === "robot_vacuum_dock" ? (
                <g>
                  {/* Hidden robot vacuum docking station */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={4} fill="#064e3b" stroke={isSelected ? "#f59e0b" : "#10b981"} strokeWidth={isSelected ? 3 : 2} />
                  {/* Base station charging pad plate */}
                  <rect x={ex + 3} y={ey + 3} width={ew - 6} height={eh * 0.4} rx={2} fill="#047857" stroke="#34d399" strokeWidth={1} />
                  {/* Robot vacuum circular body parked */}
                  <circle cx={ex + ew / 2} cy={ey + eh * 0.65} r={Math.min(ew, eh) / 3.2} fill="#0f172a" stroke="#10b981" strokeWidth={1.5} />
                  <circle cx={ex + ew / 2} cy={ey + eh * 0.65} r={2} fill="#34d399" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-emerald-300 select-none pointer-events-none">
                    РОБОТ-ПЫЛЕСОС
                  </text>
                </g>
              ) : el.type === "humidifier_pump" ? (
                <g>
                  {/* High pressure humidifier pump station */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={3} fill="#075985" stroke={isSelected ? "#f59e0b" : "#0284c7"} strokeWidth={isSelected ? 3 : 2} />
                  {/* Pressure gauge dial */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3.2} fill="#0f172a" stroke="#38bdf8" strokeWidth={1.2} />
                  <line x1={ex + ew / 2} y1={ey + eh / 2} x2={ex + ew / 2 + 3} y2={ey + eh / 2 - 3} stroke="#ef4444" strokeWidth={1.2} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-sky-300 select-none pointer-events-none">
                    УВЛАЖНЕНИЕ 70BAR
                  </text>
                </g>
              ) : el.type === "humidifier_nozzle" ? (
                <g>
                  {/* Direct high-pressure mist nozzle */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 2.5} fill="#0c4a6e" stroke={isSelected ? "#f59e0b" : "#06b6d4"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {/* Atomized mist rings */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 4} fill="none" stroke="#67e8f9" strokeWidth={1} strokeDasharray="1,1" />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={2} fill="#ffffff" />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-cyan-300 select-none pointer-events-none">
                    ТУМАН
                  </text>
                </g>
              ) : el.type === "vent_diffuser_supply" ? (
                <g>
                  {/* Supply air diffuser */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={3} fill="#0c4a6e" stroke={isSelected ? "#f59e0b" : "#38bdf8"} strokeWidth={isSelected ? 2.5 : 1.8} />
                  {/* Concentric rings */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3} fill="none" stroke="#38bdf8" strokeWidth={1.2} />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 5} fill="#38bdf8" />
                  {/* Outward airflow arrows */}
                  <line x1={ex + ew / 2 - 5} y1={ey + eh / 2} x2={ex + 2} y2={ey + eh / 2} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={ex + ew / 2 + 5} y1={ey + eh / 2} x2={ex + ew - 2} y2={ey + eh / 2} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={ex + ew / 2} y1={ey + eh / 2 - 5} x2={ex + ew / 2} y2={ey + 2} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={ex + ew / 2} y1={ey + eh / 2 + 5} x2={ex + ew / 2} y2={ey + eh - 2} stroke="#ffffff" strokeWidth={1.2} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-sky-300 select-none pointer-events-none">
                    ПРИТОК
                  </text>
                </g>
              ) : el.type === "vent_diffuser_exhaust" ? (
                <g>
                  {/* Exhaust air diffuser */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={3} fill="#4c0519" stroke={isSelected ? "#f59e0b" : "#f87171"} strokeWidth={isSelected ? 2.5 : 1.8} />
                  {/* Concentric rings */}
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 3} fill="none" stroke="#f87171" strokeWidth={1.2} />
                  <circle cx={ex + ew / 2} cy={ey + eh / 2} r={Math.min(ew, eh) / 5} fill="#f87171" />
                  {/* Inward suction arrows */}
                  <line x1={ex + 2} y1={ey + eh / 2} x2={ex + ew / 2 - 3} y2={ey + eh / 2} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={ex + ew - 2} y1={ey + eh / 2} x2={ex + ew / 2 + 3} y2={ey + eh / 2} stroke="#ffffff" strokeWidth={1.2} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-rose-300 select-none pointer-events-none">
                    ВЫТЯЖКА
                  </text>
                </g>
              ) : el.type === "vent_grille_linear" ? (
                <g>
                  {/* Architectural linear slot diffuser grille */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#0f172a" stroke={isSelected ? "#f59e0b" : "#0ea5e9"} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {/* Long linear slot blades */}
                  <line x1={ex + 2} y1={ey + eh * 0.35} x2={ex + ew - 2} y2={ey + eh * 0.35} stroke="#38bdf8" strokeWidth={1.5} />
                  <line x1={ex + 2} y1={ey + eh * 0.65} x2={ex + ew - 2} y2={ey + eh * 0.65} stroke="#38bdf8" strokeWidth={1.5} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-cyan-300 select-none pointer-events-none">
                    ЩЕЛЕВАЯ РЕШЁТКА
                  </text>
                </g>
              ) : el.type === "vent_penetration" ? (
                <g>
                  {/* Wall penetration sleeve for ventilation grille */}
                  <rect x={ex} y={ey} width={ew} height={eh} rx={2} fill="#334155" stroke={isSelected ? "#f59e0b" : "#94a3b8"} strokeWidth={isSelected ? 2.5 : 1.5} strokeDasharray="3,2" />
                  {/* Diagonal cross hatch through wall */}
                  <line x1={ex} y1={ey} x2={ex + ew} y2={ey + eh} stroke="#f1f5f9" strokeWidth={1.2} />
                  <line x1={ex + ew} y1={ey} x2={ex} y2={ey + eh} stroke="#f1f5f9" strokeWidth={1.2} />
                  <text x={ex + ew / 2} y={ey - 3} textAnchor="middle" className="font-mono font-black text-[6.5px] fill-neutral-300 select-none pointer-events-none">
                    ПРОХОД ВЕНТ
                  </text>
                </g>
              ) : (
                <>
                  <rect
                    x={ex}
                    y={ey}
                    width={ew}
                    height={eh}
                    rx={4}
                    fill={catItem?.color || "#64748b"}
                    fillOpacity={0.88}
                    stroke={isSelected ? "#f59e0b" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                  {/* Emoji icon */}
                  <text x={ex + ew / 2} y={ey + eh / 2 + 5} textAnchor="middle" className="text-base select-none">
                    {catItem?.emoji || "📦"}
                  </text>
                </>
              )}
              {/* Circuit or label */}
              {el.circuitNumber && (
                <text
                  x={ex + ew / 2}
                  y={ey - 4}
                  textAnchor="middle"
                  className="font-mono font-bold text-[8px] fill-amber-400 select-none bg-black/60 px-1"
                >
                  {el.circuitNumber}
                </text>
              )}
            </g>
          );
        })}

        {/* 8. ACTIVE DRAWING ROUTE PREVIEW */}
        {drawingRoute && (
          <g className="pointer-events-none">
            {/* Existing placed segments */}
            {drawingRoute.points.length > 1 && (
              <path
                d={drawingRoute.points
                  .map((pt, idx) => {
                    const px = canvasPadding + pt.x * pixelsPerMeter;
                    const py = canvasPadding + pt.y * pixelsPerMeter;
                    return `${idx === 0 ? "M" : "L"} ${px} ${py}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={drawingRoute.color || "#f59e0b"}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#wireGlow2D)"
              />
            )}

            {/* Placed waypoint nodes */}
            {drawingRoute.points.map((pt, idx) => {
              const px = canvasPadding + pt.x * pixelsPerMeter;
              const py = canvasPadding + pt.y * pixelsPerMeter;
              return (
                <g key={`dr_pt_${idx}`}>
                  <circle
                    cx={px}
                    cy={py}
                    r={5}
                    fill={drawingRoute.color || "#f59e0b"}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <text
                    x={px}
                    y={py - 8}
                    textAnchor="middle"
                    className="font-mono font-bold text-[9px] fill-white drop-shadow"
                  >
                    #{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Rubber-band dashed line from last point to current mouse cursor */}
            {drawingRoute.points.length > 0 && hoverMeters && (
              <g>
                <line
                  x1={canvasPadding + drawingRoute.points[drawingRoute.points.length - 1].x * pixelsPerMeter}
                  y1={canvasPadding + drawingRoute.points[drawingRoute.points.length - 1].y * pixelsPerMeter}
                  x2={canvasPadding + hoverMeters.x * pixelsPerMeter}
                  y2={canvasPadding + hoverMeters.y * pixelsPerMeter}
                  stroke={drawingRoute.color || "#f59e0b"}
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                />
                {/* Distance marker on rubber-band */}
                {(() => {
                  const lastPt = drawingRoute.points[drawingRoute.points.length - 1];
                  const segDist =
                    Math.round(
                      Math.sqrt(
                        Math.pow(hoverMeters.x - lastPt.x, 2) + Math.pow(hoverMeters.y - lastPt.y, 2)
                      ) * 10
                    ) / 10;
                  const midX = canvasPadding + ((lastPt.x + hoverMeters.x) / 2) * pixelsPerMeter;
                  const midY = canvasPadding + ((lastPt.y + hoverMeters.y) / 2) * pixelsPerMeter;
                  return (
                    <text
                      x={midX}
                      y={midY - 6}
                      textAnchor="middle"
                      className="font-mono text-[9px] font-bold fill-amber-300 drop-shadow"
                    >
                      {segDist} м
                    </text>
                  );
                })()}
              </g>
            )}

            {/* Hover cursor target circle */}
            {hoverMeters && (
              <g transform={`translate(${canvasPadding + hoverMeters.x * pixelsPerMeter}, ${canvasPadding + hoverMeters.y * pixelsPerMeter})`}>
                <circle cx={0} cy={0} r={7} fill="none" stroke="#ffffff" strokeWidth={2} />
                <circle cx={0} cy={0} r={3} fill={drawingRoute.color || "#f59e0b"} />
              </g>
            )}

            {/* Snapped element badge while routing */}
            {snappedElementInfo && (
              <g
                transform={`translate(${canvasPadding + snappedElementInfo.x * pixelsPerMeter}, ${canvasPadding + snappedElementInfo.y * pixelsPerMeter - 26})`}
              >
                <rect
                  x={-75}
                  y={-14}
                  width={150}
                  height={24}
                  rx={6}
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
                <text
                  x={0}
                  y={2}
                  textAnchor="middle"
                  className="fill-amber-300 font-bold text-[10px] font-mono"
                >
                  ⚡ Привязка: {snappedElementInfo.label}
                </text>
              </g>
            )}
          </g>
        )}

        {/* 9. ACTIVE HEATING LOOP DRAG PREVIEW */}
        {drawingHeatingLoop && loopDragStart && loopDragCurrent && (() => {
          const minX = Math.min(loopDragStart.x, loopDragCurrent.x);
          const minY = Math.min(loopDragStart.y, loopDragCurrent.y);
          const w = Math.max(0.2, Math.abs(loopDragCurrent.x - loopDragStart.x));
          const h = Math.max(0.2, Math.abs(loopDragCurrent.y - loopDragStart.y));
          const px = canvasPadding + minX * pixelsPerMeter;
          const py = canvasPadding + minY * pixelsPerMeter;
          const pw = w * pixelsPerMeter;
          const ph = h * pixelsPerMeter;
          const area = Math.round(w * h * 100) / 100;
          const approxPipe = Math.round((w * h / 0.15) * 1.1);

          return (
            <g className="pointer-events-none">
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill="rgba(244, 63, 94, 0.20)"
                stroke="#f43f5e"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
              <circle cx={px} cy={py} r={5} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
              <circle cx={px + pw} cy={py} r={5} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
              <circle cx={px + pw} cy={py + ph} r={5} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
              <circle cx={px} cy={py + ph} r={5} fill="#f43f5e" stroke="#fff" strokeWidth={2} />

              <g transform={`translate(${px + pw / 2}, ${py + ph / 2})`}>
                <rect
                  x={-85}
                  y={-22}
                  width={170}
                  height={44}
                  rx={8}
                  fill="rgba(15, 23, 42, 0.96)"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                />
                <text
                  x={0}
                  y={-4}
                  textAnchor="middle"
                  className="fill-white font-black text-[12px] font-mono"
                >
                  {w.toFixed(2)}м × {h.toFixed(2)}м ({area} м²)
                </text>
                <text
                  x={0}
                  y={12}
                  textAnchor="middle"
                  className="fill-rose-400 font-bold text-[10px] font-mono"
                >
                  Труба PEX: ~{approxPipe}м (шаг 150)
                </text>
              </g>
            </g>
          );
        })()}

        {/* 10. ACTIVE PLACING ELEMENT GHOST CURSOR */}
        {placingElement && placingCursor && (() => {
          const ew = (placingElement.defaultW || 0.4) * pixelsPerMeter;
          const eh = (placingElement.defaultH || 0.4) * pixelsPerMeter;
          const px = canvasPadding + (placingCursor.x - (placingElement.defaultW || 0.4) / 2) * pixelsPerMeter;
          const py = canvasPadding + (placingCursor.y - (placingElement.defaultH || 0.4) / 2) * pixelsPerMeter;

          return (
            <g className="pointer-events-none">
              <rect
                x={px}
                y={py}
                width={ew}
                height={eh}
                rx={6}
                fill="rgba(56, 189, 248, 0.3)"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              <text
                x={px + ew / 2}
                y={py - 10}
                textAnchor="middle"
                className="fill-white text-[11px] font-black drop-shadow-md"
              >
                {placingElement.emoji} {placingElement.label}
              </text>
              {placingCursor.snappedWall && (
                <text
                  x={px + ew / 2}
                  y={py + eh + 14}
                  textAnchor="middle"
                  className="fill-amber-300 text-[10px] font-mono font-bold"
                >
                  🧲 {placingCursor.snappedWall}
                </text>
              )}
            </g>
          );
        })()}

        {/* 11. TOP TRANSPARENT EVENT CAPTURE RECTANGLE (Guarantees clicks work 100%) */}
        {(drawingRoute || drawingHeatingLoop || placingElement) && (
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            fill="transparent"
            className="cursor-crosshair"
            style={{ pointerEvents: "all" }}
            onMouseMove={handleInteractiveMouseMove}
            onMouseDown={handleInteractiveMouseDown}
            onMouseUp={handleInteractiveMouseUp}
            onClick={handleInteractiveClick}
            onDoubleClick={handleInteractiveDoubleClick}
          />
        )}
      </svg>

      {/* Floating HUD for Route Drawing */}
      {drawingRoute && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-40 bg-neutral-900/95 border border-amber-500/60 shadow-2xl rounded-2xl p-3 px-5 flex items-center gap-4 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div>
              <span className="font-extrabold text-white text-xs block">
                {drawingRoute.name}
              </span>
              <span className="text-[10px] text-amber-300 font-mono">
                Кликайте по плану для поворотов · Точек: {drawingRoute.points.length} (Shift: под прямым углом)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {drawingRoute.points.length > 0 && onUndoRoutePoint && (
              <button
                type="button"
                onClick={onUndoRoutePoint}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                title="Отменить последнюю точку (Backspace)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>
            )}

            <button
              type="button"
              onClick={onFinishDrawingRoute}
              disabled={drawingRoute.points.length < 2}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
              title="Завершить трассу (Enter или двойной клик)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Завершить ({calculateRouteLength(drawingRoute.points)}м)</span>
            </button>

            <button
              type="button"
              onClick={onCancelDrawingRoute}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
              title="Отменить трассировку (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Отмена (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD for Underfloor Heating Loop Drawing */}
      {drawingHeatingLoop && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-40 bg-neutral-900/95 border border-rose-500/60 shadow-2xl rounded-2xl p-3 px-5 flex items-center gap-4 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-white text-xs block">
                Рисование контура тёплого пола
              </span>
              <span className="text-[10px] text-rose-300 font-mono">
                Зажмите левую кнопку мыши и растяните прямоугольник в любой части плана (или кликните для стандартного 2×2м)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelDrawingHeatingLoop}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Отмена (Esc)</span>
          </button>
        </div>
      )}

      {/* Floating HUD for Element Placement / Stamp tool */}
      {placingElement && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-40 bg-neutral-900/95 border border-sky-500/60 shadow-2xl rounded-2xl p-3 px-5 flex items-center gap-4 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">{placingElement.emoji}</span>
            <div>
              <span className="font-extrabold text-white text-xs block">
                Размещение: {placingElement.label}
              </span>
              <span className="text-[10px] text-sky-300 font-mono">
                Кликните в любом месте плана для установки (магнитная привязка к стенам)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer bg-neutral-800/80 px-2.5 py-1 rounded-lg">
              <input
                type="checkbox"
                checked={multiPlaceMode}
                onChange={(e) => setMultiPlaceMode(e.target.checked)}
                className="accent-sky-500"
              />
              <span>Ставить несколько</span>
            </label>

            <button
              type="button"
              onClick={onCancelPlacingElement}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Готово (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Quick-Add Dock (Быстрое добавление элементов в 1 клик) */}
      {!drawingRoute && !drawingHeatingLoop && !placingElement && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
          {quickDockOpen ? (
            <div className="bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 shadow-2xl rounded-2xl p-1.5 px-3 flex items-center gap-1.5 backdrop-blur-md overflow-x-auto max-w-[90vw]">
              <span className="text-[10px] font-black uppercase text-neutral-400 font-mono pr-1 shrink-0">
                Быстро:
              </span>

              {/* Sockets */}
              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "socket_single");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-neutral-800 hover:border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Розетка 220В (кликните для установки на плане)"
              >
                <span>🔌</span>
                <span className="hidden sm:inline">Розетка 220В</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "socket_internet");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-300 border border-neutral-800 hover:border-sky-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Розетка Интернет RJ45"
              >
                <span>🌐</span>
                <span className="hidden sm:inline">RJ45</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "socket_usb");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-800 hover:border-emerald-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Розетка USB / Type-C"
              >
                <span>🔋</span>
                <span className="hidden sm:inline">USB-C</span>
              </button>

              {/* Switch & Light */}
              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "switch_light");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-yellow-300 border border-neutral-800 hover:border-yellow-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Выключатель"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Выключатель</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "light_ceiling");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-yellow-200 border border-neutral-800 hover:border-yellow-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Светильник потолочный"
              >
                <span>💡</span>
                <span className="hidden sm:inline">Свет</span>
              </button>

              {/* Electric Panel */}
              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "electric_panel");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-300 border border-neutral-800 hover:border-red-500/50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Электрощит (ВРУ)"
              >
                <span>🛡️</span>
                <span className="hidden sm:inline">Щит ВРУ</span>
              </button>

              {/* Underfloor heating & Radiator */}
              <button
                type="button"
                onClick={() => onQuickStartHeatingLoop?.()}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                title="Нарисовать контур тёплого пола на плане"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Нарисовать тёплый пол</span>
              </button>

              {/* Routes */}
              <button
                type="button"
                onClick={() =>
                  onQuickStartRoute?.(
                    "electric",
                    `Кабель ВВГнг-LS 3x2.5 #${currentRoutes.filter((r) => r.system === "electric").length + 1}`,
                    "3x2.5",
                    "#f59e0b"
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Проложить кабельную трассу"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Трасса кабеля</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onQuickStartRoute?.(
                    "plumbing_cold",
                    `Труба ХВС Ø16 #${currentRoutes.filter((r) => r.system === "plumbing_cold").length + 1}`,
                    "16",
                    "#0284c7"
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Проложить водопроводную трубу"
              >
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Труба воды</span>
              </button>

              {/* Vacuum & Robot */}
              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "vacuum_inlet");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-200 border border-neutral-800 hover:border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Пневморозетка пылесоса"
              >
                <span>🧹</span>
                <span className="hidden sm:inline">Пневморозетка</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "robot_vacuum_dock");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Скрытая база робота-пылесоса"
              >
                <span>🤖</span>
                <span className="hidden sm:inline">Робот-пылесос</span>
              </button>

              {/* Humidifier & Diffuser */}
              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "humidifier_nozzle");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Форсунка увлажнения"
              >
                <span>🌫️</span>
                <span className="hidden sm:inline">Форсунка</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = ELEMENT_CATALOG.find((e) => e.type === "vent_diffuser_supply");
                  if (item && onQuickStartPlacingElement) onQuickStartPlacingElement(item);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-300 border border-neutral-800 hover:border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Диффузор вентиляции"
              >
                <span>💨</span>
                <span className="hidden sm:inline">Диффузор</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickDockOpen(false)}
                className="p-1 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                title="Скрыть панель"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setQuickDockOpen(true)}
              className="px-3 py-1 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Быстрая вставка элементов</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
