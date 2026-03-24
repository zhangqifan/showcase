import type { BackgroundRenderConfig } from './background';
import type { FrameModel } from "./frames";

export interface RenderOptions {
  frameScale: number;
  frameOffsetX: number;
  frameOffsetY: number;
  background: BackgroundRenderConfig;
}

/** Base fill: at scale 1.0 the phone height = 85% of canvas */
const BASE_FILL = 0.85;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function render(
  ctx: CanvasRenderingContext2D,
  size: number,
  frameImage: HTMLImageElement | null,
  frameConfig: FrameModel,
  content: HTMLImageElement | HTMLVideoElement | null,
  options: RenderOptions,
  backgroundImage: CanvasImageSource | null = null
) {
  const {
    frameScale,
    frameOffsetX,
    frameOffsetY,
    background,
  } = options;

  // 1. Clear and fill background
  ctx.clearRect(0, 0, size, size);
  if (background.mode === 'staticMeshGradient' && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, size, size);
  } else if (background.solidColor !== "transparent") {
    ctx.fillStyle = background.solidColor;
    ctx.fillRect(0, 0, size, size);
  }

  if (!frameImage) return;

  // 2. Calculate phone size using base fit * multiplier
  const effectiveScale = BASE_FILL * frameScale;
  const frameAspect = frameConfig.width / frameConfig.height;

  // Phone is portrait — height is the constraining dimension
  const phoneH = size * effectiveScale;
  const phoneW = phoneH * frameAspect;

  // 3. Position phone: centered + user drag offset
  const phoneX = (size - phoneW) / 2 + frameOffsetX;
  const phoneY = (size - phoneH) / 2 + frameOffsetY;

  // 4. Calculate screen area in canvas coordinates
  const sx = phoneW / frameConfig.width;
  const sy = phoneH / frameConfig.height;
  const screen = frameConfig.screen;

  const scrX = phoneX + screen.x * sx;
  const scrY = phoneY + screen.y * sy;
  const scrW = screen.w * sx;
  const scrH = screen.h * sy;
  const scrR = screen.radius * Math.min(sx, sy);
  const frameR = Math.min(phoneW, phoneH) * 0.08;

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
