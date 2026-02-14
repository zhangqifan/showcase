<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { store } from '$lib/state.svelte';
  import { FRAMES, getFrameUrl } from '$lib/frames';
  import { render } from '$lib/renderer';
  import { getRenderOptions } from '$lib/options';
  import { CANVAS_SIZE } from '$lib/constants';
  import { exportImage, exportVideoMP4 } from '$lib/export.service';

  let containerEl: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ctx = $state<CanvasRenderingContext2D | null>(null);
  let frameImage = $state<HTMLImageElement | null>(null);
  let contentElement = $state<HTMLImageElement | HTMLVideoElement | null>(null);
  let videoEl: HTMLVideoElement | null = null;
  let rafId = 0;
  let wrapperSize = $state(400);
  let resizeObserver: ResizeObserver | null = null;

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
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
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

  // ====================== Frame ======================

  $effect(() => {
    const url = getFrameUrl(store.model, store.color);
    if (!url) return;
    const img = new Image();
    img.onload = () => { frameImage = img; };
    img.src = url;
  });

  // ====================== Content ======================

  $effect(() => {
    const url = store.contentUrl;
    const type = store.contentType;
    cleanupVideo();
    cancelAnimationFrame(rafId);
    if (!url || !type) { contentElement = null; return; }

    if (type === 'image') {
      const img = new Image();
      img.onload = () => { contentElement = img; };
      img.src = url;
    } else if (type === 'video') {
      const v = document.createElement('video');
      v.src = url;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = () => { contentElement = v; v.play(); };
      videoEl = v;
    }
  });

  // ====================== Render ======================

  $effect(() => {
    if (!ctx || !frameImage) return;
    const fc = FRAMES[store.model];
    if (!fc) return;

    const opts = getRenderOptions();
    const deps = [
      contentElement,
      store.frameScale,
      store.frameOffsetX,
      store.frameOffsetY,
      store.backgroundColor
    ];

    if (store.contentType === 'video' && contentElement) {
      let active = true;
      function loop() {
        if (!active || !ctx || !frameImage) return;
        render(ctx, CANVAS_SIZE, frameImage, fc, contentElement, opts);
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      void deps;
      return () => { active = false; cancelAnimationFrame(rafId); };
    }

    void deps;
    render(ctx, CANVAS_SIZE, frameImage, fc, contentElement, opts);
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
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = store.frameOffsetX;
    dragStartOffsetY = store.frameOffsetY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const s = CANVAS_SIZE / wrapperSize;
    store.frameOffsetX = dragStartOffsetX + (e.clientX - dragStartX) * s;
    store.frameOffsetY = dragStartOffsetY + (e.clientY - dragStartY) * s;
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = 'grab';
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
