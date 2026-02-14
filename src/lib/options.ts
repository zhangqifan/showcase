import type { RenderOptions } from '$lib/renderer';
import { store } from '$lib/state.svelte';
import { CANVAS_SIZE } from '$lib/constants';

/** 从 store 构建渲染选项 */
export function getRenderOptions(): RenderOptions {
  return {
    frameScale: store.frameScale,
    frameOffsetX: store.frameOffsetX,
    frameOffsetY: store.frameOffsetY,
    backgroundColor: store.backgroundColor
  };
}

/** 构建导出用的渲染选项（offset 按目标分辨率缩放） */
export function getExportRenderOptions(resolution: number): RenderOptions {
  const { x, y } = store.scaleOffsetForExport(resolution);
  return {
    frameScale: store.frameScale,
    frameOffsetX: x,
    frameOffsetY: y,
    backgroundColor: store.backgroundColor
  };
}

export { CANVAS_SIZE };
