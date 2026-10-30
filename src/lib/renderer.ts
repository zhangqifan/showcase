import type { BackgroundRenderConfig } from './background';
import type { ContentAlignment, ContentMode } from './constants';
import type { FrameConfig } from "./frames";

export interface RenderOptions {
  frameScale: number;
  frameOffsetX: number;
  frameOffsetY: number;
  background: BackgroundRenderConfig;
  /** Defaults to `scaleAspectFill`. */
  contentMode?: ContentMode;
  /** Defaults to `center`; ignored by `scaleToFill`. */
  contentAlignment?: ContentAlignment;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BackgroundTransitionOptions {
  fromBackground: BackgroundRenderConfig;
  fromBackgroundImage?: CanvasImageSource | null;
  progress: number;
  toZoomFrom?: number;
  toZoomTo?: number;
}

/** Base fill: at scale 1.0 the frame's longest dimension = 85% of canvas */
const BASE_FILL = 0.85;

type CornerRadii = [number, number, number, number];

export interface FrameLayout {
  /** Frame bounds in canvas units. */
  frame: Rect;
  /** Screen opening in canvas units. */
  screen: Rect;
  /** Canvas units per frame pixel. */
  frameFitScale: number;
}

/** Places the frame on a `size × size` canvas: centered, scaled, then offset by the user's drag. */
export function layoutFrame(
  size: number,
  frameConfig: FrameConfig,
  transform: Pick<RenderOptions, "frameScale" | "frameOffsetX" | "frameOffsetY">,
): FrameLayout {
  const frameFitScale = size * BASE_FILL * transform.frameScale / Math.max(frameConfig.width, frameConfig.height);
  const w = frameConfig.width * frameFitScale;
  const h = frameConfig.height * frameFitScale;
  const x = (size - w) / 2 + transform.frameOffsetX;
  const y = (size - h) / 2 + transform.frameOffsetY;
  const { screen } = frameConfig;
  return {
    frame: { x, y, w, h },
    screen: {
      x: x + screen.x * frameFitScale,
      y: y + screen.y * frameFitScale,
      w: screen.w * frameFitScale,
      h: screen.h * frameFitScale,
    },
    frameFitScale,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

const ALIGNMENT_FACTORS: Record<ContentAlignment, [number, number]> = {
  topLeft: [0, 0],
  top: [0.5, 0],
  topRight: [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  bottomLeft: [0, 1],
  bottom: [0.5, 1],
  bottomRight: [1, 1],
};

/**
 * Places content of `contentW × contentH` source pixels inside `screen`.
 * `pixelScale` maps one source pixel to canvas units, so `original` and `tile`
 * keep content at the device's native pixel density.
 * For `tile`, the returned rect is the anchor tile that the pattern repeats from.
 */
export function layoutContent(
  mode: ContentMode,
  alignment: ContentAlignment,
  contentW: number,
  contentH: number,
  screen: Rect,
  pixelScale: number,
): Rect {
  if (mode === "scaleToFill") return { ...screen };

  let w: number, h: number;
  if (mode === "original" || mode === "tile") {
    w = contentW * pixelScale;
    h = contentH * pixelScale;
  } else {
    const widthRatio = screen.w / contentW;
    const heightRatio = screen.h / contentH;
    const ratio = mode === "scaleAspectFit"
      ? Math.min(widthRatio, heightRatio)
      : Math.max(widthRatio, heightRatio);
    w = contentW * ratio;
    h = contentH * ratio;
  }

  const [ax, ay] = ALIGNMENT_FACTORS[alignment];
  return {
    x: screen.x + (screen.w - w) * ax,
    y: screen.y + (screen.h - h) * ay,
    w,
    h,
  };
}

function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  size: number,
  background: BackgroundRenderConfig,
  backgroundImage: CanvasImageSource | null,
  alpha = 1,
  scale = 1
) {
  if (alpha <= 0) return;

  const drawSize = size * scale;
  const drawX = (size - drawSize) / 2;
  const drawY = (size - drawSize) / 2;

  ctx.save();
  if (alpha < 1) {
    ctx.globalAlpha *= alpha;
  }

  if (background.mode === 'staticMeshGradient' && backgroundImage) {
    ctx.drawImage(backgroundImage, drawX, drawY, drawSize, drawSize);
  } else if (background.solidColor !== "transparent") {
    ctx.fillStyle = background.solidColor;
    ctx.fillRect(drawX, drawY, drawSize, drawSize);
  }

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | CornerRadii,
) {
  const [topLeft, topRight, bottomRight, bottomLeft] =
    typeof radius === "number"
      ? [radius, radius, radius, radius]
      : radius;

  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + w - topRight, y);
  ctx.arcTo(x + w, y, x + w, y + topRight, topRight);
  ctx.lineTo(x + w, y + h - bottomRight);
  ctx.arcTo(x + w, y + h, x + w - bottomRight, y + h, bottomRight);
  ctx.lineTo(x + bottomLeft, y + h);
  ctx.arcTo(x, y + h, x, y + h - bottomLeft, bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.arcTo(x, y, x + topLeft, y, topLeft);
  ctx.closePath();
}

export function render(
  ctx: CanvasRenderingContext2D,
  size: number,
  frameImage: HTMLImageElement | null,
  frameConfig: FrameConfig,
  content: HTMLImageElement | HTMLVideoElement | null,
  options: RenderOptions,
  backgroundImage: CanvasImageSource | null = null,
  backgroundTransition: BackgroundTransitionOptions | null = null
) {
  const {
    background,
    contentMode = "scaleAspectFill",
    contentAlignment = "center",
  } = options;

  // 1. Clear and fill background
  ctx.clearRect(0, 0, size, size);
  if (backgroundTransition) {
    const progress = clamp01(backgroundTransition.progress);
    const toZoom = lerp(backgroundTransition.toZoomFrom ?? 1.02, backgroundTransition.toZoomTo ?? 1, progress);
    drawBackgroundLayer(
      ctx,
      size,
      backgroundTransition.fromBackground,
      backgroundTransition.fromBackgroundImage ?? null,
      1 - progress,
      1
    );
    drawBackgroundLayer(ctx, size, background, backgroundImage, progress, toZoom);
  } else {
    drawBackgroundLayer(ctx, size, background, backgroundImage, 1, 1);
  }

  if (!frameImage) return;

  // 2. Place the frame and its screen opening
  const layout = layoutFrame(size, frameConfig, options);
  const { frameFitScale } = layout;
  const { x: phoneX, y: phoneY, w: phoneW, h: phoneH } = layout.frame;
  const { x: scrX, y: scrY, w: scrW, h: scrH } = layout.screen;
  const screen = frameConfig.screen;
  const scrR: number | CornerRadii = typeof screen.radius === "number"
    ? screen.radius * frameFitScale
    : [
        screen.radius[0] * frameFitScale,
        screen.radius[1] * frameFitScale,
        screen.radius[2] * frameFitScale,
        screen.radius[3] * frameFitScale,
      ];

  // 3. Fill screen background (dark — like a real phone screen)
  ctx.save();
  drawRoundedRect(ctx, scrX, scrY, scrW, scrH, scrR);
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.restore();

  // 4. Draw content; the empty-state hint is an HTML overlay in Preview
  if (content) {
    const cw =
      content instanceof HTMLVideoElement
        ? content.videoWidth
        : content.naturalWidth;
    const ch =
      content instanceof HTMLVideoElement
        ? content.videoHeight
        : content.naturalHeight;

    if (cw > 0 && ch > 0) {
      ctx.save();
      drawRoundedRect(ctx, scrX, scrY, scrW, scrH, scrR);
      ctx.clip();

      const rect = layoutContent(
        contentMode,
        contentAlignment,
        cw,
        ch,
        { x: scrX, y: scrY, w: scrW, h: scrH },
        frameFitScale,
      );

      if (contentMode === "tile") {
        const pattern = ctx.createPattern(content, "repeat");
        if (pattern) {
          // Pattern space starts at the anchor tile, scaled to native pixel density.
          pattern.setTransform({
            a: rect.w / cw,
            b: 0,
            c: 0,
            d: rect.h / ch,
            e: rect.x,
            f: rect.y,
          });
          ctx.fillStyle = pattern;
          ctx.fillRect(scrX, scrY, scrW, scrH);
        }
      } else {
        ctx.drawImage(content, rect.x, rect.y, rect.w, rect.h);
      }
      ctx.restore();
    }
  }

  // 5. Draw the frame on top
  ctx.drawImage(frameImage, phoneX, phoneY, phoneW, phoneH);
}
