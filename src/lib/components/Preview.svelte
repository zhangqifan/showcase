<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import type { BackgroundRenderConfig } from '$lib/background';
  import { prepareBackgroundImage } from '$lib/background-renderer';
  import { store } from '$lib/state.svelte';
  import { FRAMES, getFrameUrl } from '$lib/frames';
  import { render, type BackgroundTransitionOptions } from '$lib/renderer';
  import { getBackgroundRenderConfig } from '$lib/options';
  import { CANVAS_SIZE } from '$lib/constants';
  import { exportImage, exportVideoMP4 } from '$lib/export.service';

  interface TransformValues {
    frameScale: number;
    frameOffsetX: number;
    frameOffsetY: number;
  }

  interface BackgroundLayer {
    key: string;
    config: BackgroundRenderConfig;
    image: CanvasImageSource | null;
  }

  const TRANSFORM_DURATION_MS = 170;
  const BACKGROUND_DURATION_MS = 260;
  const BACKGROUND_ZOOM_FROM = 1.02;
  const EPSILON = 0.0001;

  let containerEl: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ctx = $state<CanvasRenderingContext2D | null>(null);
  let frameImage = $state<HTMLImageElement | null>(null);
  let contentElement = $state<HTMLImageElement | HTMLVideoElement | null>(null);
  let currentBackgroundLayer = $state<BackgroundLayer | null>(null);
  let previousBackgroundLayer = $state<BackgroundLayer | null>(null);
  let backgroundTransitionProgress = $state(1);
  let animatedTransform = $state<TransformValues>({
    frameScale: store.frameScale,
    frameOffsetX: store.frameOffsetX,
    frameOffsetY: store.frameOffsetY
  });
  let prefersReducedMotion = $state(false);

  let videoEl: HTMLVideoElement | null = null;
  let rafId = 0;
  let needsRender = false;
  let wrapperSize = $state(400);
  let resizeObserver: ResizeObserver | null = null;

  let transformAnimationActive = false;
  let transformAnimationStart = 0;
  let transformFrom: TransformValues = {
    frameScale: store.frameScale,
    frameOffsetX: store.frameOffsetX,
    frameOffsetY: store.frameOffsetY
  };
  let transformTo: TransformValues = {
    frameScale: store.frameScale,
    frameOffsetX: store.frameOffsetX,
    frameOffsetY: store.frameOffsetY
  };

  let backgroundAnimationActive = false;
  let backgroundAnimationStart = 0;
  let backgroundRequestToken = 0;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffsetX = 0;
  let dragStartOffsetY = 0;

  // ====================== Lifecycle ======================

  onMount(() => {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx = canvas.getContext('2d');
    store.exportFn = (res, fmt) => handleExport(res, fmt);
    updateWrapperSize();
    resizeObserver = new ResizeObserver(updateWrapperSize);
    resizeObserver.observe(containerEl);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    syncReducedMotionPreference(mediaQuery.matches);

    const onMotionChange = (event: MediaQueryListEvent) => {
      syncReducedMotionPreference(event.matches);
    };
    const onLegacyMotionChange = (event: MediaQueryListEvent) => {
      syncReducedMotionPreference(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMotionChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onLegacyMotionChange);
    }
    requestRender();

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onMotionChange);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(onLegacyMotionChange);
      }
    };
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    cleanupVideo();
    resizeObserver?.disconnect();
    store.exportFn = null;
  });

  function updateWrapperSize() {
    if (!containerEl) return;
    const pad = 48;
    const r = containerEl.getBoundingClientRect();
    wrapperSize = Math.max(100, Math.floor(Math.min(r.width - pad * 2, r.height - pad * 2)));
  }

  function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  function lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  function easeOutCubic(value: number): number {
    return 1 - (1 - value) ** 3;
  }

  function easeInOutCubic(value: number): number {
    if (value < 0.5) return 4 * value ** 3;
    return 1 - ((-2 * value + 2) ** 3) / 2;
  }

  function getNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  function isAlmostEqual(a: number, b: number): boolean {
    return Math.abs(a - b) < EPSILON;
  }

  function isSameTransform(a: TransformValues, b: TransformValues): boolean {
    return (
      isAlmostEqual(a.frameScale, b.frameScale) &&
      isAlmostEqual(a.frameOffsetX, b.frameOffsetX) &&
      isAlmostEqual(a.frameOffsetY, b.frameOffsetY)
    );
  }

  function setAnimatedTransform(next: TransformValues): boolean {
    if (isSameTransform(animatedTransform, next)) return false;
    animatedTransform.frameScale = next.frameScale;
    animatedTransform.frameOffsetX = next.frameOffsetX;
    animatedTransform.frameOffsetY = next.frameOffsetY;
    return true;
  }

  function startTransformAnimation(target: TransformValues) {
    if (isSameTransform(animatedTransform, target)) {
      transformAnimationActive = false;
      return;
    }

    if (prefersReducedMotion) {
      transformAnimationActive = false;
      if (setAnimatedTransform(target)) {
        requestRender();
      }
      return;
    }

    if (transformAnimationActive && isSameTransform(transformTo, target)) return;

    transformFrom = {
      frameScale: animatedTransform.frameScale,
      frameOffsetX: animatedTransform.frameOffsetX,
      frameOffsetY: animatedTransform.frameOffsetY
    };
    transformTo = { ...target };
    transformAnimationStart = getNow();
    transformAnimationActive = true;
    requestRender();
  }

  function syncReducedMotionPreference(enabled: boolean) {
    const changed = prefersReducedMotion !== enabled;
    prefersReducedMotion = enabled;

    if (!enabled) {
      if (changed) requestRender();
      return;
    }

    transformAnimationActive = false;
    backgroundAnimationActive = false;
    previousBackgroundLayer = null;
    backgroundTransitionProgress = 1;
    setAnimatedTransform({
      frameScale: store.frameScale,
      frameOffsetX: store.frameOffsetX,
      frameOffsetY: store.frameOffsetY
    });
    requestRender();
  }

  function getBackgroundLayerKey(background: BackgroundRenderConfig): string {
    if (background.mode === 'solid') return `solid:${background.solidColor}`;
    return `mesh:${JSON.stringify(background.staticMeshGradient)}`;
  }

  function cloneBackgroundImage(image: CanvasImageSource | null): CanvasImageSource | null {
    if (!image || typeof document === 'undefined') return image;
    const snapshot = document.createElement('canvas');
    snapshot.width = CANVAS_SIZE;
    snapshot.height = CANVAS_SIZE;
    const snapshotContext = snapshot.getContext('2d');
    if (!snapshotContext) return image;
    snapshotContext.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return snapshot;
  }

  function cloneBackgroundLayer(layer: BackgroundLayer | null): BackgroundLayer | null {
    if (!layer) return null;
    return {
      key: layer.key,
      config: layer.config,
      image: cloneBackgroundImage(layer.image)
    };
  }

  function applyBackgroundLayer(
    layer: BackgroundLayer,
    errorMessage: string | null,
    transitionFrom: BackgroundLayer | null = null,
    shouldAnimate = true
  ) {
    store.setBackgroundError(errorMessage);

    const current = currentBackgroundLayer;
    if (!current) {
      currentBackgroundLayer = layer;
      previousBackgroundLayer = null;
      backgroundTransitionProgress = 1;
      backgroundAnimationActive = false;
      requestRender();
      return;
    }

    if (current.key === layer.key) {
      currentBackgroundLayer = layer;
      previousBackgroundLayer = null;
      backgroundTransitionProgress = 1;
      backgroundAnimationActive = false;
      requestRender();
      return;
    }

    if (prefersReducedMotion || !shouldAnimate) {
      currentBackgroundLayer = layer;
      previousBackgroundLayer = null;
      backgroundTransitionProgress = 1;
      backgroundAnimationActive = false;
      requestRender();
      return;
    }

    previousBackgroundLayer = transitionFrom ?? cloneBackgroundLayer(current);
    currentBackgroundLayer = layer;
    backgroundTransitionProgress = 0;
    backgroundAnimationStart = getNow();
    backgroundAnimationActive = true;
    requestRender();
  }

  function stepAnimations(timestamp: number): boolean {
    let changed = false;

    if (transformAnimationActive) {
      const t = clamp01((timestamp - transformAnimationStart) / TRANSFORM_DURATION_MS);
      const eased = easeOutCubic(t);
      changed =
        setAnimatedTransform({
          frameScale: lerp(transformFrom.frameScale, transformTo.frameScale, eased),
          frameOffsetX: lerp(transformFrom.frameOffsetX, transformTo.frameOffsetX, eased),
          frameOffsetY: lerp(transformFrom.frameOffsetY, transformTo.frameOffsetY, eased)
        }) || changed;

      if (t >= 1) {
        transformAnimationActive = false;
        changed = setAnimatedTransform(transformTo) || changed;
      }
    }

    if (backgroundAnimationActive) {
      const t = clamp01((timestamp - backgroundAnimationStart) / BACKGROUND_DURATION_MS);
      const eased = easeInOutCubic(t);
      if (!isAlmostEqual(backgroundTransitionProgress, eased)) {
        backgroundTransitionProgress = eased;
        changed = true;
      }

      if (t >= 1) {
        backgroundAnimationActive = false;
        previousBackgroundLayer = null;
        backgroundTransitionProgress = 1;
        changed = true;
      }
    }

    return changed;
  }

  function isVideoContent(): boolean {
    return store.contentType === 'video' && contentElement instanceof HTMLVideoElement;
  }

  function hasContinuousRender(): boolean {
    return transformAnimationActive || backgroundAnimationActive || isVideoContent();
  }

  function requestRender() {
    needsRender = true;
    if (rafId !== 0) return;
    rafId = requestAnimationFrame(runRenderLoop);
  }

  function runRenderLoop(timestamp: number) {
    rafId = 0;
    const animationChanged = stepAnimations(timestamp);
    if (needsRender || animationChanged || isVideoContent()) {
      drawPreview();
      needsRender = false;
    }

    if (needsRender || hasContinuousRender()) {
      rafId = requestAnimationFrame(runRenderLoop);
    }
  }

  function getBackgroundTransition(): BackgroundTransitionOptions | null {
    if (!previousBackgroundLayer || backgroundTransitionProgress >= 1 - EPSILON) return null;
    return {
      fromBackground: previousBackgroundLayer.config,
      fromBackgroundImage: previousBackgroundLayer.image,
      progress: backgroundTransitionProgress,
      toZoomFrom: BACKGROUND_ZOOM_FROM,
      toZoomTo: 1
    };
  }

  function drawPreview() {
    if (!ctx || !frameImage) return;
    const frameConfig = FRAMES[store.model];
    if (!frameConfig) return;

    const background = currentBackgroundLayer?.config ?? getBackgroundRenderConfig();
    render(
      ctx,
      CANVAS_SIZE,
      frameImage,
      frameConfig,
      contentElement,
      {
        frameScale: animatedTransform.frameScale,
        frameOffsetX: animatedTransform.frameOffsetX,
        frameOffsetY: animatedTransform.frameOffsetY,
        background
      },
      currentBackgroundLayer?.image ?? null,
      getBackgroundTransition()
    );
  }

  // ====================== Frame ======================

  $effect(() => {
    const url = getFrameUrl(store.model, store.color);
    if (!url) return;
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      frameImage = img;
      requestRender();
    };
    img.src = url;
    return () => {
      active = false;
    };
  });

  // ====================== Content ======================

  $effect(() => {
    const url = store.contentUrl;
    const type = store.contentType;
    cleanupVideo();
    if (!url || !type) {
      contentElement = null;
      requestRender();
      return;
    }

    if (type === 'image') {
      let active = true;
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        contentElement = img;
        requestRender();
      };
      img.src = url;
      return () => {
        active = false;
      };
    } else if (type === 'video') {
      let active = true;
      const v = document.createElement('video');
      v.src = url;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = () => {
        if (!active) return;
        contentElement = v;
        void v.play();
        requestRender();
      };
      videoEl = v;
      return () => {
        active = false;
      };
    }
  });

  // ====================== Render ======================

  $effect(() => {
    const targetTransform: TransformValues = {
      frameScale: store.frameScale,
      frameOffsetX: store.frameOffsetX,
      frameOffsetY: store.frameOffsetY
    };

    untrack(() => {
      if (isDragging || prefersReducedMotion) {
        transformAnimationActive = false;
        if (setAnimatedTransform(targetTransform)) {
          requestRender();
        }
        return;
      }

      startTransformAnimation(targetTransform);
    });
  });

  $effect(() => {
    const background = getBackgroundRenderConfig();
    const shouldAnimate = untrack(() => !store.consumeBackgroundTransitionSkip());
    const key = getBackgroundLayerKey(background);
    const requestToken = ++backgroundRequestToken;
    const transitionSnapshot = untrack(() => {
      return currentBackgroundLayer && currentBackgroundLayer.key !== key
        ? cloneBackgroundLayer(currentBackgroundLayer)
        : null;
    });
    let active = true;

    if (background.mode !== 'staticMeshGradient') {
      untrack(() => {
        applyBackgroundLayer(
          { key, config: background, image: null },
          null,
          transitionSnapshot,
          shouldAnimate
        );
      });
      return () => {
        active = false;
      };
    }

    void prepareBackgroundImage(background, CANVAS_SIZE)
      .then((result) => {
        if (!active || requestToken !== backgroundRequestToken) return;
        applyBackgroundLayer(
          { key, config: background, image: result.image },
          result.errorMessage,
          transitionSnapshot,
          shouldAnimate
        );
      })
      .catch((error: unknown) => {
        if (!active || requestToken !== backgroundRequestToken) return;
        console.error('Background render failed:', error);
        applyBackgroundLayer(
          { key, config: background, image: null },
          error instanceof Error ? error.message : '背景渲染失败。',
          transitionSnapshot,
          shouldAnimate
        );
      });

    return () => {
      active = false;
    };
  });

  function cleanupVideo() {
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl = null;
    }
  }

  // ====================== Export ======================

  async function handleExport(resolution: number, format: 'png' | 'mp4') {
    if (!frameImage) return;
    const fc = FRAMES[store.model];
    if (!fc) return;

    try {
      const ctx = { frameImage, contentElement };
      if (format === 'mp4' && store.contentType === 'video' && store.contentUrl) {
        await exportVideoMP4(ctx, resolution);
      } else {
        await exportImage(ctx, resolution);
      }
    } catch (e: unknown) {
      store.exportProgress = -1;
      console.error('Export failed:', e);
      alert('导出失败: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ====================== Drag ======================

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    transformAnimationActive = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = animatedTransform.frameOffsetX;
    dragStartOffsetY = animatedTransform.frameOffsetY;
    store.frameOffsetX = dragStartOffsetX;
    store.frameOffsetY = dragStartOffsetY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    requestRender();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const s = CANVAS_SIZE / wrapperSize;
    const nextX = dragStartOffsetX + (e.clientX - dragStartX) * s;
    const nextY = dragStartOffsetY + (e.clientY - dragStartY) * s;
    animatedTransform.frameOffsetX = nextX;
    animatedTransform.frameOffsetY = nextY;
    store.frameOffsetX = nextX;
    store.frameOffsetY = nextY;
    requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    canvas.style.cursor = 'grab';
    requestRender();
  }

  // ====================== Drop ======================

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    store.setContent(f);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }
</script>

<div
  class="preview-container"
  bind:this={containerEl}
  role="region"
  aria-label="预览区域"
  ondrop={handleDrop}
  ondragover={handleDragOver}
>
  <div class="canvas-wrapper" style="width:{wrapperSize}px;height:{wrapperSize}px">
    <canvas
      bind:this={canvas}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    ></canvas>
  </div>
</div>

<style>
  .preview-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .canvas-wrapper {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 8px 40px rgba(0,0,0,.07);
    background: #fff;
    flex-shrink: 0;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
    touch-action: none;
  }
  canvas:active { cursor: grabbing; }
</style>
