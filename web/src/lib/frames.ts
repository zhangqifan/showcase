export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
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
   * w × h use the **device physical resolution** so uploaded content
   * maps 1 : 1 to real device pixels.
   * x, y are the pixel offsets that centre the device screen in the frame.
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
}

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

export function getFrameUrl(model: string, color: string): string {
  const frame = FRAMES[model];
  const c = frame?.colors.find((c) => c.name === color);
  return c?.file ?? '';
}
