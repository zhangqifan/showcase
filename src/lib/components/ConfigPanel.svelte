<script lang="ts">
  import { onMount } from 'svelte';
  import BackgroundPanel from '$lib/components/BackgroundPanel.svelte';
  import PopupButton from '$lib/components/PopupButton.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { store } from '$lib/state.svelte';
  import { FRAMES, getFrame, getFrameFamily, getModelNames, type DeviceFamily } from '$lib/frames';
  import {
    CONTENT_ALIGNMENTS,
    CONTENT_MODES,
    EXPORT_SIZES,
    SCALE_PRESETS
  } from '$lib/constants';
  import { Progress } from '$lib/components/ui/progress';
  import {
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    CircleAlert,
    Check,
    Image,
    Laptop,
    Replace,
    RotateCcw,
    Share,
    Smartphone,
    Trash2,
    Upload,
    Video
  } from '@lucide/svelte';

  type InspectorTab = 'device' | 'background';
  type ExportFormat = 'png' | 'mp4';

  const FAMILY_OPTIONS = [
    { value: 'iphone', label: 'iPhone', icon: Smartphone },
    { value: 'mac', label: 'Mac', icon: Laptop }
  ] as const satisfies readonly { value: DeviceFamily; label: string; icon: typeof Smartphone }[];

  const SCALE_OPTIONS = SCALE_PRESETS.map((preset) => ({
    value: preset,
    label: `${preset}×`
  }));

  const SIZE_OPTIONS = EXPORT_SIZES.map((item) => ({ value: item.size, label: item.label }));

  let inspectorTab = $state<InspectorTab>('device');
  let dragOver = $state(false);
  let exporting = $state(false);
  let exportFormat = $state<ExportFormat>('png');
  let exportSize = $state<number>(EXPORT_SIZES[0].size);
  let contentSize = $state<{ url: string; width: number; height: number } | null>(null);
  let fileInput = $state<HTMLInputElement>();

  /** The last model picked in each family, so switching families round-trips. */
  const lastModelByFamily: Record<DeviceFamily, string> = {
    iphone: 'iPhone 17 Pro',
    mac: 'MacBook Pro'
  };

  const family = $derived(getFrameFamily(store.model));
  const isMac = $derived(family === 'mac');
  const modelOptions = $derived(getModelNames(family).map((model) => ({ value: model, label: model })));
  const currentVariants = $derived(FRAMES[store.model]?.variants ?? []);
  const variantOptions = $derived(currentVariants.map((variant) => ({ value: variant.id, label: variant.name })));
  const currentFrame = $derived(getFrame(store.model, store.frameVariant));
  const currentColors = $derived(currentFrame?.colors ?? []);
  const screen = $derived(currentFrame?.screen);
  const isVideo = $derived(store.contentType === 'video');
  const effectiveFormat = $derived<ExportFormat>(exportFormat === 'mp4' && isVideo ? 'mp4' : 'png');
  const currentContentSize = $derived(contentSize?.url === store.contentUrl ? contentSize : null);
  const contentFit = $derived.by(() => {
    if (!currentContentSize || !screen) return null;
    const { width, height } = currentContentSize;
    if (width === screen.w && height === screen.h) return 'exact';
    return Math.abs(width / height - screen.w / screen.h) < 0.01 ? 'aspect' : 'mismatch';
  });

  $effect(() => {
    lastModelByFamily[family] = store.model;
  });

  // Read the uploaded media's pixel size so it can be compared with the device screen.
  $effect(() => {
    const url = store.contentUrl;
    const type = store.contentType;
    if (!url || !type) return;
    let active = true;
    const report = (width: number, height: number) => {
      if (active) contentSize = { url, width, height };
    };
    if (type === 'image') {
      const img = new window.Image();
      img.onload = () => report(img.naturalWidth, img.naturalHeight);
      img.src = url;
    } else {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => report(video.videoWidth, video.videoHeight);
      video.src = url;
    }
    return () => {
      active = false;
    };
  });

  onMount(() => {
    window.addEventListener('paste', onWindowPaste);
    return () => {
      window.removeEventListener('paste', onWindowPaste);
    };
  });

  function selectFamily(next: DeviceFamily) {
    if (next !== family) store.setModel(lastModelByFamily[next]);
  }

  function onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) store.setContent(input.files[0]);
    input.value = '';
  }

  function onWindowPaste(event: ClipboardEvent) {
    const mediaFile = getClipboardMediaFile(event);
    if (!mediaFile) return;
    event.preventDefault();
    store.setContent(mediaFile);
  }

  function isMediaType(type: string): boolean {
    return type.startsWith('image/') || type.startsWith('video/');
  }

  function getClipboardMediaFile(event: ClipboardEvent): File | null {
    const data = event.clipboardData;
    if (!data) return null;

    // Files copied in Finder arrive in `files`; the pasteboard may also carry the file's
    // icon as an image item, so prefer real files and, among them, a video.
    const files = Array.from(data.files).filter((file) => isMediaType(file.type));
    const file = files.find((file) => file.type.startsWith('video/')) ?? files[0];
    if (file) return file;

    for (const item of data.items) {
      if (item.kind !== 'file' || !isMediaType(item.type)) continue;
      const itemFile = item.getAsFile();
      if (itemFile) return itemFile;
    }
    return null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files?.[0]) store.setContent(e.dataTransfer.files[0]);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  async function handleExport() {
    if (!store.exportFn || exporting) return;
    exporting = true;
    try {
      await store.exportFn(exportSize, effectiveFormat);
    } finally {
      exporting = false;
    }
  }

  function formatSize(width: number, height: number): string {
    return `${width} × ${height}`;
  }
</script>

<div class="inspector">
  <div class="inspector-tabs">
    <SegmentedControl
      label="检查器"
      value={inspectorTab}
      onchange={(tab) => (inspectorTab = tab)}
      options={[
        { value: 'device', label: '设备' },
        { value: 'background', label: '背景' }
      ]}
    />
  </div>

  <div class="inspector-body">
    {#if inspectorTab === 'device'}
      <!-- Device -->
      <section class="inspector-group" aria-labelledby="device-heading">
        <h2 class="inspector-heading" id="device-heading">设备</h2>
        <div class="inspector-row">
          <span class="inspector-label">类型</span>
          <SegmentedControl label="设备类型" value={family} onchange={selectFamily} options={FAMILY_OPTIONS} />
        </div>
        <div class="inspector-row">
          <label class="inspector-label" for="device-model">机型</label>
          <PopupButton
            id="device-model"
            value={store.model}
            onchange={(model) => store.setModel(model)}
            options={modelOptions}
          />
        </div>
        {#if variantOptions.length > 0}
          <div class="inspector-row">
            <label class="inspector-label" for="device-variant">{isMac ? '尺寸' : '形态'}</label>
            {#if variantOptions.length <= 3}
              <SegmentedControl
                label={isMac ? '尺寸' : '形态'}
                value={store.frameVariant}
                onchange={(variant) => store.setFrameVariant(variant)}
                options={variantOptions}
              />
            {:else}
              <PopupButton
                id="device-variant"
                value={store.frameVariant}
                onchange={(variant) => store.setFrameVariant(variant)}
                options={variantOptions}
              />
            {/if}
          </div>
        {/if}
        <div class="inspector-row">
          <span class="inspector-label">颜色</span>
          <div class="swatch-row" role="radiogroup" aria-label="颜色">
            {#each currentColors as c (c.name)}
              <button
                type="button"
                role="radio"
                class="swatch"
                title={c.name}
                aria-label={c.name}
                aria-checked={store.color === c.name}
                onclick={() => (store.color = c.name)}
              >
                <span class="swatch-fill" style="background-color: {c.hex}"></span>
              </button>
            {/each}
          </div>
        </div>
        <div class="inspector-row">
          <span></span>
          <p class="inspector-caption">
            {[store.color, screen && `屏幕 ${formatSize(screen.w, screen.h)} px`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </section>

      <!-- Content -->
      <section class="inspector-group" aria-labelledby="content-heading">
        <h2 class="inspector-heading" id="content-heading">内容</h2>
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*,video/*"
          onchange={onFileSelect}
          class="hidden"
        />
        {#if store.contentUrl}
          <div class="content-card">
            <span class="content-icon">
              {#if isVideo}
                <Video class="size-4" />
              {:else}
                <Image class="size-4" />
              {/if}
            </span>
            <span class="content-info">
              <span class="content-title">{isVideo ? '视频' : '图片'}</span>
              <span class="content-detail">
                {currentContentSize ? `${formatSize(currentContentSize.width, currentContentSize.height)} px` : '读取尺寸…'}
              </span>
            </span>
            <button type="button" class="icon-button" title="替换" aria-label="替换" onclick={() => fileInput?.click()}>
              <Replace class="size-3.5" />
            </button>
            <button
              type="button"
              class="icon-button destructive"
              title="移除"
              aria-label="移除"
              onclick={() => store.clearContent()}
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>
          {#if contentFit && screen}
            <p class="fit-hint" class:warning={contentFit === 'mismatch'}>
              {#if contentFit === 'mismatch'}
                <CircleAlert class="size-3.5 shrink-0" />
                比例与屏幕不一致，建议使用 {formatSize(screen.w, screen.h)} px{isMac ? '，或调整缩放方式' : ''}
              {:else}
                <Check class="size-3.5 shrink-0" />
                {contentFit === 'exact' ? '与屏幕像素一致' : '比例与屏幕一致，将按比例缩放'}
              {/if}
            </p>
          {/if}
        {:else}
          <button
            type="button"
            class="drop-zone"
            class:drag-over={dragOver}
            ondrop={onDrop}
            ondragover={onDragOver}
            ondragleave={onDragLeave}
            onclick={() => fileInput?.click()}
          >
            <Upload class="size-5" />
            <span class="drop-title">选择图片或视频</span>
            <span class="drop-detail">
              可拖拽或 ⌘V 粘贴图片、视频{#if screen}，推荐 {formatSize(screen.w, screen.h)} px{/if}
            </span>
          </button>
        {/if}

        {#if isMac}
          <div class="inspector-row">
            <label class="inspector-label" for="content-mode">缩放方式</label>
            <PopupButton
              id="content-mode"
              value={store.contentMode}
              onchange={(mode) => (store.contentMode = mode)}
              options={CONTENT_MODES}
            />
          </div>
          <div class="inspector-row alignment-row">
            <span class="inspector-label">对齐</span>
            <div
              class="alignment-grid"
              class:disabled={store.contentMode === 'scaleToFill'}
              role="radiogroup"
              aria-label="内容对齐"
            >
              {#each CONTENT_ALIGNMENTS as alignment (alignment.value)}
                <button
                  type="button"
                  role="radio"
                  class="alignment-cell"
                  title={alignment.label}
                  aria-label={alignment.label}
                  aria-checked={store.contentAlignment === alignment.value}
                  disabled={store.contentMode === 'scaleToFill'}
                  onclick={() => (store.contentAlignment = alignment.value)}
                >
                  <span class="alignment-dot"></span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </section>

      <!-- Arrange -->
      <section class="inspector-group" aria-labelledby="arrange-heading">
        <h2 class="inspector-heading" id="arrange-heading">排列</h2>
        <div class="inspector-row">
          <span class="inspector-label">缩放</span>
          <SegmentedControl
            label="缩放"
            value={store.frameScale}
            onchange={(scale) => (store.frameScale = scale)}
            options={SCALE_OPTIONS}
            distribution="proportional"
          />
        </div>
        <div class="inspector-row">
          <span class="inspector-label">位置</span>
          <div class="button-group">
            <button type="button" class="push-button" title="水平居中" onclick={() => store.centerHorizontally()}>
              <AlignHorizontalJustifyCenter class="size-3.5" />
              <span>水平</span>
            </button>
            <button type="button" class="push-button" title="垂直居中" onclick={() => store.centerVertically()}>
              <AlignVerticalJustifyCenter class="size-3.5" />
              <span>垂直</span>
            </button>
            <button type="button" class="push-button" title="重置位置" onclick={() => store.resetPosition()}>
              <RotateCcw class="size-3.5" />
              <span>重置</span>
            </button>
          </div>
        </div>
        <div class="inspector-row">
          <span></span>
          <p class="inspector-caption">在预览中拖动可自由调整位置</p>
        </div>
      </section>
    {:else}
      <BackgroundPanel />
    {/if}
  </div>

  <!-- Export -->
  <footer class="inspector-footer">
    <div class="inspector-row">
      <span class="inspector-label">格式</span>
      <SegmentedControl
        label="导出格式"
        value={effectiveFormat}
        onchange={(format) => (exportFormat = format)}
        options={[
          { value: 'png', label: 'PNG', icon: Image },
          { value: 'mp4', label: 'MP4', icon: Video, disabled: !isVideo, title: isVideo ? undefined : '上传视频后可导出 MP4' }
        ]}
      />
    </div>
    <div class="inspector-row">
      <label class="inspector-label" for="export-size">尺寸</label>
      <PopupButton id="export-size" value={exportSize} onchange={(size) => (exportSize = size)} options={SIZE_OPTIONS} />
    </div>
    {#if store.exportProgress >= 0}
      <div class="export-progress">
        <Progress value={store.exportProgress * 100} class="h-1.5" />
        <span class="progress-text">{Math.round(store.exportProgress * 100)}%</span>
      </div>
    {/if}
    <button
      type="button"
      class="export-button"
      disabled={exporting || !store.contentUrl}
      onclick={handleExport}
    >
      <Share class="size-3.5" />
      {exporting ? '正在导出…' : `导出 ${effectiveFormat.toUpperCase()}`}
    </button>
  </footer>
</div>

<style>
  .inspector {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    font-size: 13px;
  }

  .inspector-tabs {
    flex-shrink: 0;
    padding: 20px 16px 4px;
  }

  .inspector-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 16px 24px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgb(0 0 0 / 0.14) transparent;
  }

  .swatch-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .swatch {
    width: 24px;
    height: 24px;
    padding: 2px;
    border: none;
    border-radius: 50%;
    background: transparent;
    box-shadow: 0 0 0 2px transparent;
    transition: box-shadow 0.12s;
  }

  .swatch[aria-checked='true'] {
    box-shadow: 0 0 0 2px var(--system-accent);
  }

  .swatch:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .swatch-fill {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.25);
  }

  .content-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 10px 10px 10px;
    border-radius: 10px;
    background: var(--inspector-bg);
  }

  .content-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--system-accent) 12%, var(--group-bg));
    color: var(--system-accent);
  }

  .content-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .content-title {
    font-size: 13px;
    font-weight: 500;
  }

  .content-detail {
    font-size: 11px;
    color: var(--label-secondary);
    font-variant-numeric: tabular-nums;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--label-secondary);
    transition: background-color 0.12s, color 0.12s;
  }

  .icon-button:hover {
    background: var(--control-hover);
    color: var(--foreground);
  }

  .icon-button.destructive:hover {
    color: #ff3b30;
  }

  .fit-hint {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: -4px 0 0;
    font-size: 12px;
    line-height: 1.4;
    color: #248a3d;
  }

  .fit-hint.warning {
    color: #b25000;
  }

  .fit-hint :global(svg) {
    margin-top: 0.5px;
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 24px 16px;
    border: 1.5px dashed var(--control-border);
    border-radius: 12px;
    background: var(--inspector-bg);
    color: var(--label-secondary);
    transition: background-color 0.12s, border-color 0.12s;
  }

  .drop-zone:hover,
  .drop-zone.drag-over {
    border-color: var(--system-accent);
    background: color-mix(in srgb, var(--system-accent) 6%, var(--group-bg));
  }

  .drop-zone :global(svg) {
    color: var(--system-accent);
    margin-bottom: 4px;
  }

  .drop-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }

  .drop-detail {
    font-size: 12px;
    line-height: 1.4;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .alignment-row {
    align-items: start;
  }

  .alignment-row .inspector-label {
    line-height: 28px;
  }

  .alignment-grid {
    display: grid;
    grid-template-columns: repeat(3, 32px);
    grid-template-rows: repeat(3, 24px);
    gap: 2px;
    width: max-content;
    padding: 3px;
    border-radius: 9px;
    background: var(--control-track);
  }

  .alignment-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
  }

  .alignment-cell:not(:disabled):hover {
    background: var(--control-hover);
  }

  .alignment-cell[aria-checked='true'] {
    background: var(--control-thumb);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  }

  .alignment-cell:focus-visible {
    outline: 3px solid var(--focus-ring);
  }

  .alignment-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--label-secondary);
  }

  .alignment-cell[aria-checked='true'] .alignment-dot {
    width: 7px;
    height: 7px;
    background: var(--system-accent);
  }

  .alignment-grid.disabled {
    opacity: 0.45;
  }

  .button-group {
    display: flex;
    gap: 6px;
  }

  .push-button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 28px;
    padding: 0 8px;
    border: none;
    border-radius: 7px;
    background: var(--control-thumb);
    box-shadow:
      0 0 0 0.5px var(--control-border),
      0 1px 1.5px rgb(0 0 0 / 0.08);
    color: var(--foreground);
    font-size: 13px;
  }

  .push-button:active {
    background: var(--control-track);
  }

  .push-button:focus-visible {
    outline: 3px solid var(--focus-ring);
  }

  .inspector-footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 32px 20px;
    border-top: 0.5px solid var(--separator);
    background: color-mix(in srgb, var(--inspector-bg) 82%, transparent);
    backdrop-filter: saturate(180%) blur(20px);
  }

  .export-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-text {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--label-secondary);
  }

  .export-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 38px;
    margin-top: 4px;
    border: none;
    border-radius: 10px;
    background: var(--system-accent);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    box-shadow:
      0 1px 2px rgb(0 0 0 / 0.1),
      0 6px 16px -6px color-mix(in srgb, var(--system-accent) 60%, transparent);
    transition: background-color 0.15s, transform 0.15s, box-shadow 0.15s;
  }

  .export-button:active:not(:disabled) {
    transform: scale(0.985);
  }

  .export-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--system-accent) 88%, black);
  }

  .export-button:disabled {
    background: var(--control-track);
    color: var(--muted-foreground);
    box-shadow: none;
  }

  .export-button:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
  }
</style>
