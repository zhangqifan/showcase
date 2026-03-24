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

const staticMeshInstances = new Map<number, StaticMeshInstance>();
const STATIC_MESH_FALLBACK_ERROR = 'Mesh Gradient 不可用，已自动回退为纯色背景。';

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
    return { image: null, errorMessage: STATIC_MESH_FALLBACK_ERROR };
  }

  try {
    const instanceKey = getInstanceKey(size, cacheKey);
    const instance = await ensureStaticMeshInstance(size, cacheKey);
    const signature = getStaticMeshSignature(background.staticMeshGradient);

    if (signature !== instance.lastSignature) {
      instance.mount.setUniforms(buildStaticMeshUniforms(background.staticMeshGradient));
      instance.lastSignature = signature;
      syncSnapshotCanvas(instance);
    }

    return {
      image: instance.snapshotCanvas,
      errorMessage: null
    };
  } catch (error) {
    destroyInstance(getInstanceKey(size, cacheKey));
    console.error('Mesh Gradient failed:', error);
    return {
      image: null,
      errorMessage: STATIC_MESH_FALLBACK_ERROR
    };
  }
}
