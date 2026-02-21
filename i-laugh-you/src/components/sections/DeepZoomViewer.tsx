"use client";

import { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import { PIECE_COLUMNS, PIECE_ROWS, TOTAL_PIECES } from "@/lib/piece-config";

const IMAGE_HEIGHT = 396288;
const IMAGE_WIDTH = 337920;
const TILE_SIZE = 256;
const MIN_LEVEL = 0;
const MAX_LEVEL = 11;
// Use local proxy to avoid CORS issues and enable WebGL rendering
const TILE_SERVER = "/api/tile/";
const SOURCE_OFFSETS = {
  top: 3873,
  right: 3083,
  bottom: 1573,
  left: 1509,
};
const PIECE_IMAGE_WIDTH =
  (IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) / PIECE_COLUMNS;
const PIECE_IMAGE_HEIGHT =
  (IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / PIECE_ROWS;
const GRID_MIN_PIECE_SIZE_PX = 10;
const GRID_DPR_CAP = 1;
// Zoom limits - allow deep zoom to see individual pieces clearly
const MAX_VIEWER_ZOOM = 100; // high zoom for detailed piece viewing
const MAX_ZOOM_PIXEL_RATIO = 16; // allow more upscaling for close inspection
const OSD_ANIMATION_TIME = 0.35;
// Disable verbose logging in dev to avoid JSON.stringify overflow
const GRID_BENCHMARK_ENABLED = false;
const GRID_BENCHMARK_LOG_EVERY_MS = 5000;
const GRID_BENCHMARK_SLOW_DRAW_MS = 12;
// OSD-level performance logging
const OSD_PERF_LOG_ENABLED = false;
const OSD_PERF_LOG_EVERY_MS = 5000;
// Use update-viewport for synchronous drawing (matches original WP implementation)
const USE_UPDATE_VIEWPORT_EVENT = true;
// Disable continuous RAF loop - it may cause contention with OSD
const USE_CONTINUOUS_RAF_LOOP = false;
// Set to true to disable grid drawing entirely (for debugging OSD performance)
const DISABLE_GRID_DRAWING = false;
// Set to true to disable ALL event handlers except basic OSD (for debugging)
const MINIMAL_MODE = false;
const GRID_BENCHMARK_SOURCES = [
  "update-viewport",
  "resize",
  "open",
  "windowResize",
] as const;

type GridBenchmarkSource = (typeof GRID_BENCHMARK_SOURCES)[number];

function getTileUrl(levelOfDetail: number, tileX: number, tileY: number): string {
  let quadKey = "q";
  for (let i = levelOfDetail; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) digit++;
    if ((tileY & mask) !== 0) digit += 2;
    quadKey += "t" + digit;
  }

  let dirname = TILE_SERVER;

  if (levelOfDetail % 2 === 0) {
    for (let i = 1; i < levelOfDetail + 1; i++) {
      if (i % 2 === 0) {
        dirname +=
          quadKey.substring(
            0,
            quadKey.length - (levelOfDetail - i) * 2 - 1
          ) + "/";
      }
    }
  } else {
    for (let i = 1; i < levelOfDetail; i++) {
      if (i % 2 !== 0) {
        dirname += quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 + 1
        );
        dirname += i === levelOfDetail ? "t/" : "/";
      }
    }
  }

  return dirname + quadKey + ".jpg";
}

// Image ratio from original: 396288 / 337920 ≈ 1.1727
const IMAGE_RATIO = IMAGE_HEIGHT / IMAGE_WIDTH;

function applyParticleMatchZoom(viewer: OpenSeadragon.Viewer) {
  const wh = window.innerHeight;
  const threeJsHeight = wh * 0.6;
  const threeJsWidth = threeJsHeight / IMAGE_RATIO;
  const containerWidth = viewer.element?.clientWidth || 1;
  const zoomTo = threeJsWidth / containerWidth;

  viewer.viewport.zoomTo(zoomTo, undefined, true);
  viewer.viewport.panTo(new OpenSeadragon.Point(0.5, 0.6), true);
}

interface DeepZoomViewerProps {
  onImageClick?: (imageNumber: number) => void;
  visible: boolean;
  viewerRef?: React.MutableRefObject<OpenSeadragon.Viewer | null>;
}

export default function DeepZoomViewer({ onImageClick, visible, viewerRef: externalViewerRef }: DeepZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const visibleRef = useRef(visible);
  const drawGridRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<number | null>(null);
  // Section orchestration controls opacity; component keeps viewer warm and zoom-matched.

  useEffect(() => {
    visibleRef.current = visible;

    const canvasEl = viewerRef.current?.element?.querySelector(
      ".openseadragon-canvas"
    ) as HTMLElement | null;
    if (canvasEl) {
      canvasEl.style.opacity = visible ? "1" : "0";
    }

    const gridCanvas = viewerRef.current?.element?.querySelector(
      ".piece-grid-overlay"
    ) as HTMLCanvasElement | null;
    if (gridCanvas) {
      gridCanvas.style.opacity = visible ? "1" : "0";
    }

    drawGridRef.current?.();
  }, [visible]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageSource: any = {
      height: IMAGE_HEIGHT,
      width: IMAGE_WIDTH,
      tileSize: TILE_SIZE,
      minLevel: MIN_LEVEL,
      maxLevel: MAX_LEVEL,
      getTileUrl,
    };

    // Suppress OSD's console.assert calls that cause Next.js dev tools to crash
    // when trying to JSON.stringify large OSD internal objects
    const originalAssert = console.assert;
    console.assert = () => {};
    
    const viewer = OpenSeadragon({
      element: containerRef.current,
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.0/images/",
      tileSources: imageSource,
      showNavigationControl: false, // original: no nav buttons visible
      zoomPerClick: 1, // original: viewer.zoomPerClick = 1 (no zoom on click)
      animationTime: OSD_ANIMATION_TIME,
      maxZoomLevel: MAX_VIEWER_ZOOM,
      maxZoomPixelRatio: MAX_ZOOM_PIXEL_RATIO,
      // Use OSD defaults for tile loading
      // CRITICAL: Enable CORS for WebGL rendering - without this, OSD falls back to slow canvas2D
      crossOriginPolicy: "Anonymous",
      // Disable OSD debug mode to reduce console noise
      debugMode: false,
    });
    
    // Restore console.assert after OSD init (keep suppressed during runtime)
    // Actually keep it suppressed to avoid runtime assertion serialization issues
    // console.assert = originalAssert;

    // Create overlay container div (matches original WP pattern)
    const gridCanvasDiv = document.createElement("div");
    gridCanvasDiv.style.position = "absolute";
    gridCanvasDiv.style.left = "0";
    gridCanvasDiv.style.top = "0";
    gridCanvasDiv.style.width = "100%";
    gridCanvasDiv.style.height = "100%";
    gridCanvasDiv.style.pointerEvents = "none";
    
    const gridCanvas = document.createElement("canvas");
    gridCanvas.className = "piece-grid-overlay";
    gridCanvas.style.opacity = visibleRef.current ? "1" : "0";
    gridCanvasDiv.appendChild(gridCanvas);
    
    // Append to viewer.canvas (OSD internal container) like original WP code
    // This ensures overlay is inside OSD's rendering hierarchy
    viewer.canvas.appendChild(gridCanvasDiv);
    
    // Cache context to avoid getContext() call every frame
    const gridContext = gridCanvas.getContext("2d");

    const benchmark = {
      lastLogAt: performance.now(),
      sessionStartAt: performance.now(),
      scheduleRequested: 0,
      scheduleSkippedHidden: 0,
      scheduleSkippedQueued: 0,
      drawCalls: 0,
      drawSkippedHidden: 0,
      drawSkippedOutOfBounds: 0,
      drawSkippedTooSmall: 0,
      drawMsTotal: 0,
      drawMsMax: 0,
      queueDelayMsTotal: 0,
      queueDelayMsMax: 0,
      linesDrawnTotal: 0,
      linesDrawnMax: 0,
      visibleCellsTotal: 0,
      visibleCellsMax: 0,
      sourceCounts: {
        "update-viewport": 0,
        resize: 0,
        open: 0,
        windowResize: 0,
      } as Record<GridBenchmarkSource, number>,
      // Cumulative session stats (never reset)
      session: {
        totalDrawCalls: 0,
        totalDrawMs: 0,
        peakDrawMs: 0,
        lastZoom: 0,
        lastLinesDrawn: 0,
      },
    };

    const resetBenchmarkWindow = () => {
      benchmark.scheduleRequested = 0;
      benchmark.scheduleSkippedHidden = 0;
      benchmark.scheduleSkippedQueued = 0;
      benchmark.drawCalls = 0;
      benchmark.drawSkippedHidden = 0;
      benchmark.drawSkippedOutOfBounds = 0;
      benchmark.drawSkippedTooSmall = 0;
      benchmark.drawMsTotal = 0;
      benchmark.drawMsMax = 0;
      benchmark.queueDelayMsTotal = 0;
      benchmark.queueDelayMsMax = 0;
      benchmark.linesDrawnTotal = 0;
      benchmark.linesDrawnMax = 0;
      benchmark.visibleCellsTotal = 0;
      benchmark.visibleCellsMax = 0;
      for (const source of GRID_BENCHMARK_SOURCES) {
        benchmark.sourceCounts[source] = 0;
      }
    };

    const maybeLogBenchmark = (force = false) => {
      if (!GRID_BENCHMARK_ENABLED) return;

      const now = performance.now();
      const elapsedMs = now - benchmark.lastLogAt;
      if (!force && elapsedMs < GRID_BENCHMARK_LOG_EVERY_MS) {
        return;
      }

      const elapsedSec = elapsedMs > 0 ? elapsedMs / 1000 : 0.001;
      const avgDrawMs = benchmark.drawCalls
        ? benchmark.drawMsTotal / benchmark.drawCalls
        : 0;
      const avgQueueDelayMs = benchmark.drawCalls
        ? benchmark.queueDelayMsTotal / benchmark.drawCalls
        : 0;
      const avgLines = benchmark.drawCalls
        ? benchmark.linesDrawnTotal / benchmark.drawCalls
        : 0;
      const avgCells = benchmark.drawCalls
        ? benchmark.visibleCellsTotal / benchmark.drawCalls
        : 0;

      const sessionSec = (now - benchmark.sessionStartAt) / 1000;
      const sessionAvgDrawMs = benchmark.session.totalDrawCalls > 0
        ? benchmark.session.totalDrawMs / benchmark.session.totalDrawCalls
        : 0;
      
      console.info("[OSD Grid Bench]", {
        windowSec: Number(elapsedSec.toFixed(2)),
        schedulePerSec: Number((benchmark.scheduleRequested / elapsedSec).toFixed(1)),
        drawPerSec: Number((benchmark.drawCalls / elapsedSec).toFixed(1)),
        scheduleRequested: benchmark.scheduleRequested,
        scheduleSkippedHidden: benchmark.scheduleSkippedHidden,
        scheduleSkippedQueued: benchmark.scheduleSkippedQueued,
        drawCalls: benchmark.drawCalls,
        drawSkippedHidden: benchmark.drawSkippedHidden,
        drawSkippedOutOfBounds: benchmark.drawSkippedOutOfBounds,
        drawSkippedTooSmall: benchmark.drawSkippedTooSmall,
        avgDrawMs: Number(avgDrawMs.toFixed(2)),
        maxDrawMs: Number(benchmark.drawMsMax.toFixed(2)),
        avgQueueDelayMs: Number(avgQueueDelayMs.toFixed(2)),
        maxQueueDelayMs: Number(benchmark.queueDelayMsMax.toFixed(2)),
        avgLinesDrawn: Number(avgLines.toFixed(1)),
        maxLinesDrawn: benchmark.linesDrawnMax,
        avgVisibleCells: Number(avgCells.toFixed(1)),
        maxVisibleCells: benchmark.visibleCellsMax,
        sourceCounts: { ...benchmark.sourceCounts },
        // Session cumulative stats
        sessionSec: Number(sessionSec.toFixed(1)),
        sessionTotalDraws: benchmark.session.totalDrawCalls,
        sessionAvgDrawMs: Number(sessionAvgDrawMs.toFixed(2)),
        sessionPeakDrawMs: Number(benchmark.session.peakDrawMs.toFixed(2)),
        lastZoom: Number(benchmark.session.lastZoom.toFixed(4)),
        lastLinesDrawn: benchmark.session.lastLinesDrawn,
      });

      benchmark.lastLogAt = now;
      resetBenchmarkWindow();
    };

    const ensureGridCanvasSize = () => {
      const width = viewer.element?.clientWidth ?? 0;
      const height = viewer.element?.clientHeight ?? 0;
      if (!width || !height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, GRID_DPR_CAP);
      const nextWidth = Math.floor(width * dpr);
      const nextHeight = Math.floor(height * dpr);
      if (gridCanvas.width !== nextWidth || gridCanvas.height !== nextHeight) {
        gridCanvas.width = nextWidth;
        gridCanvas.height = nextHeight;
      }
      gridCanvas.style.width = `${width}px`;
      gridCanvas.style.height = `${height}px`;
    };

    // Cached overlay state (matches original WP pattern)
    let overlayState = {
      containerWidth: 0,
      containerHeight: 0,
      viewportOriginX: 0,
      viewportOriginY: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      imgWidth: IMAGE_WIDTH,
      imgHeight: IMAGE_HEIGHT,
      imgAspectRatio: IMAGE_WIDTH / IMAGE_HEIGHT,
    };

    // Hover highlight state (mutable, no re-renders)
    let hoveredCell: { col: number; row: number } | null = null;

    // Resize overlay state (matches original WP resize())
    const updateOverlayState = () => {
      const containerWidth = viewer.container?.clientWidth ?? 0;
      const containerHeight = viewer.container?.clientHeight ?? 0;
      if (!containerWidth || !containerHeight) return;

      overlayState.containerWidth = containerWidth;
      overlayState.containerHeight = containerHeight;

      const boundsRect = viewer.viewport.getBounds(true);
      overlayState.viewportOriginX = boundsRect.x;
      overlayState.viewportOriginY = boundsRect.y * overlayState.imgAspectRatio;
      overlayState.viewportWidth = boundsRect.width;
      overlayState.viewportHeight = boundsRect.height * overlayState.imgAspectRatio;

      const image1 = viewer.world.getItemAt(0);
      if (image1?.source?.dimensions) {
        overlayState.imgWidth = image1.source.dimensions.x;
        overlayState.imgHeight = image1.source.dimensions.y;
        overlayState.imgAspectRatio = overlayState.imgWidth / overlayState.imgHeight;
      }
    };

    const drawGrid = () => {
      if (DISABLE_GRID_DRAWING) return;
      
      const drawStartedAt = performance.now();
      const timings = { resize: 0, setup: 0, transform: 0, draw: 0 };
      
      const t0 = performance.now();
      ensureGridCanvasSize();
      updateOverlayState();
      timings.resize = performance.now() - t0;

      const t1 = performance.now();
      if (!gridContext || !viewer.viewport) return;
      const context = gridContext;

      const { containerWidth, containerHeight } = overlayState;
      if (!containerWidth || !containerHeight) return;

      // Clear canvas
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      timings.setup = performance.now() - t1;

      if (!visibleRef.current) {
        benchmark.drawSkippedHidden += 1;
        maybeLogBenchmark();
        return;
      }

      const t2 = performance.now();
      // Calculate transform (matches original WP _updateCanvas)
      const viewportZoom = viewer.viewport.getZoom(true);
      const image1 = viewer.world.getItemAt(0);
      if (!image1) return;
      const zoom = image1.viewportToImageZoom(viewportZoom);

      const { viewportOriginX, viewportOriginY, viewportWidth, viewportHeight, imgWidth, imgHeight } = overlayState;
      const x = ((viewportOriginX / imgWidth - viewportOriginX) / viewportWidth) * containerWidth;
      const y = ((viewportOriginY / imgHeight - viewportOriginY) / viewportHeight) * containerHeight;

      // Apply transform: translate then scale (matches original WP pattern)
      context.translate(x, y);
      context.scale(zoom, zoom);
      timings.transform = performance.now() - t2;

      // Check if pieces are large enough to draw grid
      const pieceScreenWidth = PIECE_IMAGE_WIDTH * zoom;
      const pieceScreenHeight = PIECE_IMAGE_HEIGHT * zoom;
      if (pieceScreenWidth < GRID_MIN_PIECE_SIZE_PX && pieceScreenHeight < GRID_MIN_PIECE_SIZE_PX) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        benchmark.drawSkippedTooSmall += 1;
        maybeLogBenchmark();
        return;
      }

      // Calculate visible bounds in image coordinates
      const viewportBounds = viewer.viewport.getBounds(true);
      const imageTopLeft = viewer.viewport.viewportToImageCoordinates(viewportBounds.getTopLeft());
      const imageBottomRight = viewer.viewport.viewportToImageCoordinates(viewportBounds.getBottomRight());

      const minX = Math.min(imageTopLeft.x, imageBottomRight.x);
      const maxX = Math.max(imageTopLeft.x, imageBottomRight.x);
      const minY = Math.min(imageTopLeft.y, imageBottomRight.y);
      const maxY = Math.max(imageTopLeft.y, imageBottomRight.y);

      const gridMinX = SOURCE_OFFSETS.left;
      const gridMaxX = SOURCE_OFFSETS.left + PIECE_IMAGE_WIDTH * PIECE_COLUMNS;
      const gridMinY = SOURCE_OFFSETS.top;
      const gridMaxY = SOURCE_OFFSETS.top + PIECE_IMAGE_HEIGHT * PIECE_ROWS;

      const visibleMinX = Math.max(minX, gridMinX);
      const visibleMaxX = Math.min(maxX, gridMaxX);
      const visibleMinY = Math.max(minY, gridMinY);
      const visibleMaxY = Math.min(maxY, gridMaxY);

      if (visibleMinX >= visibleMaxX || visibleMinY >= visibleMaxY) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        benchmark.drawSkippedOutOfBounds += 1;
        maybeLogBenchmark();
        return;
      }

      const minColumn = Math.max(0, Math.floor((visibleMinX - SOURCE_OFFSETS.left) / PIECE_IMAGE_WIDTH));
      const maxColumn = Math.min(PIECE_COLUMNS, Math.ceil((visibleMaxX - SOURCE_OFFSETS.left) / PIECE_IMAGE_WIDTH));
      const minRow = Math.max(0, Math.floor((visibleMinY - SOURCE_OFFSETS.top) / PIECE_IMAGE_HEIGHT));
      const maxRow = Math.min(PIECE_ROWS, Math.ceil((visibleMaxY - SOURCE_OFFSETS.top) / PIECE_IMAGE_HEIGHT));

      const verticalLineCount = maxColumn - minColumn;
      const horizontalLineCount = maxRow - minRow;
      if (verticalLineCount < 0 || horizontalLineCount < 0) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        benchmark.drawSkippedOutOfBounds += 1;
        maybeLogBenchmark();
        return;
      }

      const visibleCells = verticalLineCount * horizontalLineCount;

      const t3 = performance.now();
      // Draw in IMAGE coordinates (transform handles conversion)
      // Line width in image coords = desired screen pixels / zoom
      // We want 1px screen lines, so lineWidth = 1 / zoom
      context.strokeStyle = "rgba(255, 255, 255, 0.5)";
      context.lineWidth = 1 / zoom;

      context.beginPath();
      // Vertical lines
      for (let column = minColumn; column <= maxColumn; column++) {
        const imgX = SOURCE_OFFSETS.left + column * PIECE_IMAGE_WIDTH;
        context.moveTo(imgX, visibleMinY);
        context.lineTo(imgX, visibleMaxY);
      }
      // Horizontal lines
      for (let row = minRow; row <= maxRow; row++) {
        const imgY = SOURCE_OFFSETS.top + row * PIECE_IMAGE_HEIGHT;
        context.moveTo(visibleMinX, imgY);
        context.lineTo(visibleMaxX, imgY);
      }
      context.stroke();

      // Draw hover highlight
      if (
        hoveredCell &&
        hoveredCell.col >= minColumn &&
        hoveredCell.col < maxColumn &&
        hoveredCell.row >= minRow &&
        hoveredCell.row < maxRow
      ) {
        const hx = SOURCE_OFFSETS.left + hoveredCell.col * PIECE_IMAGE_WIDTH;
        const hy = SOURCE_OFFSETS.top + hoveredCell.row * PIECE_IMAGE_HEIGHT;
        context.fillStyle = "rgba(255, 255, 255, 0.15)";
        context.fillRect(hx, hy, PIECE_IMAGE_WIDTH, PIECE_IMAGE_HEIGHT);
        context.strokeStyle = "rgba(255, 255, 255, 0.9)";
        context.lineWidth = 4 / zoom;
        context.strokeRect(hx, hy, PIECE_IMAGE_WIDTH, PIECE_IMAGE_HEIGHT);
      }

      // Reset transform
      context.setTransform(1, 0, 0, 1, 0, 0);
      timings.draw = performance.now() - t3;

      const linesDrawn = verticalLineCount + horizontalLineCount + 2;
      const drawDurationMs = performance.now() - drawStartedAt;

      benchmark.drawCalls += 1;
      benchmark.drawMsTotal += drawDurationMs;
      benchmark.drawMsMax = Math.max(benchmark.drawMsMax, drawDurationMs);
      benchmark.linesDrawnTotal += linesDrawn;
      benchmark.linesDrawnMax = Math.max(benchmark.linesDrawnMax, linesDrawn);
      benchmark.visibleCellsTotal += visibleCells;
      benchmark.visibleCellsMax = Math.max(benchmark.visibleCellsMax, visibleCells);
      
      // Update session cumulative stats
      benchmark.session.totalDrawCalls += 1;
      benchmark.session.totalDrawMs += drawDurationMs;
      benchmark.session.peakDrawMs = Math.max(benchmark.session.peakDrawMs, drawDurationMs);
      benchmark.session.lastZoom = zoom;
      benchmark.session.lastLinesDrawn = linesDrawn;

      if (GRID_BENCHMARK_ENABLED && drawDurationMs >= GRID_BENCHMARK_SLOW_DRAW_MS) {
        console.warn("[OSD Grid Bench] slow overlay draw", {
          drawMs: Number(drawDurationMs.toFixed(2)),
          resizeMs: Number(timings.resize.toFixed(2)),
          setupMs: Number(timings.setup.toFixed(2)),
          transformMs: Number(timings.transform.toFixed(2)),
          canvasDrawMs: Number(timings.draw.toFixed(2)),
          linesDrawn,
          visibleCells,
          zoom: Number(zoom.toFixed(4)),
          pieceScreenWidth: Number(pieceScreenWidth.toFixed(2)),
        });
      }
      
      if (GRID_BENCHMARK_ENABLED && benchmark.drawCalls % 30 === 0) {
        console.log("[OSD Grid Timings]", {
          totalMs: Number(drawDurationMs.toFixed(2)),
          resizeMs: Number(timings.resize.toFixed(2)),
          setupMs: Number(timings.setup.toFixed(2)),
          transformMs: Number(timings.transform.toFixed(2)),
          canvasDrawMs: Number(timings.draw.toFixed(2)),
          linesDrawn,
          visibleCells,
          zoom: Number(zoom.toFixed(4)),
          lineWidth: Number((1 / zoom).toFixed(4)),
        });
      }

      maybeLogBenchmark();
    };

    drawGridRef.current = drawGrid;

    let frameQueuedAt = 0;
    let pendingFrameRequested = false;

    const enqueueGridDrawFrame = () => {
      frameQueuedAt = performance.now();
      frameRef.current = window.requestAnimationFrame(() => {
        const queueDelayMs = performance.now() - frameQueuedAt;
        benchmark.queueDelayMsTotal += queueDelayMs;
        benchmark.queueDelayMsMax = Math.max(
          benchmark.queueDelayMsMax,
          queueDelayMs
        );
        frameRef.current = null;
        drawGrid();

        if (pendingFrameRequested) {
          pendingFrameRequested = false;
          enqueueGridDrawFrame();
        }
      });
    };

    const scheduleGridDraw = (source: GridBenchmarkSource) => {
      benchmark.scheduleRequested += 1;
      benchmark.sourceCounts[source] += 1;

      if (!visibleRef.current) {
        benchmark.scheduleSkippedHidden += 1;
        maybeLogBenchmark();
        return;
      }
      if (frameRef.current !== null) {
        pendingFrameRequested = true;
        benchmark.scheduleSkippedQueued += 1;
        maybeLogBenchmark();
        return;
      }

      enqueueGridDrawFrame();
    };

    // Continuous RAF loop for smooth 60fps updates during interaction (optional)
    let isInteracting = false;
    let continuousRafId: number | null = null;
    
    const continuousDrawLoop = () => {
      if (!USE_CONTINUOUS_RAF_LOOP || !isInteracting || !visibleRef.current) {
        continuousRafId = null;
        return;
      }
      benchmark.scheduleRequested += 1;
      benchmark.sourceCounts["update-viewport"] += 1;
      drawGrid();
      continuousRafId = requestAnimationFrame(continuousDrawLoop);
    };
    
    const startContinuousLoop = () => {
      if (!USE_CONTINUOUS_RAF_LOOP) return;
      if (isInteracting) return;
      isInteracting = true;
      if (continuousRafId === null) {
        continuousRafId = requestAnimationFrame(continuousDrawLoop);
      }
    };
    
    const stopContinuousLoop = () => {
      if (!USE_CONTINUOUS_RAF_LOOP) return;
      isInteracting = false;
      // Draw one final frame to ensure we're synced
      if (visibleRef.current) {
        drawGrid();
      }
    };
    
    // Mouse/touch handlers for continuous updates during drag
    const handlePointerDown = () => startContinuousLoop();
    const handlePointerUp = () => stopContinuousLoop();
    const handlePointerLeave = () => stopContinuousLoop();
    
    // update-viewport fires synchronously with OSD's render loop
    const handleUpdateViewport = () => {
      if (USE_CONTINUOUS_RAF_LOOP && isInteracting) return; // Skip if continuous loop is running
      if (!visibleRef.current) return;
      benchmark.scheduleRequested += 1;
      benchmark.sourceCounts["update-viewport"] += 1;
      drawGrid();
    };
    const handleResize = () => scheduleGridDraw("resize");
    const handleWindowResize = () => scheduleGridDraw("windowResize");

    const handleOpen = () => {
      try {
        const canvasEl = viewer.element?.querySelector(
          ".openseadragon-canvas"
        ) as HTMLElement | null;
        if (canvasEl) {
          canvasEl.style.opacity = visibleRef.current ? "1" : "0";
        }

        applyParticleMatchZoom(viewer);
        scheduleGridDraw("open");
      } catch {
        // Ignore zoom errors on init
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCanvasClick = (event: any) => {
      if (!event.quick || !onImageClick) return;

      const webPoint = event.position;
      const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
      const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

      const xImage = Math.floor((imagePoint.x - SOURCE_OFFSETS.left) / PIECE_IMAGE_WIDTH);
      const yImage = Math.floor((imagePoint.y - SOURCE_OFFSETS.top) / PIECE_IMAGE_HEIGHT);
      if (
        xImage < 0 ||
        xImage >= PIECE_COLUMNS ||
        yImage < 0 ||
        yImage >= PIECE_ROWS
      ) {
        return;
      }
      const imageNumber = yImage * PIECE_COLUMNS + xImage + 1;

      if (imageNumber >= 1 && imageNumber <= TOTAL_PIECES) {
        onImageClick(imageNumber);
      }
    };

    const handleCanvasMouseMove = (event: PointerEvent) => {
      if (!visibleRef.current || !viewer.viewport) return;

      const rect = (viewer.canvas as HTMLElement).getBoundingClientRect();
      const pixelX = event.clientX - rect.left;
      const pixelY = event.clientY - rect.top;

      const webPoint = new OpenSeadragon.Point(pixelX, pixelY);
      const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
      const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

      const col = Math.floor((imagePoint.x - SOURCE_OFFSETS.left) / PIECE_IMAGE_WIDTH);
      const row = Math.floor((imagePoint.y - SOURCE_OFFSETS.top) / PIECE_IMAGE_HEIGHT);

      if (col < 0 || col >= PIECE_COLUMNS || row < 0 || row >= PIECE_ROWS) {
        if (hoveredCell !== null) {
          hoveredCell = null;
          scheduleGridDraw("update-viewport");
        }
        return;
      }

      if (!hoveredCell || hoveredCell.col !== col || hoveredCell.row !== row) {
        hoveredCell = { col, row };
        scheduleGridDraw("update-viewport");
      }
    };

    const handleCanvasMouseLeave = () => {
      if (hoveredCell !== null) {
        hoveredCell = null;
        scheduleGridDraw("update-viewport");
      }
    };

    // In MINIMAL_MODE, skip all custom handlers to test raw OSD performance
    if (MINIMAL_MODE) {
      console.info("[OSD] MINIMAL_MODE enabled - skipping all custom handlers");
      viewerRef.current = viewer;
      if (externalViewerRef) externalViewerRef.current = viewer;
      
      return () => {
        gridCanvasDiv.remove();
        viewer.destroy();
        viewerRef.current = null;
        if (externalViewerRef) externalViewerRef.current = null;
      };
    }
    
    viewer.addHandler("open", handleOpen);
    if (USE_UPDATE_VIEWPORT_EVENT) {
      // Synchronous draw inside OSD's render loop — no RAF delay
      viewer.addHandler("update-viewport", handleUpdateViewport);
    }
    viewer.addHandler("resize", handleResize);
    viewer.addHandler("canvas-click", handleCanvasClick);
    window.addEventListener("resize", handleWindowResize, { passive: true });
    
    // OSD-level performance logging
    let osdPerfLastLogAt = performance.now();
    let osdPerfTileLoads = 0;
    let osdPerfTileLoadErrors = 0;
    let osdPerfUpdateViewportCalls = 0;
    
    const logOsdPerf = () => {
      if (!OSD_PERF_LOG_ENABLED) return;
      const now = performance.now();
      if (now - osdPerfLastLogAt < OSD_PERF_LOG_EVERY_MS) return;
      
      const elapsedSec = (now - osdPerfLastLogAt) / 1000;
      const zoom = viewer.viewport?.getZoom(true) ?? 0;
      const imageZoom = viewer.world?.getItemAt(0)?.viewportToImageZoom(zoom) ?? 0;
      const tiledImage = viewer.world?.getItemAt(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tilesLoaded = (tiledImage as any)?._tileCache?.numTilesLoaded?.() ?? "?";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tilesTotal = (tiledImage as any)?._tileCache?.numTiles?.() ?? "?";
      
      // Check canvas element count and size
      const canvases = viewer.element?.querySelectorAll("canvas") ?? [];
      let totalCanvasPixels = 0;
      canvases.forEach((c: Element) => {
        const canvas = c as HTMLCanvasElement;
        totalCanvasPixels += canvas.width * canvas.height;
      });
      
      console.info("[OSD Perf]", {
        elapsedSec: Number(elapsedSec.toFixed(1)),
        viewportZoom: Number(zoom.toFixed(4)),
        imageZoom: Number(imageZoom.toFixed(4)),
        tileLoadsThisWindow: osdPerfTileLoads,
        tileLoadErrors: osdPerfTileLoadErrors,
        updateViewportCalls: osdPerfUpdateViewportCalls,
        tilesLoaded,
        tilesTotal,
        canvasCount: canvases.length,
        totalCanvasMegapixels: Number((totalCanvasPixels / 1_000_000).toFixed(2)),
        containerSize: `${viewer.container?.clientWidth}x${viewer.container?.clientHeight}`,
      });
      
      osdPerfLastLogAt = now;
      osdPerfTileLoads = 0;
      osdPerfTileLoadErrors = 0;
      osdPerfUpdateViewportCalls = 0;
    };
    
    viewer.addHandler("tile-loaded", () => {
      osdPerfTileLoads++;
      logOsdPerf();
    });
    viewer.addHandler("tile-load-failed", () => {
      osdPerfTileLoadErrors++;
      logOsdPerf();
    });
    viewer.addHandler("update-viewport", () => {
      osdPerfUpdateViewportCalls++;
      logOsdPerf();
    });
    
    // Attach pointer events to viewer.canvas for continuous 60fps during drag
    const osdCanvas = viewer.canvas as HTMLElement;
    osdCanvas.addEventListener("pointerdown", handlePointerDown);
    osdCanvas.addEventListener("pointerup", handlePointerUp);
    osdCanvas.addEventListener("pointerleave", handlePointerLeave);
    osdCanvas.addEventListener("pointercancel", handlePointerUp);
    // Hover highlight events
    osdCanvas.addEventListener("pointermove", handleCanvasMouseMove);
    osdCanvas.addEventListener("pointerleave", handleCanvasMouseLeave);

    viewerRef.current = viewer;
    if (externalViewerRef) externalViewerRef.current = viewer;

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      osdCanvas.removeEventListener("pointerdown", handlePointerDown);
      osdCanvas.removeEventListener("pointerup", handlePointerUp);
      osdCanvas.removeEventListener("pointerleave", handlePointerLeave);
      osdCanvas.removeEventListener("pointercancel", handlePointerUp);
      osdCanvas.removeEventListener("pointermove", handleCanvasMouseMove);
      osdCanvas.removeEventListener("pointerleave", handleCanvasMouseLeave);
      viewer.removeHandler("open", handleOpen);
      if (USE_UPDATE_VIEWPORT_EVENT) {
        viewer.removeHandler("update-viewport", handleUpdateViewport);
      }
      viewer.removeHandler("resize", handleResize);
      viewer.removeHandler("canvas-click", handleCanvasClick);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (continuousRafId !== null) {
        cancelAnimationFrame(continuousRafId);
        continuousRafId = null;
      }
      maybeLogBenchmark(true);
      drawGridRef.current = null;
      gridCanvasDiv.remove();
      viewer.destroy();
      viewerRef.current = null;
      if (externalViewerRef) externalViewerRef.current = null;
      // Restore console.assert on cleanup
      console.assert = originalAssert;
    };
  }, [onImageClick, externalViewerRef]);

  // Opacity for the internal OSD canvas is synchronized from `visible` above.

  // Keep OSD pre-zoomed while hidden so swap stays seamless.
  // The target zoom only depends on viewport size, not scroll position.
  // When visible=true, user can freely zoom/pan.
  useEffect(() => {
    if (visible) return; // user controls zoom when OSD is active

    const matchZoom = () => {
      const v = viewerRef.current;
      if (!v || !v.viewport) return;
      try {
        applyParticleMatchZoom(v);
      } catch {
        // OSD not ready
      }
    };

    // Match once now and on viewport resize.
    matchZoom();
    window.addEventListener("resize", matchZoom, { passive: true });
    return () => {
      window.removeEventListener("resize", matchZoom);
    };
  }, [visible]);

  return (
    <div
      ref={containerRef}
      id="openseadragonWrapper"
      className="openseadragon"
      style={{
        height: "100vh",
        width: "80%",
        marginLeft: "10%",
        position: "relative",
        zIndex: 10,
      }}
    />
  );
}
