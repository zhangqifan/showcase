/** 预览与导出画布基准尺寸（导出时按分辨率缩放） */
export const CANVAS_SIZE = 2000;

export const SCALE_PRESETS = [0.8, 1.0, 1.25, 1.75, 2.0] as const;

export const BG_PRESETS = [
  { color: '#ffffff', label: '白色' },
  { color: '#f5f5f5', label: '浅灰' },
  { color: '#e5e5e5', label: '灰色' },
  { color: '#1a1a1a', label: '深色' },
  { color: '#000000', label: '黑色' }
] as const;

export const EXPORT_SIZES = [
  { size: 1080, label: '1080 × 1080', tag: 'FHD' },
  { size: 1920, label: '1920 × 1920', tag: '2K' }
] as const;
