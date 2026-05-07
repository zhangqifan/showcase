import {
  ShaderFitOptions,
  ShaderMount,
  getShaderColorFromString,
  staticMeshGradientFragmentShader
} from '@paper-design/shaders';
import type { BackgroundRenderConfig, StaticMeshGradientConfig } from '$lib/background';

interface StaticMeshInstance {
  host: HTMLDivElement;
  mount: ShaderMount;
  snapshotCanvas: HTMLCanvasElement;
  lastSignature: string;
}

export interface BackgroundRenderResult {
  image: HTMLCanvasElement | null;
  errorMessage: string | null;
}

const staticMeshInstances = new Map<string, StaticMeshInstance>();
const staticMeshFallbackCache = new Map<string, HTMLCanvasElement>();
const STATIC_MESH_FALLBACK_ERROR = 'Mesh Gradient 渲染失败，已使用简化预览。';
const STATIC_MESH_WEBGL_FALLBACK_ERROR = '当前环境不支持 WebGL2，已使用简化 Mesh Gradient 预览。';

let webgl2SupportChecked = false;
let webgl2Supported = false;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function createHost(size: number): HTMLDivElement {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.width = `${size}px`;
  host.style.height = `${size}px`;
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.style.overflow = 'hidden';
  document.body.appendChild(host);
  return host;
}

function getInstanceKey(size: number, cacheKey?: string): string {
  return cacheKey ? `${size}:${cacheKey}` : `${size}`;
}

function checkWebgl2Support(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!webgl2SupportChecked) {
    const canvas = document.createElement('canvas');
    webgl2Supported = !!canvas.getContext('webgl2');
    webgl2SupportChecked = true;
  }
  return webgl2Supported;
}

export function isStaticMeshGradientSupported(): boolean {
  return checkWebgl2Support();
}

function destroyInstance(instanceKey: string) {
  const instance = staticMeshInstances.get(instanceKey);
  if (!instance) return;
  instance.mount.dispose();
  instance.snapshotCanvas.remove();
  instance.host.remove();
  staticMeshInstances.delete(instanceKey);
}

function getStaticMeshSignature(config: StaticMeshGradientConfig): string {
  return JSON.stringify(config);
}

function toCanvasColor(color: string, alphaMultiplier = 1): string {
  const [r, g, b, a] = getShaderColorFromString(color);
  const alpha = Math.max(0, Math.min(1, a * alphaMultiplier));
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

function createStaticMeshFallbackCanvas(
  size: number,
  config: StaticMeshGradientConfig,
  cacheKey?: string
): HTMLCanvasElement {
  const signature = getStaticMeshSignature(config);
  const key = `${getInstanceKey(size, cacheKey)}:fallback:${signature}`;
  const cached = staticMeshFallbackCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const [firstColor] = config.colors;
  context.fillStyle = toCanvasColor(firstColor ?? '#ffffff');
  context.fillRect(0, 0, size, size);

  const rotation = (config.rotation * Math.PI) / 180;
  const scale = Math.max(0.01, config.scale);
  const offsetX = config.offsetX * size * 0.22;
  const offsetY = config.offsetY * size * 0.22;
  const waveX = config.waveX;
  const waveY = config.waveY;
  const waveXShift = config.waveXShift * Math.PI * 2;
  const waveYShift = config.waveYShift * Math.PI * 2;

  context.save();
  context.translate(size / 2 + offsetX, size / 2 + offsetY);
  context.rotate(rotation);
  context.scale(scale, scale);
  context.translate(-size / 2, -size / 2);
  context.globalCompositeOperation = 'screen';

  for (let index = 0; index < config.colors.length; index += 1) {
    const color = config.colors[index] ?? '#ffffff';
    const seed = 0.33 * config.positions + index * 1.37;
    const xWave = waveX * Math.cos(seed * 2.1 + waveXShift + index * 0.35);
    const yWave = waveY * Math.sin(seed * 1.7 + waveYShift - index * 0.28);
    const cx = (0.5 + 0.34 * Math.sin(seed + xWave)) * size;
    const cy = (0.5 + 0.34 * Math.cos(seed + yWave)) * size;
    const radius = size * (0.24 + (1 - config.mixing) * 0.2 + (index % 4) * 0.03);
    const alpha = 0.52 + config.mixing * 0.36;

    const radial = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    radial.addColorStop(0, toCanvasColor(color, alpha));
    radial.addColorStop(1, toCanvasColor(color, 0));

    context.fillStyle = radial;
    context.fillRect(0, 0, size, size);
  }

  context.restore();
  staticMeshFallbackCache.set(key, canvas);

  if (staticMeshFallbackCache.size > 80) {
    const oldestKey = staticMeshFallbackCache.keys().next().value;
    if (oldestKey) staticMeshFallbackCache.delete(oldestKey);
  }

  return canvas;
}

function buildStaticMeshUniforms(config: StaticMeshGradientConfig) {
  return {
    u_colors: config.colors.map((color) => getShaderColorFromString(color)),
    u_colorsCount: config.colors.length,
    u_positions: config.positions,
    u_waveX: config.waveX,
    u_waveXShift: config.waveXShift,
    u_waveY: config.waveY,
    u_waveYShift: config.waveYShift,
    u_mixing: config.mixing,
    u_grainMixer: config.grainMixer,
    u_grainOverlay: config.grainOverlay,
    u_fit: ShaderFitOptions.none,
    u_scale: config.scale,
    u_rotation: config.rotation,
    u_originX: 0.5,
    u_originY: 0.5,
    u_offsetX: config.offsetX,
    u_offsetY: config.offsetY,
    u_worldWidth: 0,
    u_worldHeight: 0
  };
}

async function waitForCanvasReady(canvas: HTMLCanvasElement) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (canvas.width > 0 && canvas.height > 0) return;
    await nextFrame();
  }
}

function syncSnapshotCanvas(instance: StaticMeshInstance) {
  const source = instance.mount.canvasElement;
  const target = instance.snapshotCanvas;

  if (source.width <= 0 || source.height <= 0) return;

  if (target.width !== source.width || target.height !== source.height) {
    target.width = source.width;
    target.height = source.height;
  }

  const context = target.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0);
}

async function ensureStaticMeshInstance(size: number, cacheKey?: string): Promise<StaticMeshInstance> {
  const instanceKey = getInstanceKey(size, cacheKey);
  const existing = staticMeshInstances.get(instanceKey);
  if (existing) {
    await waitForCanvasReady(existing.mount.canvasElement);
    return existing;
  }

  const host = createHost(size);

  try {
    const mount = new ShaderMount(
      host,
      staticMeshGradientFragmentShader,
      buildStaticMeshUniforms({
        colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
        positions: 0,
        waveX: 0,
        waveXShift: 0,
        waveY: 0,
        waveYShift: 0,
        mixing: 1,
        grainMixer: 0,
        grainOverlay: 0,
        scale: 1,
        rotation: 0,
        offsetX: 0,
        offsetY: 0
      }),
      {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true
      },
      0,
      0,
      1,
      size * size
    );

    const snapshotCanvas = document.createElement('canvas');
    const instance: StaticMeshInstance = {
      host,
      mount,
      snapshotCanvas,
      lastSignature: ''
    };
    staticMeshInstances.set(instanceKey, instance);
    await waitForCanvasReady(mount.canvasElement);
    await nextFrame();
    syncSnapshotCanvas(instance);
    return instance;
  } catch (error) {
    host.remove();
    throw error;
  }
}

export async function prepareBackgroundImage(
  background: BackgroundRenderConfig,
  size: number,
  cacheKey?: string
): Promise<BackgroundRenderResult> {
  if (background.mode !== 'staticMeshGradient') {
    return { image: null, errorMessage: null };
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { image: null, errorMessage: null };
  }

  if (!checkWebgl2Support()) {
    return { image: null, errorMessage: null };
  }

  try {
    const instance = await ensureStaticMeshInstance(size, cacheKey);
    const signature = getStaticMeshSignature(background.staticMeshGradient);

    if (signature !== instance.lastSignature) {
      instance.mount.setUniforms(buildStaticMeshUniforms(background.staticMeshGradient));
      instance.lastSignature = signature;
      await nextFrame();
      syncSnapshotCanvas(instance);
    }

    return {
      image: instance.snapshotCanvas,
      errorMessage: null
    };
  } catch (error) {
    destroyInstance(getInstanceKey(size, cacheKey));
    const message = error instanceof Error ? error.message : '';
    if (message.includes('WebGL is not supported')) {
      webgl2SupportChecked = true;
      webgl2Supported = false;
      return { image: null, errorMessage: null };
    }

    console.error('Mesh Gradient failed:', error);
    return {
      image: createStaticMeshFallbackCanvas(size, background.staticMeshGradient, cacheKey),
      errorMessage: STATIC_MESH_FALLBACK_ERROR
    };
  }
}
