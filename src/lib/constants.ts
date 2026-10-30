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

/** 屏幕内容的缩放方式，命名对齐 UIKit 的 UIView.ContentMode */
export type ContentMode = 'scaleAspectFill' | 'scaleAspectFit' | 'scaleToFill' | 'original' | 'tile';

export const CONTENT_MODES: readonly { value: ContentMode; label: string }[] = [
  { value: 'scaleAspectFill', label: '按比例填充' },
  { value: 'scaleAspectFit', label: '按比例适应' },
  { value: 'scaleToFill', label: '拉伸' },
  { value: 'original', label: '原始尺寸' },
  { value: 'tile', label: '平铺' }
];

export type ContentAlignment =
  | 'topLeft' | 'top' | 'topRight'
  | 'left' | 'center' | 'right'
  | 'bottomLeft' | 'bottom' | 'bottomRight';

/** 3 × 3 对齐网格，按行优先排列 */
export const CONTENT_ALIGNMENTS: readonly { value: ContentAlignment; label: string }[] = [
  { value: 'topLeft', label: '左上' },
  { value: 'top', label: '顶部' },
  { value: 'topRight', label: '右上' },
  { value: 'left', label: '左侧' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右侧' },
  { value: 'bottomLeft', label: '左下' },
  { value: 'bottom', label: '底部' },
  { value: 'bottomRight', label: '右下' }
];
