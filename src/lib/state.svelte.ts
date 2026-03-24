import {
  cloneStaticMeshGradientConfig,
  getSuggestedStaticMeshGradientColor,
  randomStaticMeshGradientConfig,
  STATIC_MESH_GRADIENT_MAX_COLORS,
  STATIC_MESH_GRADIENT_MIN_COLORS,
  type BackgroundMode,
  type StaticMeshGradientConfig,
  type StaticMeshGradientPreset
} from '$lib/background';
import { CANVAS_SIZE } from '$lib/constants';
import type { MediaMeshStyleCandidate } from '$lib/media-palette';

class AppStore {
  model = $state("iPhone 17 Pro");
  color = $state("Silver");
  contentUrl = $state("");
  contentType = $state<"image" | "video" | null>(null);
  backgroundMode = $state<BackgroundMode>('solid');
  backgroundColor = $state("#ffffff");
  staticMeshGradient = $state(cloneStaticMeshGradientConfig());
  backgroundError = $state('');
  mediaMeshStyleCandidates = $state<MediaMeshStyleCandidate[]>([]);
  mediaMeshStyleStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  mediaMeshStyleError = $state('');

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

  resetStaticMeshGradient() {
    this.staticMeshGradient = cloneStaticMeshGradientConfig();
  }

  applyStaticMeshGradientPreset(preset: StaticMeshGradientPreset | StaticMeshGradientConfig) {
    const config = 'config' in preset ? preset.config : preset;
    this.staticMeshGradient = cloneStaticMeshGradientConfig(config);
  }

  randomizeStaticMeshGradient() {
    this.staticMeshGradient = randomStaticMeshGradientConfig();
  }

  addStaticMeshGradientColor() {
    if (this.staticMeshGradient.colors.length >= STATIC_MESH_GRADIENT_MAX_COLORS) return;
    this.staticMeshGradient.colors = [
      ...this.staticMeshGradient.colors,
      getSuggestedStaticMeshGradientColor(this.staticMeshGradient.colors)
    ];
  }

  removeStaticMeshGradientColor(index: number) {
    if (this.staticMeshGradient.colors.length <= STATIC_MESH_GRADIENT_MIN_COLORS) return;
    this.staticMeshGradient.colors = this.staticMeshGradient.colors.filter((_, colorIndex) => colorIndex !== index);
  }

  applyMediaMeshStyle(candidate: MediaMeshStyleCandidate | StaticMeshGradientConfig) {
    const config = 'config' in candidate ? candidate.config : candidate;
    this.staticMeshGradient = cloneStaticMeshGradientConfig(config);
  }

  setMediaMeshStyleCandidates(candidates: MediaMeshStyleCandidate[]) {
    this.mediaMeshStyleCandidates = candidates;
    this.mediaMeshStyleStatus = candidates.length > 0 ? 'ready' : 'idle';
    this.mediaMeshStyleError = '';
  }

  setMediaMeshStyleLoading() {
    this.mediaMeshStyleStatus = 'loading';
    this.mediaMeshStyleError = '';
  }

  setMediaMeshStyleError(message: string) {
    this.mediaMeshStyleCandidates = [];
    this.mediaMeshStyleStatus = 'error';
    this.mediaMeshStyleError = message;
  }

  clearMediaMeshStyles() {
    this.mediaMeshStyleCandidates = [];
    this.mediaMeshStyleStatus = 'idle';
    this.mediaMeshStyleError = '';
  }

  setBackgroundError(message: string | null) {
    this.backgroundError = message ?? '';
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
