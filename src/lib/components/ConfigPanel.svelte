<script lang="ts">
  import { store } from '$lib/state.svelte';
  import { FRAMES, MODEL_NAMES } from '$lib/frames';
  import { SCALE_PRESETS, BG_PRESETS, EXPORT_SIZES } from '$lib/constants';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Progress } from '$lib/components/ui/progress';
  import * as Tabs from '$lib/components/ui/tabs';
  import {
    Image,
    Video,
    Upload,
    Trash2,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    RotateCcw
  } from '@lucide/svelte';

  let dragOver = $state(false);
  let exporting = $state(false);

  const currentColors = $derived(FRAMES[store.model]?.colors ?? []);

  $effect(() => {
    const colors = FRAMES[store.model]?.colors;
    if (colors && !colors.find((c) => c.name === store.color)) {
      store.color = colors[0]?.name ?? '';
    }
  });

  function onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) store.setContent(input.files[0]);
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

  async function handleExport(resolution: number, format: 'png' | 'mp4') {
    if (!store.exportFn || exporting) return;
    exporting = true;
    try {
      await store.exportFn(resolution, format);
    } finally {
      exporting = false;
    }
  }

  function modelLabel(name: string): string {
    return name.replace('iPhone ', '');
  }

</script>

<div class="panel">
  <!-- Device -->
  <section class="section">
    <div class="section-header">设备</div>
    <Tabs.Root bind:value={store.model}>
      <Tabs.List class="h-auto w-full flex-wrap gap-1 p-1">
        {#each MODEL_NAMES as model}
          <Tabs.Trigger value={model} class="flex-1 px-2 py-2 text-xs">
            {modelLabel(model)}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>
  </section>

  <!-- Color -->
  <section class="section">
    <div class="section-header">颜色</div>
    <div class="color-row">
      {#each currentColors as c}
        <button
          type="button"
          class="color-swatch {store.color === c.name ? 'active' : ''}"
          title={c.name}
          onclick={() => (store.color = c.name)}
          aria-pressed={store.color === c.name}
        >
          <span class="swatch-fill" style="background-color: {c.hex}"></span>
        </button>
      {/each}
    </div>
    <p class="color-name">{store.color}</p>
  </section>

  <Separator />

  <!-- Content -->
  <section class="section">
    <div class="section-header">内容</div>
    {#if store.contentUrl}
      <div class="content-badge">
        <span class="content-info">
          <span class="content-type">{store.contentType === 'video' ? '视频' : '图片'}</span>
          <span class="content-hint">支持移除</span>
        </span>
        <button
          type="button"
          class="remove-btn"
          onclick={() => store.clearContent()}
          title="移除"
          aria-label="移除"
        >
          <Trash2 class="size-3.5" />
        </button>
      </div>
    {:else}
      <label
        class="drop-zone {dragOver ? 'drag-over' : ''}"
        ondrop={onDrop}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
      >
        <input type="file" accept="image/*,video/*" onchange={onFileSelect} class="hidden" />
        <Upload class="size-6 text-muted-foreground" />
        <span class="drop-text">拖拽或点击上传图片/视频</span>
      </label>
    {/if}
  </section>

  <!-- Scale -->
  <section class="section">
    <div class="section-header">缩放</div>
    <div class="chip-row">
      {#each SCALE_PRESETS as preset}
        <Button
          variant={store.frameScale === preset ? 'default' : 'outline'}
          size="sm"
          class="flex-1 tabular-nums"
          onclick={() => (store.frameScale = preset)}
        >
          {preset === 1 ? '1.0' : preset}×
        </Button>
      {/each}
    </div>
  </section>

  <!-- Position -->
  <section class="section">
    <div class="section-header">位置</div>
    <div class="position-actions">
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => store.centerHorizontally()}
        title="水平居中"
      >
        <AlignHorizontalJustifyCenter class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => store.centerVertically()}
        title="垂直居中"
      >
        <AlignVerticalJustifyCenter class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => store.resetPosition()}
        title="重置"
      >
        <RotateCcw class="size-4" />
      </Button>
    </div>
  </section>

  <!-- Background -->
  <section class="section">
    <div class="section-header">背景</div>
    <div class="bg-row">
      {#each BG_PRESETS as bg}
        <button
          type="button"
          class="bg-chip {store.backgroundColor === bg.color ? 'active' : ''}"
          style="background-color: {bg.color}"
          title={bg.label}
          onclick={() => (store.backgroundColor = bg.color)}
        ></button>
      {/each}
      <label class="bg-picker" title="自定义颜色">
        <input type="color" bind:value={store.backgroundColor} class="color-input" />
      </label>
    </div>
  </section>

  <Separator />

  <!-- Export -->
  <section class="section">
    <div class="section-header">导出</div>
    <p class="export-desc">支持导出图片（PNG）和视频（MP4）。视频可导出当前帧为图片。</p>
    {#if store.exportProgress >= 0}
      <div class="export-progress">
        <Progress value={store.exportProgress * 100} class="h-2" />
        <span class="progress-text">{Math.round(store.exportProgress * 100)}%</span>
      </div>
    {/if}
    <div class="export-group">
      <div class="export-group-title">导出为 PNG</div>
      <div class="export-buttons">
        {#each EXPORT_SIZES as item}
          <Button
            variant="outline"
            class="h-auto justify-start gap-2.5 px-3.5 py-2.5"
            disabled={exporting || !store.contentUrl}
            onclick={() => handleExport(item.size, 'png')}
          >
            <Image class="size-4 shrink-0" />
            <span class="tabular-nums">{item.label}</span>
          </Button>
        {/each}
      </div>
    </div>
    <div class="export-group">
      <div class="export-group-title">导出为 MP4</div>
      <div class="export-buttons">
        {#each EXPORT_SIZES as item}
          <Button
            variant="outline"
            class="h-auto justify-start gap-2.5 px-3.5 py-2.5"
            disabled={exporting || store.contentType !== 'video'}
            onclick={() => handleExport(item.size, 'mp4')}
          >
            <Video class="size-4 shrink-0" />
            <span class="tabular-nums">{item.label}</span>
          </Button>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 20px 24px 32px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 0;
  }

  .section-header {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }

  .color-name {
    font-size: 12px;
    color: var(--muted-foreground);
  }

  .color-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    padding: 3px;
    background: transparent;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .color-swatch:hover {
    border-color: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
  }

  .color-swatch.active {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent);
  }

  .swatch-fill {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .content-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--muted);
  }

  .content-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .content-type {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }

  .content-hint {
    font-size: 11px;
    color: var(--muted-foreground);
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s;
  }

  .remove-btn:hover {
    background: color-mix(in oklch, var(--destructive) 10%, transparent);
    color: var(--destructive);
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 80px;
    padding: 16px;
    border: 2px dashed color-mix(in oklch, var(--muted-foreground) 25%, transparent);
    border-radius: 8px;
    background: color-mix(in oklch, var(--muted) 30%, transparent);
    cursor: pointer;
    transition: all 0.15s;
  }

  .drop-zone:hover,
  .drop-zone.drag-over {
    border-color: color-mix(in oklch, var(--primary) 50%, transparent);
    background: color-mix(in oklch, var(--primary) 5%, transparent);
  }

  .drop-text {
    font-size: 13px;
    color: var(--muted-foreground);
    text-align: center;
  }

  .export-desc {
    font-size: 12px;
    color: var(--muted-foreground);
    margin: 0 0 4px 0;
    line-height: 1.4;
  }

  .export-group {
    margin-top: 8px;
  }

  .export-group:first-of-type {
    margin-top: 0;
  }

  .export-group-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--foreground);
    margin-bottom: 6px;
  }

  .chip-row {
    display: flex;
    gap: 8px;
  }

  .position-actions {
    display: flex;
    gap: 8px;
  }

  .bg-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .bg-chip {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 2px solid transparent;
    padding: 0;
    background: transparent;
    transition: border-color 0.15s;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .bg-chip:hover {
    border-color: color-mix(in oklch, var(--muted-foreground) 40%, transparent);
  }

  .bg-chip.active {
    border-color: var(--primary);
  }

  .bg-picker {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border);
    background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
  }

  .color-input {
    position: absolute;
    inset: -8px;
    cursor: pointer;
    border: 0;
    padding: 0;
    opacity: 0;
  }

  .export-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-text {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
  }

  .export-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
