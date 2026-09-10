import type { BackgroundRenderConfig } from './background';
import type { FrameModel } from "./frames";

export interface RenderOptions {
  frameScale: number;
  frameOffsetX: number;
  frameOffsetY: number;
  background: BackgroundRenderConfig;
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
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
  frameConfig: FrameModel,
  content: HTMLImageElement | HTMLVideoElement | null,
  options: RenderOptions,
  backgroundImage: CanvasImageSource | null = null,
  backgroundTransition: BackgroundTransitionOptions | null = null
) {
  const {
    frameScale,
    frameOffsetX,
    frameOffsetY,
    background,
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

  // 2. Calculate phone size using base fit * multiplier
  const effectiveScale = BASE_FILL * frameScale;
  const frameFitScale = size * effectiveScale / Math.max(frameConfig.width, frameConfig.height);
  const phoneW = frameConfig.width * frameFitScale;
  const phoneH = frameConfig.height * frameFitScale;

  // 3. Position phone: centered + user drag offset
  const phoneX = (size - phoneW) / 2 + frameOffsetX;
  const phoneY = (size - phoneH) / 2 + frameOffsetY;

  // 4. Calculate screen area in canvas coordinates
  const screen = frameConfig.screen;

  const scrX = phoneX + screen.x * frameFitScale;
  const scrY = phoneY + screen.y * frameFitScale;
  const scrW = screen.w * frameFitScale;
  const scrH = screen.h * frameFitScale;
  const scrR: number | CornerRadii = typeof screen.radius === "number"
    ? screen.radius * frameFitScale
    : [
        screen.radius[0] * frameFitScale,
        screen.radius[1] * frameFitScale,
        screen.radius[2] * frameFitScale,
        screen.radius[3] * frameFitScale,
      ];

  // 5. Fill screen background (dark — like a real phone screen)
  ctx.save();
  drawRoundedRect(ctx, scrX, scrY, scrW, scrH, scrR);
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.restore();

  // 6. Draw content or placeholder
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

      const cAspect = cw / ch;
      const sAspect = scrW / scrH;

      let drawW: number, drawH: number;
      if (cAspect > sAspect) {
        // Content wider → match height
        drawH = scrH;
        drawW = drawH * cAspect;
      } else {
        // Content taller → match width
        drawW = scrW;
        drawH = drawW / cAspect;
      }

      // Always centered within screen
      const drawX = scrX + (scrW - drawW) / 2;
      const drawY = scrY + (scrH - drawH) / 2;

      ctx.drawImage(content, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  } else {
    // 无内容时显示占位提示
    ctx.save();
    drawRoundedRect(ctx, scrX, scrY, scrW, scrH, scrR);
    ctx.clip();

    const centerX = scrX + scrW / 2;
    const centerY = scrY + scrH / 2;
    const base = Math.min(scrW, scrH);
    const iconSize = base * 0.048;
    const armLen = iconSize / 2;
    const iconY = centerY - base * 0.06;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = iconSize * 0.1;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(centerX - armLen, iconY);
    ctx.lineTo(centerX + armLen, iconY);
    ctx.moveTo(centerX, iconY - armLen);
    ctx.lineTo(centerX, iconY + armLen);
    ctx.stroke();

    const fontSize = base * 0.035;
    const lineGap = base * 0.025;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText("上传图片或视频", centerX, centerY + lineGap / 2);

    ctx.font = `400 ${fontSize * 0.9}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillText("拖拽至此处或从右侧上传", centerX, centerY + lineGap / 2 + fontSize + lineGap);

    ctx.restore();
  }

  // 7. Draw phone frame overlay on top
  ctx.drawImage(frameImage, phoneX, phoneY, phoneW, phoneH);
}
