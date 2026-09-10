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

export interface FrameModel {
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
   */
  screen: ScreenRect;
  colors: FrameColor[];
  variants?: FrameVariant[];
}

export interface FrameVariant extends Omit<FrameModel, 'variants'> {
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

export const FRAMES: Record<string, FrameModel> = {
  'iPhone 17': {
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
    ...DUO_VARIANTS[0],
    variants: DUO_VARIANTS
  },
  'iPhone Air': {
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
  }
};

export const MODEL_NAMES = Object.keys(FRAMES);

export function getFrame(model: string, variant?: string): FrameModel | undefined {
  const frame = FRAMES[model];
  return frame?.variants?.find((item) => item.id === variant) ?? frame;
}

export function getFrameUrl(model: string, color: string, variant?: string): string {
  const frame = getFrame(model, variant);
  const c = frame?.colors.find((c) => c.name === color);
  return c?.file ?? '';
}
