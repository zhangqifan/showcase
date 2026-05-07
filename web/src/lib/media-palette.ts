import {
  cloneStaticMeshGradientConfig,
  normalizeStaticMeshGradientColors,
  type StaticMeshGradientConfig,
  STATIC_MESH_GRADIENT_MIN_COLORS
} from '$lib/background';

export interface MediaMeshStyleCandidate {
  id: string;
  label: string;
  description: string;
  config: StaticMeshGradientConfig;
}

const SAMPLE_SIZE = 112;

interface HslColor {
  h: number;
  s: number;
  l: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  switch (max) {
    case red:
      hue = ((green - blue) / delta) % 6;
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100
  };
}

function hslToHex({ h, s, l }: HslColor): string {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - chroma / 2;
  return rgbToHex({
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255
  });
}

function adjustPalette(
  colors: string[],
  transform: (color: HslColor, index: number) => HslColor
): string[] {
  return normalizeStaticMeshGradientColors(
    colors.map((color, index) => hslToHex(transform(rgbToHsl(hexToRgb(color)), index)))
  );
}

function withDeepAnchor(colors: string[]): string[] {
  const base = normalizeStaticMeshGradientColors(colors);
  const anchor = rgbToHsl(hexToRgb(base[0]));
  const dark = hslToHex({
    h: anchor.h + 4,
    s: clamp(anchor.s - 22, 24, 70),
    l: clamp(anchor.l - 30, 8, 24)
  });
  return normalizeStaticMeshGradientColors([dark, ...base.slice(0, base.length - 1)]);
}

function withLightAnchor(colors: string[]): string[] {
  const base = normalizeStaticMeshGradientColors(colors);
  const anchor = rgbToHsl(hexToRgb(base.at(-1) ?? base[0]));
  const light = hslToHex({
    h: anchor.h - 8,
    s: clamp(anchor.s - 18, 16, 72),
    l: clamp(anchor.l + 24, 74, 94)
  });
  return normalizeStaticMeshGradientColors([...base.slice(0, base.length - 1), light]);
}

function withMutedEarth(colors: string[]): string[] {
  return adjustPalette(colors, (color, index) => ({
    h: color.h + (index % 2 === 0 ? -12 : 18),
    s: clamp(color.s - 28, 18, 64),
    l: clamp(color.l + (index % 2 === 0 ? 2 : 8), 24, 74)
  }));
}

function withNeonLift(colors: string[]): string[] {
  return adjustPalette(colors, (color, index) => ({
    h: color.h + index * 10,
    s: clamp(color.s + 18, 56, 98),
    l: clamp(color.l + (index % 2 === 0 ? 4 : -6), 22, 70)
  }));
}

function createConfig(
  colors: string[],
  overrides: Partial<StaticMeshGradientConfig>
): StaticMeshGradientConfig {
  return cloneStaticMeshGradientConfig({
    colors,
    positions: 32,
    waveX: 0.72,
    waveXShift: 0.24,
    waveY: 0.74,
    waveYShift: 0.68,
    mixing: 0.91,
    grainMixer: 0,
    grainOverlay: 0,
    scale: 1.04,
    rotation: 220,
    offsetX: 0,
    offsetY: 0,
    ...overrides
  });
}

function createStyleCandidates(colors: string[]): MediaMeshStyleCandidate[] {
  const source = normalizeStaticMeshGradientColors(colors);
  const vivid = withNeonLift(source);
  const airy = withLightAnchor(source);
  const deep = withDeepAnchor(source);
  const earth = withMutedEarth(source);
  const sourceHue = rgbToHsl(hexToRgb(source[0])).h;

  return [
    {
      id: 'source-flow',
      label: 'Source Flow',
      description: 'Balanced',
      config: createConfig(source, {
        positions: 18 + (Math.round(sourceHue) % 34),
        waveX: 0.68,
        waveXShift: 0.22,
        waveY: 0.72,
        waveYShift: 0.57,
        mixing: 0.93,
        scale: 1.06,
        rotation: (sourceHue + 215) % 360
      })
    },
    {
      id: 'radiant-pop',
      label: 'Radiant',
      description: 'High energy',
      config: createConfig(vivid, {
        positions: 12,
        waveX: 1,
        waveXShift: 0.38,
        waveY: 0.94,
        waveYShift: 0.71,
        mixing: 0.8,
        grainMixer: 0.04,
        scale: 0.92,
        rotation: (sourceHue + 308) % 360,
        offsetX: -0.08,
        offsetY: 0.05
      })
    },
    {
      id: 'velvet-depth',
      label: 'Velvet',
      description: 'Dark aura',
      config: createConfig(deep, {
        positions: 78,
        waveX: 0.34,
        waveXShift: 0.82,
        waveY: 0.42,
        waveYShift: 0.14,
        mixing: 0.98,
        grainMixer: 0.01,
        scale: 1.34,
        rotation: (sourceHue + 142) % 360,
        offsetX: 0.06,
        offsetY: -0.14
      })
    },
    {
      id: 'aurora-mist',
      label: 'Aurora',
      description: 'Soft drift',
      config: createConfig(airy, {
        positions: 46,
        waveX: 0.94,
        waveXShift: 0.08,
        waveY: 1,
        waveYShift: 0.61,
        mixing: 0.9,
        scale: 1.18,
        rotation: (sourceHue + 260) % 360,
        offsetX: -0.12,
        offsetY: 0.1
      })
    },
    {
      id: 'earth-mist',
      label: 'Earth',
      description: 'Muted blend',
      config: createConfig(earth, {
        positions: 58,
        waveX: 0.48,
        waveXShift: 0.66,
        waveY: 0.56,
        waveYShift: 0.23,
        mixing: 0.95,
        grainMixer: 0.03,
        scale: 1.26,
        rotation: (sourceHue + 28) % 360,
        offsetX: 0.02,
        offsetY: 0.08
      })
    },
    {
      id: 'neon-noir',
      label: 'Neon Noir',
      description: 'Contrast',
      config: createConfig(normalizeStaticMeshGradientColors([deep[0], ...vivid.slice(0, 5)]), {
        positions: 86,
        waveX: 0.82,
        waveXShift: 0.94,
        waveY: 0.7,
        waveYShift: 0.18,
        mixing: 0.76,
        grainMixer: 0.08,
        grainOverlay: 0.03,
        scale: 0.98,
        rotation: (sourceHue + 192) % 360,
        offsetX: 0.12,
        offsetY: -0.08
      })
    }
  ];
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法加载图片内容用于生成 Mesh。'));
    image.src = url;
  });
}

async function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return await new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error('无法加载视频内容用于生成 Mesh。'));
    video.src = url;
    video.load();
  });
}

function drawMediaToCanvas(media: HTMLImageElement | HTMLVideoElement): HTMLCanvasElement {
  const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
  const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
  const scale = SAMPLE_SIZE / Math.max(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(24, Math.round(width * scale));
  canvas.height = Math.max(24, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法创建取色画布。');
  context.drawImage(media, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function extractDominantColors(canvas: HTMLCanvasElement): string[] {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法读取媒体像素。');

  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map<string, { count: number; sumR: number; sumG: number; sumB: number; weight: number }>();

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] ?? 0;
      if (alpha < 180) continue;

      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 510;
      const saturationBase = Math.max(red, green, blue) - Math.min(red, green, blue);
      const saturation = saturationBase / 255;

      const bucketKey = `${red >> 4}-${green >> 4}-${blue >> 4}`;
      const bucket = buckets.get(bucketKey) ?? { count: 0, sumR: 0, sumG: 0, sumB: 0, weight: 0 };
      const weight = 0.7 + saturation * 0.95 + (1 - Math.abs(lightness - 0.55)) * 0.28;

      bucket.count += 1;
      bucket.sumR += red;
      bucket.sumG += green;
      bucket.sumB += blue;
      bucket.weight += weight;
      buckets.set(bucketKey, bucket);
    }
  }

  const ranked = [...buckets.values()]
    .map((bucket) => ({
      color: {
        r: bucket.sumR / bucket.count,
        g: bucket.sumG / bucket.count,
        b: bucket.sumB / bucket.count
      },
      score: bucket.weight
    }))
    .sort((left, right) => right.score - left.score);

  const distinct: RgbColor[] = [];
  const thresholds = [72, 56, 42, 30];

  for (const threshold of thresholds) {
    for (const item of ranked) {
      if (distinct.length >= 6) break;
      const tooClose = distinct.some((existing) => rgbDistance(existing, item.color) < threshold);
      if (!tooClose) distinct.push(item.color);
    }
    if (distinct.length >= 4) break;
  }

  if (distinct.length < STATIC_MESH_GRADIENT_MIN_COLORS) {
    return normalizeStaticMeshGradientColors(['#4f46e5', '#ec4899', '#f59e0b', '#e2e8f0']);
  }

  return normalizeStaticMeshGradientColors(distinct.map(rgbToHex));
}

export async function extractMediaMeshStyleCandidates(
  url: string,
  type: 'image' | 'video'
): Promise<MediaMeshStyleCandidate[]> {
  const media = type === 'image'
    ? await loadImageElement(url)
    : await loadVideoElement(url);

  const canvas = drawMediaToCanvas(media);
  const colors = extractDominantColors(canvas);
  return createStyleCandidates(colors);
}
