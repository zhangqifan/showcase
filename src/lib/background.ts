export type BackgroundMode = 'solid' | 'staticMeshGradient';
export const STATIC_MESH_GRADIENT_MIN_COLORS = 2;
export const STATIC_MESH_GRADIENT_MAX_COLORS = 10;

export interface StaticMeshGradientConfig {
  colors: string[];
  positions: number;
  waveX: number;
  waveXShift: number;
  waveY: number;
  waveYShift: number;
  mixing: number;
  grainMixer: number;
  grainOverlay: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export interface BackgroundRenderConfig {
  mode: BackgroundMode;
  solidColor: string;
  staticMeshGradient: StaticMeshGradientConfig;
}

export interface StaticMeshGradientPreset {
  id: string;
  label: string;
  config: StaticMeshGradientConfig;
}

export const STATIC_MESH_GRADIENT_PRESET: StaticMeshGradientConfig = {
  colors: ['#ffad0a', '#6200ff', '#e2a3ff', '#ff99fd'],
  positions: 2,
  waveX: 1,
  waveXShift: 0.6,
  waveY: 1,
  waveYShift: 0.21,
  mixing: 0.93,
  grainMixer: 0,
  grainOverlay: 0,
  scale: 1,
  rotation: 270,
  offsetX: 0,
  offsetY: 0
};

export const STATIC_MESH_GRADIENT_PRESETS: StaticMeshGradientPreset[] = [
  {
    id: 'paper',
    label: 'Radiant',
    config: STATIC_MESH_GRADIENT_PRESET
  },
  {
    id: 'sunset-bloom',
    label: 'Sunset Bloom',
    config: {
      colors: ['#ff7b54', '#ffb26b', '#ffd56f', '#ff8fb1'],
      positions: 18,
      waveX: 0.82,
      waveXShift: 0.24,
      waveY: 0.74,
      waveYShift: 0.68,
      mixing: 0.9,
      grainMixer: 0.03,
      grainOverlay: 0,
      scale: 1.08,
      rotation: 315,
      offsetX: -0.08,
      offsetY: -0.02
    }
  },
  {
    id: 'lagoon',
    label: 'Lagoon',
    config: {
      colors: ['#003049', '#0a9396', '#94d2bd', '#e9d8a6'],
      positions: 34,
      waveX: 0.55,
      waveXShift: 0.1,
      waveY: 0.88,
      waveYShift: 0.43,
      mixing: 0.86,
      grainMixer: 0.06,
      grainOverlay: 0,
      scale: 1.22,
      rotation: 215,
      offsetX: 0.05,
      offsetY: -0.14
    }
  },
  {
    id: 'ultraviolet',
    label: 'Ultraviolet',
    config: {
      colors: ['#11009e', '#4942e4', '#8696fe', '#c4b0ff'],
      positions: 61,
      waveX: 0.94,
      waveXShift: 0.83,
      waveY: 0.66,
      waveYShift: 0.3,
      mixing: 0.96,
      grainMixer: 0,
      grainOverlay: 0.02,
      scale: 0.96,
      rotation: 180,
      offsetX: 0.12,
      offsetY: 0.06
    }
  },
  {
    id: 'matcha-cloud',
    label: 'Matcha Cloud',
    config: {
      colors: ['#183a1d', '#5c913b', '#c1d7ae', '#f0f7da'],
      positions: 46,
      waveX: 0.43,
      waveXShift: 0.58,
      waveY: 0.52,
      waveYShift: 0.14,
      mixing: 0.92,
      grainMixer: 0.02,
      grainOverlay: 0,
      scale: 1.3,
      rotation: 38,
      offsetX: -0.12,
      offsetY: 0.08
    }
  },
  {
    id: 'infrared',
    label: 'Infrared',
    config: {
      colors: ['#2b0a3d', '#8f0d56', '#d81159', '#ffbc42'],
      positions: 72,
      waveX: 1,
      waveXShift: 0.49,
      waveY: 0.92,
      waveYShift: 0.8,
      mixing: 0.83,
      grainMixer: 0.08,
      grainOverlay: 0.04,
      scale: 1.14,
      rotation: 248,
      offsetX: 0.16,
      offsetY: -0.08
    }
  },
  {
    id: 'arctic',
    label: 'Arctic',
    config: {
      colors: ['#0b132b', '#1c2541', '#3a86ff', '#bde0fe'],
      positions: 27,
      waveX: 0.67,
      waveXShift: 0.72,
      waveY: 0.58,
      waveYShift: 0.34,
      mixing: 0.97,
      grainMixer: 0,
      grainOverlay: 0,
      scale: 1.18,
      rotation: 120,
      offsetX: -0.06,
      offsetY: -0.1
    }
  },
  {
    id: 'orchid-mist',
    label: 'Orchid Mist',
    config: {
      colors: ['#58287f', '#8f43ee', '#f49dff', '#ffd6ff'],
      positions: 54,
      waveX: 0.76,
      waveXShift: 0.17,
      waveY: 0.96,
      waveYShift: 0.55,
      mixing: 0.94,
      grainMixer: 0,
      grainOverlay: 0,
      scale: 1.02,
      rotation: 292,
      offsetX: 0,
      offsetY: 0.11
    }
  },
  {
    id: 'citrus-pop',
    label: 'Citrus Pop',
    config: {
      colors: ['#f77f00', '#fcbf49', '#eae2b7', '#2a9d8f'],
      positions: 12,
      waveX: 0.9,
      waveXShift: 0.28,
      waveY: 0.81,
      waveYShift: 0.62,
      mixing: 0.84,
      grainMixer: 0.04,
      grainOverlay: 0,
      scale: 0.92,
      rotation: 342,
      offsetX: -0.18,
      offsetY: 0.02
    }
  },
  {
    id: 'carbon-rose',
    label: 'Carbon Rose',
    config: {
      colors: ['#111111', '#3d0e61', '#9a031e', '#fb8b24'],
      positions: 85,
      waveX: 0.71,
      waveXShift: 0.91,
      waveY: 0.77,
      waveYShift: 0.12,
      mixing: 0.79,
      grainMixer: 0.12,
      grainOverlay: 0.06,
      scale: 1.36,
      rotation: 156,
      offsetX: 0.09,
      offsetY: -0.18
    }
  },
  {
    id: 'neon-mint',
    label: 'Neon Mint',
    config: {
      colors: ['#03045e', '#00b4d8', '#90e0ef', '#caffbf'],
      positions: 39,
      waveX: 0.88,
      waveXShift: 0.39,
      waveY: 0.69,
      waveYShift: 0.71,
      mixing: 0.91,
      grainMixer: 0.01,
      grainOverlay: 0,
      scale: 1.1,
      rotation: 64,
      offsetX: -0.04,
      offsetY: 0.14
    }
  }
];

export type StaticMeshGradientNumericKey = Exclude<keyof StaticMeshGradientConfig, 'colors'>;

export interface StaticMeshGradientControl {
  key: StaticMeshGradientNumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

export const STATIC_MESH_GRADIENT_CONTROLS: StaticMeshGradientControl[] = [
  { key: 'positions', label: 'Positions', min: 0, max: 100, step: 1 },
  { key: 'waveX', label: 'Wave X', min: 0, max: 1, step: 0.01 },
  { key: 'waveXShift', label: 'Wave X Shift', min: 0, max: 1, step: 0.01 },
  { key: 'waveY', label: 'Wave Y', min: 0, max: 1, step: 0.01 },
  { key: 'waveYShift', label: 'Wave Y Shift', min: 0, max: 1, step: 0.01 },
  { key: 'mixing', label: 'Mixing', min: 0, max: 1, step: 0.01 },
  { key: 'grainMixer', label: 'Grain Mixer', min: 0, max: 1, step: 0.01 },
  { key: 'grainOverlay', label: 'Grain Overlay', min: 0, max: 1, step: 0.01 },
  { key: 'scale', label: 'Scale', min: 0.01, max: 4, step: 0.01 },
  { key: 'rotation', label: 'Rotation', min: 0, max: 360, step: 1 },
  { key: 'offsetX', label: 'Offset X', min: -1, max: 1, step: 0.01 },
  { key: 'offsetY', label: 'Offset Y', min: -1, max: 1, step: 0.01 }
];

export function cloneStaticMeshGradientConfig(
  config: StaticMeshGradientConfig = STATIC_MESH_GRADIENT_PRESET
): StaticMeshGradientConfig {
  return {
    ...config,
    colors: normalizeStaticMeshGradientColors(config.colors)
  };
}

export function createBackgroundRenderConfig(
  mode: BackgroundMode,
  solidColor: string,
  staticMeshGradient: StaticMeshGradientConfig
): BackgroundRenderConfig {
  return {
    mode,
    solidColor,
    staticMeshGradient: cloneStaticMeshGradientConfig(staticMeshGradient)
  };
}

function roundToStep(value: number, step: number): number {
  const precision = step.toString().includes('.') ? step.toString().split('.')[1]?.length ?? 0 : 0;
  return Number((Math.round(value / step) * step).toFixed(precision));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, step: number): number {
  return roundToStep(Math.random() * (max - min) + min, step);
}

function normalizeHexColor(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  return '#ffffff';
}

function hslToHex(h: number, s: number, l: number): string {
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
  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = normalizeHexColor(hex).slice(1);
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
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

export function normalizeStaticMeshGradientColors(colors: string[]): string[] {
  const normalized = colors
    .map((color) => normalizeHexColor(color))
    .slice(0, STATIC_MESH_GRADIENT_MAX_COLORS);

  const fallback = STATIC_MESH_GRADIENT_PRESET.colors;
  while (normalized.length < STATIC_MESH_GRADIENT_MIN_COLORS) {
    normalized.push(fallback[normalized.length % fallback.length]);
  }

  return normalized;
}

function randomPalette(count = randomInt(4, 6)): string[] {
  const templates = [
    [0, 28, 72, 120],
    [0, 45, 95, 160, 205, 250],
    [0, 90, 140, 180, 240, 300],
    [0, 20, 70, 210, 250, 310],
    [0, 60, 150, 195, 255, 330]
  ] as const;
  const baseHue = randomInt(0, 359);
  const template = templates[randomInt(0, templates.length - 1)];
  const baseSaturation = randomInt(68, 94);
  const baseLightness = randomInt(50, 68);

  return template.slice(0, count).map((offset, index) => {
    const saturation = clamp(baseSaturation + randomInt(-10, 8) + index * 2, 58, 98);
    const lightness = clamp(baseLightness + randomInt(-14, 12) + (index % 2 === 0 ? 6 : -4), 38, 80);
    return hslToHex(baseHue + offset, saturation, lightness);
  });
}

export function getSuggestedStaticMeshGradientColor(colors: string[]): string {
  const anchor = colors.at(-1) ?? STATIC_MESH_GRADIENT_PRESET.colors[0];
  const { h, s, l } = hexToHsl(anchor);

  return hslToHex(
    h + randomInt(28, 104),
    clamp(s + randomInt(-12, 10), 58, 96),
    clamp(l + randomInt(-12, 12), 36, 82)
  );
}

export function randomStaticMeshGradientConfig(): StaticMeshGradientConfig {
  const softBlend = Math.random() > 0.35;
  const colorCount = randomInt(4, 7);

  return {
    colors: randomPalette(colorCount),
    positions: randomInt(0, 100),
    waveX: randomFloat(0.35, 1, 0.01),
    waveXShift: randomFloat(0, 1, 0.01),
    waveY: randomFloat(0.35, 1, 0.01),
    waveYShift: randomFloat(0, 1, 0.01),
    mixing: softBlend ? randomFloat(0.82, 0.99, 0.01) : randomFloat(0.68, 0.82, 0.01),
    grainMixer: Math.random() > 0.7 ? randomFloat(0.03, 0.18, 0.01) : 0,
    grainOverlay: Math.random() > 0.82 ? randomFloat(0.02, 0.12, 0.01) : 0,
    scale: randomFloat(0.82, 1.45, 0.01),
    rotation: randomInt(0, 360),
    offsetX: randomFloat(-0.22, 0.22, 0.01),
    offsetY: randomFloat(-0.22, 0.22, 0.01)
  };
}

export function isSameStaticMeshGradientConfig(
  left: StaticMeshGradientConfig,
  right: StaticMeshGradientConfig
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
