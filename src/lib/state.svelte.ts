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
import { getFrame } from '$lib/frames';
import { SnapshotHistory } from '$lib/history';
import type { MediaMeshStyleCandidate } from '$lib/media-palette';

interface EditorSnapshot {
  model: string;
  color: string;
  frameVariant: string;
  contentUrl: string;
  contentType: 'image' | 'video' | null;
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  staticMeshGradient: StaticMeshGradientConfig;
  frameScale: number;
  frameOffsetX: number;
  frameOffsetY: number;
}

export class AppStore {
  model = $state("iPhone 17 Pro");
  color = $state("Silver");
  frameVariant = $state("inner-open-landscape");
  contentUrl = $state("");
  contentType = $state<"image" | "video" | null>(null);
  backgroundMode = $state<BackgroundMode>('solid');
  backgroundColor = $state("#ffffff");
  private skipNextBackgroundTransition = $state(false);
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

  private history = new SnapshotHistory(this.getSnapshot());
  private contentUrls = new Set<string>();

  getSnapshot(): EditorSnapshot {
    return {
      model: this.model,
      color: this.color,
      frameVariant: this.frameVariant,
      contentUrl: this.contentUrl,
      contentType: this.contentType,
      backgroundMode: this.backgroundMode,
      backgroundColor: this.backgroundColor,
      staticMeshGradient: cloneStaticMeshGradientConfig(this.staticMeshGradient),
      frameScale: this.frameScale,
      frameOffsetX: this.frameOffsetX,
      frameOffsetY: this.frameOffsetY
    };
  }

  recordHistory(snapshot = this.getSnapshot()) {
    this.history.record(snapshot);
    this.releaseUnusedContentUrls();
  }

  beginHistoryGroup() {
    this.history.begin(this.getSnapshot());
  }

  endHistoryGroup() {
    this.history.end(this.getSnapshot());
    this.releaseUnusedContentUrls();
  }

  undo() {
    const snapshot = this.history.undo(this.getSnapshot());
    if (snapshot) this.restoreSnapshot(snapshot);
    this.releaseUnusedContentUrls();
    return snapshot !== null;
  }

  redo() {
    const snapshot = this.history.redo(this.getSnapshot());
    if (snapshot) this.restoreSnapshot(snapshot);
    this.releaseUnusedContentUrls();
    return snapshot !== null;
  }

  clearHistory() {
    this.history.reset(this.getSnapshot());
    this.releaseUnusedContentUrls();
  }

  private restoreSnapshot(snapshot: EditorSnapshot) {
    Object.assign(this, snapshot);
    this.skipBackgroundTransitionOnce();
  }

  private releaseUnusedContentUrls() {
    if (this.contentUrls.size === 0) return;
    const retained = new Set(this.history.snapshots.map((snapshot) => snapshot.contentUrl));
    retained.add(this.contentUrl);
    for (const url of this.contentUrls) {
      if (retained.has(url)) continue;
      URL.revokeObjectURL(url);
      this.contentUrls.delete(url);
    }
  }

  setModel(model: string) {
    this.model = model;
    this.normalizeFrameColor();
  }

  setFrameVariant(variant: string) {
    this.frameVariant = variant;
    this.normalizeFrameColor();
  }

  private normalizeFrameColor() {
    const colors = getFrame(this.model, this.frameVariant)?.colors ?? [];
    if (!colors.some((color) => color.name === this.color)) {
      this.color = colors[0]?.name ?? '';
    }
  }

  setContent(file: File) {
    this.contentUrl = URL.createObjectURL(file);
    this.contentUrls.add(this.contentUrl);
    this.contentType = file.type.startsWith('video/') ? 'video' : 'image';
  }

  clearContent() {
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

  setBackgroundColor(color: string, options?: { skipTransition?: boolean }) {
    this.backgroundColor = color;
    this.skipNextBackgroundTransition = options?.skipTransition ?? false;
  }

  skipBackgroundTransitionOnce() {
    this.skipNextBackgroundTransition = true;
  }

  consumeBackgroundTransitionSkip(): boolean {
    const shouldSkip = this.skipNextBackgroundTransition;
    this.skipNextBackgroundTransition = false;
    return shouldSkip;
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
