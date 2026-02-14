import { CANVAS_SIZE } from '$lib/constants';

class AppStore {
  model = $state("iPhone 17 Pro");
  color = $state("Silver");
  contentUrl = $state("");
  contentType = $state<"image" | "video" | null>(null);
  backgroundColor = $state("#ffffff");

  frameScale = $state(1.0);
  frameOffsetX = $state(0);
  frameOffsetY = $state(0);

  exportFn: ((resolution: number, format: 'png' | 'mp4') => Promise<void>) | null = null;
  /** -1 = idle, 0‒1 = video export progress */
  exportProgress = $state(-1);

  setContent(file: File) {
    if (this.contentUrl) URL.revokeObjectURL(this.contentUrl);
    this.contentUrl = URL.createObjectURL(file);
    this.contentType = file.type.startsWith('video/') ? 'video' : 'image';
  }

  clearContent() {
    if (this.contentUrl) URL.revokeObjectURL(this.contentUrl);
    this.contentUrl = '';
    this.contentType = null;
  }

  resetPosition() {
    this.frameOffsetX = 0;
    this.frameOffsetY = 0;
  }

  centerHorizontally() {
    this.frameOffsetX = 0;
  }

  centerVertically() {
    this.frameOffsetY = 0;
  }

  /** 将 canvas 坐标的 offset 缩放到目标分辨率 */
  scaleOffsetForExport(resolution: number) {
    const s = resolution / CANVAS_SIZE;
    return { x: this.frameOffsetX * s, y: this.frameOffsetY * s };
  }
}

export const store = new AppStore();
