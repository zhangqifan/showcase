import { createBackgroundRenderConfig } from '$lib/background';
import type { RenderOptions } from '$lib/renderer';
import { store } from '$lib/state.svelte';
import { CANVAS_SIZE } from '$lib/constants';

export function getBackgroundRenderConfig() {
  return createBackgroundRenderConfig(
    store.backgroundMode,
    store.backgroundColor,
    store.staticMeshGradient
  );
}

/** 构建导出用的渲染选项（offset 按目标分辨率缩放） */
export function getExportRenderOptions(resolution: number): RenderOptions {
  const scale = resolution / CANVAS_SIZE;
  return {
    frameScale: store.frameScale,
    frameOffsetX: store.frameOffsetX * scale,
    frameOffsetY: store.frameOffsetY * scale,
    background: getBackgroundRenderConfig()
  };
}
