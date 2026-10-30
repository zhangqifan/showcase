export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** A uniform radius or [top-left, top-right, bottom-right, bottom-left]. */
  radius: number | [number, number, number, number];
}

export interface FrameColor {
  name: string;
  hex: string;
  file: string;
}

export type DeviceFamily = 'iphone' | 'mac';

export interface FrameModel {
  family: DeviceFamily;
  /** Frame image pixel width */
  width: number;
  /** Frame image pixel height */
  height: number;
  /**
   * Screen content area inside the frame image.
   * For existing iPhones, w × h use the **device physical resolution** so uploaded content
   * maps 1 : 1 to real device pixels.
   * x, y locate the screen within the frame, which may be off-center.
   * Duo geometry is measured from the supplied PNG screen apertures,
   * with a 2 px overlap beneath the bezel to avoid antialiasing seams.
   *
   * Device resolutions (source: ios-resolution.com):
   *   iPhone 17 / 17 Pro  — 1206 × 2622  (402×874 @3x)
   *   iPhone 17 Pro Max   — 1320 × 2868  (440×956 @3x)
   *
   * Corner radius ≈ 55 pt × 3 = 165 native px.
   *
   * x = (frame width  − device width)  / 2
   * y = (frame height − device height) / 2
   *
   * Mac geometry is measured from the transparent screen opening of each
   * Apple Design Resources bezel, which matches the native panel resolution:
   *   MacBook Neo            — 2408 × 1506
   *   MacBook Air 13" / 15"  — 2560 × 1664 / 2880 × 1864
   *   MacBook Pro 14" / 16"  — 3024 × 1964 / 3456 × 2234
   *   MacBook Pro XDR 14" / 16" — 3024 × 1986 / 3472 × 2266
   *   iMac 24"               — 4480 × 2520
   *   Studio Display (XDR)   — 5120 × 2880
   * MacBook openings have square bottom corners beneath the hinge.
   */
  screen: ScreenRect;
  colors: FrameColor[];
  variants?: FrameVariant[];
}

/** The geometry and colors needed to draw one frame, shared by models and their variants. */
export type FrameConfig = Omit<FrameModel, 'family' | 'variants'>;

export interface FrameVariant extends FrameConfig {
  id: string;
  name: string;
}

function duoColors(variant: string): FrameColor[] {
  return [
    { name: 'Night Sky', hex: '#273545', file: `/frames/iphone-duo-night-sky-${variant}.png` },
    { name: 'Star White', hex: '#e1e2e5', file: `/frames/iphone-duo-star-white-${variant}.png` }
  ];
}

const DUO_VARIANTS: FrameVariant[] = [
  {
    id: 'inner-open-landscape',
    name: '内屏 · 横向展开',
    width: 3093,
    height: 2247,
    screen: { x: 118, y: 118, w: 2857, h: 2011, radius: 160 },
    colors: duoColors('inner-open-landscape')
  },
  {
    id: 'inner-open-portrait',
    name: '内屏 · 纵向展开',
    width: 2247,
    height: 3093,
    screen: { x: 118, y: 118, w: 2011, h: 2857, radius: 160 },
    colors: duoColors('inner-open-portrait')
  },
  {
    id: 'outer-closed-portrait',
    name: '外屏 · 纵向合拢',
    width: 1574,
    height: 2194,
    screen: { x: 86, y: 78, w: 1402, h: 2038, radius: [24, 180, 180, 24] },
    colors: duoColors('outer-closed-portrait')
  },
  {
    id: 'outer-closed-landscape',
    name: '外屏 · 横向合拢',
    width: 2194,
    height: 1574,
    screen: { x: 78, y: 86, w: 2038, h: 1402, radius: [180, 180, 24, 24] },
    colors: duoColors('outer-closed-landscape')
  },
  {
    id: 'outer-open',
    name: '外屏 · 展开背面',
    width: 3056,
    height: 2194,
    screen: { x: 1568, y: 78, w: 1402, h: 2038, radius: [24, 180, 180, 24] },
    colors: duoColors('outer-open')
  }
];

function macColors(prefix: string, colors: [string, string][]): FrameColor[] {
  return colors.map(([name, hex]) => ({
    name,
    hex,
    file: `/frames/${prefix}-${name.toLowerCase().replaceAll(' ', '-')}.png`
  }));
}

const MACBOOK_AIR_COLORS: [string, string][] = [
  ['Midnight', '#2e3641'],
  ['Silver', '#e3e4e5'],
  ['Sky Blue', '#c6d4df'],
  ['Starlight', '#ede3d3']
];

const MACBOOK_PRO_COLORS: [string, string][] = [
  ['Silver', '#d6d7d9'],
  ['Space Black', '#2e2c2f']
];

const STUDIO_DISPLAY_COLORS: [string, string][] = [
  ['Light', '#e8e8ea'],
  ['Dark', '#1d1d1f']
];

const MACBOOK_AIR_VARIANTS: FrameVariant[] = [
  {
    id: '13',
    name: '13 英寸',
    width: 3400,
    height: 2240,
    screen: { x: 420, y: 288, w: 2560, h: 1664, radius: [34, 34, 0, 0] },
    colors: macColors('macbook-air-13', MACBOOK_AIR_COLORS)
  },
  {
    id: '15',
    name: '15 英寸',
    width: 3540,
    height: 2300,
    screen: { x: 329, y: 218, w: 2880, h: 1864, radius: [31, 31, 0, 0] },
    colors: macColors('macbook-air-15', MACBOOK_AIR_COLORS)
  }
];

const MACBOOK_PRO_VARIANTS: FrameVariant[] = [
  {
    id: '14',
    name: '14 英寸',
    width: 3860,
    height: 2540,
    screen: { x: 418, y: 288, w: 3024, h: 1964, radius: [38, 38, 0, 0] },
    colors: macColors('macbook-pro-14', MACBOOK_PRO_COLORS)
  },
  {
    id: '16',
    name: '16 英寸',
    width: 4260,
    height: 2840,
    screen: { x: 402, y: 303, w: 3456, h: 2234, radius: [38, 38, 0, 0] },
    colors: macColors('macbook-pro-16', MACBOOK_PRO_COLORS)
  }
];

const MACBOOK_PRO_XDR_VARIANTS: FrameVariant[] = [
  {
    id: '14',
    name: '14 英寸',
    width: 3860,
    height: 2540,
    screen: { x: 418, y: 277, w: 3024, h: 1986, radius: 61 },
    colors: macColors('macbook-pro-xdr-14', MACBOOK_PRO_COLORS)
  },
  {
    id: '16',
    name: '16 英寸',
    width: 4260,
    height: 2840,
    screen: { x: 394, y: 287, w: 3472, h: 2266, radius: 61 },
    colors: macColors('macbook-pro-xdr-16', MACBOOK_PRO_COLORS)
  }
];

const STUDIO_DISPLAY_VARIANTS: FrameVariant[] = [
  {
    id: 'standard',
    name: '标准',
    width: 5400,
    height: 4160,
    screen: { x: 140, y: 140, w: 5120, h: 2880, radius: 0 },
    colors: macColors('studio-display', STUDIO_DISPLAY_COLORS)
  },
  {
    id: 'xdr',
    name: 'XDR',
    width: 5400,
    height: 4160,
    screen: { x: 140, y: 140, w: 5120, h: 2880, radius: 0 },
    colors: macColors('studio-display-xdr', STUDIO_DISPLAY_COLORS)
  }
];

export const FRAMES: Record<string, FrameModel> = {
  'iPhone 17': {
    family: 'iphone',
    width: 1350,
    height: 2760,
    // x = (1350 − 1206) / 2 = 72,  y = (2760 − 2622) / 2 = 69
    screen: { x: 72, y: 69, w: 1206, h: 2622, radius: 165 },
    colors: [
      { name: 'Black', hex: '#1d1d1f', file: '/frames/iphone-17-black.png' },
      { name: 'White', hex: '#f5f5f7', file: '/frames/iphone-17-white.png' },
      { name: 'Sage', hex: '#8fa88c', file: '/frames/iphone-17-sage.png' },
      { name: 'Mist Blue', hex: '#a3bbc8', file: '/frames/iphone-17-mist-blue.png' },
      { name: 'Lavender', hex: '#baa0c8', file: '/frames/iphone-17-lavender.png' }
    ]
  },
  'iPhone 17 Pro': {
    family: 'iphone',
    width: 1350,
    height: 2760,
    screen: { x: 72, y: 69, w: 1206, h: 2622, radius: 165 },
    colors: [
      { name: 'Silver', hex: '#d0d0d2', file: '/frames/iphone-17-pro-silver.png' },
      { name: 'Deep Blue', hex: '#2b3f6b', file: '/frames/iphone-17-pro-deep-blue.png' },
      { name: 'Cosmic Orange', hex: '#c97637', file: '/frames/iphone-17-pro-cosmic-orange.png' }
    ]
  },
  'iPhone 17 Pro Max': {
    family: 'iphone',
    width: 1470,
    height: 3000,
    // x = (1470 − 1320) / 2 = 75,  y = (3000 − 2868) / 2 = 66
    screen: { x: 75, y: 66, w: 1320, h: 2868, radius: 165 },
    colors: [
      { name: 'Silver', hex: '#d0d0d2', file: '/frames/iphone-17-pro-max-silver.png' },
      { name: 'Deep Blue', hex: '#2b3f6b', file: '/frames/iphone-17-pro-max-deep-blue.png' },
      { name: 'Cosmic Orange', hex: '#c97637', file: '/frames/iphone-17-pro-max-cosmic-orange.png' }
    ]
  },
  'iPhone Duo': {
    family: 'iphone',
    ...DUO_VARIANTS[0],
    variants: DUO_VARIANTS
  },
  'iPhone Air': {
    family: 'iphone',
    width: 1380,
    height: 2880,
    // x = (1380 − 1260) / 2 = 60,  y = (2880 − 2736) / 2 = 72
    screen: { x: 60, y: 72, w: 1260, h: 2736, radius: 165 },
    colors: [
      { name: 'Space Black', hex: '#1d1d1f', file: '/frames/iphone-air-space-black.png' },
      { name: 'Cloud White', hex: '#f5f5f7', file: '/frames/iphone-air-cloud-white.png' },
      { name: 'Sky Blue', hex: '#7eb8da', file: '/frames/iphone-air-sky-blue.png' },
      { name: 'Light Gold', hex: '#e8d5b7', file: '/frames/iphone-air-light-gold.png' }
    ]
  },
  'MacBook Neo': {
    family: 'mac',
    width: 3220,
    height: 2100,
    screen: { x: 406, y: 297, w: 2408, h: 1506, radius: [34, 34, 0, 0] },
    colors: macColors('macbook-neo', [
      ['Blush', '#e4c4c2'],
      ['Citrus', '#d8d48a'],
      ['Indigo', '#3a4766'],
      ['Silver', '#d6d7d9']
    ])
  },
  'MacBook Air': {
    family: 'mac',
    ...MACBOOK_AIR_VARIANTS[0],
    variants: MACBOOK_AIR_VARIANTS
  },
  'MacBook Pro': {
    family: 'mac',
    ...MACBOOK_PRO_VARIANTS[0],
    variants: MACBOOK_PRO_VARIANTS
  },
  'MacBook Pro XDR': {
    family: 'mac',
    ...MACBOOK_PRO_XDR_VARIANTS[0],
    variants: MACBOOK_PRO_XDR_VARIANTS
  },
  iMac: {
    family: 'mac',
    width: 4760,
    height: 4050,
    screen: { x: 140, y: 150, w: 4480, h: 2520, radius: 0 },
    colors: macColors('imac-24', [
      ['Blue', '#afbed8'],
      ['Green', '#b2c7b7'],
      ['Orange', '#e8bba5'],
      ['Pink', '#e6b5c1'],
      ['Purple', '#b8b3d0'],
      ['Silver', '#cfd0d2'],
      ['Yellow', '#e7d9a5']
    ])
  },
  'Studio Display': {
    family: 'mac',
    ...STUDIO_DISPLAY_VARIANTS[0],
    variants: STUDIO_DISPLAY_VARIANTS
  }
};

export const MODEL_NAMES = Object.keys(FRAMES);

export function getModelNames(family: DeviceFamily): string[] {
  return MODEL_NAMES.filter((model) => FRAMES[model].family === family);
}

export function getFrameFamily(model: string): DeviceFamily {
  return FRAMES[model]?.family ?? 'iphone';
}

export function getFrame(model: string, variant?: string): FrameConfig | undefined {
  const frame = FRAMES[model];
  return frame?.variants?.find((item) => item.id === variant) ?? frame;
}

export function getFrameUrl(model: string, color: string, variant?: string): string {
  const frame = getFrame(model, variant);
  const c = frame?.colors.find((c) => c.name === color);
  return c?.file ?? '';
}
