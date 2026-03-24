<script lang="ts">
  import { tick } from 'svelte';
  import {
    STATIC_MESH_GRADIENT_CONTROLS,
    STATIC_MESH_GRADIENT_MAX_COLORS,
    STATIC_MESH_GRADIENT_MIN_COLORS,
    STATIC_MESH_GRADIENT_PRESETS,
    isSameStaticMeshGradientConfig,
    type StaticMeshGradientControl
  } from '$lib/background';
  import MeshStylePreview from '$lib/components/MeshStylePreview.svelte';
  import { store } from '$lib/state.svelte';
  import { extractMediaMeshStyleCandidates } from '$lib/media-palette';
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
    Plus,
    X,
    ChevronLeft,
    ChevronRight,
    Dices,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    RotateCcw
  } from '@lucide/svelte';

  let dragOver = $state(false);
  let exporting = $state(false);
  let meshControlsExpanded = $state(false);
  let presetRailEl = $state<HTMLDivElement | null>(null);
  let canScrollPresetLeft = $state(false);
  let canScrollPresetRight = $state(false);
  let mediaRailEl = $state<HTMLDivElement | null>(null);
  let canScrollMediaLeft = $state(false);
  let canScrollMediaRight = $state(false);
  let meshColorDrafts = $state<string[]>([]);

  const currentColors = $derived(FRAMES[store.model]?.colors ?? []);
  const canAddMeshColor = $derived(
    store.staticMeshGradient.colors.length < STATIC_MESH_GRADIENT_MAX_COLORS
  );
  const canRemoveMeshColor = $derived(
    store.staticMeshGradient.colors.length > STATIC_MESH_GRADIENT_MIN_COLORS
  );
  const activeMeshPresetId = $derived.by(() => {
    const preset = STATIC_MESH_GRADIENT_PRESETS.find((item) =>
      isSameStaticMeshGradientConfig(item.config, store.staticMeshGradient)
    );
    return preset?.id ?? null;
  });
  const activeMediaStyleId = $derived.by(() => {
    const candidate = store.mediaMeshStyleCandidates.find((item) =>
      isSameStaticMeshGradientConfig(item.config, store.staticMeshGradient)
    );
    return candidate?.id ?? null;
  });

  $effect(() => {
    const colors = FRAMES[store.model]?.colors;
    if (colors && !colors.find((c) => c.name === store.color)) {
      store.color = colors[0]?.name ?? '';
    }
  });

  $effect(() => {
    meshColorDrafts = [...store.staticMeshGradient.colors];
  });

  $effect(() => {
    const contentUrl = store.contentUrl;
    const contentType = store.contentType;
    let active = true;

    if (!contentUrl || !contentType) {
      store.clearMediaMeshStyles();
      return;
    }

    store.setMediaMeshStyleLoading();

    void extractMediaMeshStyleCandidates(contentUrl, contentType)
      .then((candidates) => {
        if (!active) return;
        store.setMediaMeshStyleCandidates(candidates);
      })
      .catch((error: unknown) => {
        if (!active) return;
        store.setMediaMeshStyleError(error instanceof Error ? error.message : '生成样式失败。');
      });

    return () => {
      active = false;
    };
  });

  $effect(() => {
    if (!presetRailEl) return;

    const observer = new ResizeObserver(() => {
      updatePresetRailState();
    });
    observer.observe(presetRailEl);
    updatePresetRailState();

    return () => observer.disconnect();
  });

  $effect(() => {
    if (!mediaRailEl) return;

    const observer = new ResizeObserver(() => {
      updateMediaRailState();
    });
    observer.observe(mediaRailEl);
    updateMediaRailState();

    return () => observer.disconnect();
  });

  $effect(() => {
    const activePresetId = activeMeshPresetId;
    if (!presetRailEl || !activePresetId) return;

    void tick().then(() => {
      if (!presetRailEl || !activePresetId) return;
      const activeChip = presetRailEl.querySelector<HTMLElement>(`[data-preset-id="${activePresetId}"]`);
      activeChip?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      updatePresetRailState();
    });
  });

  $effect(() => {
    const activeStyleId = activeMediaStyleId;
    if (!mediaRailEl || !activeStyleId) return;

    void tick().then(() => {
      if (!mediaRailEl || !activeStyleId) return;
      const activeCard = mediaRailEl.querySelector<HTMLElement>(`[data-media-style-id="${activeStyleId}"]`);
      activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      updateMediaRailState();
    });
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

  function updateMeshColor(index: number, value: string) {
    const colors = [...store.staticMeshGradient.colors];
    colors[index] = value;
    store.staticMeshGradient.colors = colors;
  }

  function normalizeMeshHex(value: string): string {
    const cleaned = value.trim().replace(/[^#0-9a-fA-F]/g, '');
    const withoutHashes = cleaned.replace(/#/g, '').slice(0, 6);
    return withoutHashes ? `#${withoutHashes.toLowerCase()}` : '#';
  }

  function isCompleteMeshHex(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value);
  }

  function updateMeshColorDraft(index: number, value: string) {
    const nextValue = normalizeMeshHex(value);
    const drafts = [...meshColorDrafts];
    drafts[index] = nextValue;
    meshColorDrafts = drafts;

    if (isCompleteMeshHex(nextValue)) {
      updateMeshColor(index, nextValue);
    }
  }

  function commitMeshColorDraft(index: number) {
    const draft = normalizeMeshHex(meshColorDrafts[index] ?? '');
    const nextValue = isCompleteMeshHex(draft) ? draft : store.staticMeshGradient.colors[index];
    const drafts = [...meshColorDrafts];
    drafts[index] = nextValue;
    meshColorDrafts = drafts;
    updateMeshColor(index, nextValue);
  }

  function clampControlValue(control: StaticMeshGradientControl, value: number): number {
    if (!Number.isFinite(value)) return control.min;
    return Math.min(control.max, Math.max(control.min, value));
  }

  function updateMeshValue(control: StaticMeshGradientControl, value: number) {
    store.staticMeshGradient[control.key] = clampControlValue(control, value);
  }

  function updatePresetRailState() {
    if (!presetRailEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = presetRailEl;
    canScrollPresetLeft = scrollLeft > 8;
    canScrollPresetRight = scrollLeft + clientWidth < scrollWidth - 8;
  }

  function scrollPresetRail(direction: -1 | 1) {
    if (!presetRailEl) return;
    const amount = Math.max(180, Math.round(presetRailEl.clientWidth * 0.72));
    presetRailEl.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  function handlePresetWheel(event: WheelEvent) {
    if (!presetRailEl) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    presetRailEl.scrollBy({ left: event.deltaY, behavior: 'auto' });
    updatePresetRailState();
  }

  function updateMediaRailState() {
    if (!mediaRailEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = mediaRailEl;
    canScrollMediaLeft = scrollLeft > 8;
    canScrollMediaRight = scrollLeft + clientWidth < scrollWidth - 8;
  }

  function scrollMediaRail(direction: -1 | 1) {
    if (!mediaRailEl) return;
    const amount = Math.max(220, Math.round(mediaRailEl.clientWidth * 0.78));
    mediaRailEl.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  function handleMediaWheel(event: WheelEvent) {
    if (!mediaRailEl) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    mediaRailEl.scrollBy({ left: event.deltaY, behavior: 'auto' });
    updateMediaRailState();
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
      <Tabs.Root bind:value={store.backgroundMode}>
        <Tabs.List class="grid h-auto w-full grid-cols-2 gap-1 p-1">
          <Tabs.Trigger value="solid" class="px-2 py-2 text-xs">纯色</Tabs.Trigger>
          <Tabs.Trigger value="staticMeshGradient" class="px-2 py-2 text-xs">Mesh Gradient</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

    {#if store.backgroundMode === 'solid'}
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
    {:else}
      <div class="mesh-panel">
        <div class="mesh-header">
          <div class="mesh-actions">
            <Button variant="outline" size="sm" onclick={() => store.randomizeStaticMeshGradient()}>
              <Dices class="size-4" />
              Random
            </Button>
          </div>
        </div>

        <div class="mesh-strip">
          <div class="mesh-strip-head">
            <span class="mesh-strip-label">Presets</span>
            <div class="mesh-preset-navs">
              <button
                type="button"
                class="mesh-preset-nav"
                disabled={!canScrollPresetLeft}
                onclick={() => scrollPresetRail(-1)}
                aria-label="查看前面的预设"
              >
                <ChevronLeft class="size-4" />
              </button>
              <button
                type="button"
                class="mesh-preset-nav"
                disabled={!canScrollPresetRight}
                onclick={() => scrollPresetRail(1)}
                aria-label="查看后面的预设"
              >
                <ChevronRight class="size-4" />
              </button>
            </div>
          </div>
          <div
            class="mesh-preset-browser {canScrollPresetLeft ? 'has-left-overflow' : ''} {canScrollPresetRight ? 'has-right-overflow' : ''}"
          >
            <div
              class="mesh-preset-rail"
              bind:this={presetRailEl}
              onscroll={updatePresetRailState}
              onwheel={handlePresetWheel}
            >
              {#each STATIC_MESH_GRADIENT_PRESETS as preset}
                <button
                  type="button"
                  class="mesh-preset-chip {activeMeshPresetId === preset.id ? 'active' : ''}"
                  data-preset-id={preset.id}
                  onclick={() => store.applyStaticMeshGradientPreset(preset)}
                >
                  <span
                    class="mesh-preset-preview"
                    style={`background: linear-gradient(135deg, ${preset.config.colors.join(', ')})`}
                  ></span>
                  <span>{preset.label}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="mesh-strip">
          <div class="mesh-strip-head">
            <span class="mesh-strip-label">Colors</span>
            <div class="mesh-strip-actions">
              <span class="mesh-strip-count">
                {store.staticMeshGradient.colors.length}/{STATIC_MESH_GRADIENT_MAX_COLORS}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canAddMeshColor}
                onclick={() => store.addStaticMeshGradientColor()}
              >
                <Plus class="size-4" />
                添加颜色
              </Button>
            </div>
          </div>

          {#if store.contentUrl}
            <div class="mesh-media-section">
              <div class="mesh-media-head">
                <p class="mesh-media-title">Magic colors</p>
                <div class="mesh-preset-navs">
                  {#if store.mediaMeshStyleStatus === 'loading'}
                    <span class="mesh-media-status">生成中…</span>
                  {/if}
                  <button
                    type="button"
                    class="mesh-preset-nav"
                    disabled={!canScrollMediaLeft}
                    onclick={() => scrollMediaRail(-1)}
                    aria-label="查看前面的 Magic colors"
                  >
                    <ChevronLeft class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="mesh-preset-nav"
                    disabled={!canScrollMediaRight}
                    onclick={() => scrollMediaRail(1)}
                    aria-label="查看后面的 Magic colors"
                  >
                    <ChevronRight class="size-4" />
                  </button>
                </div>
              </div>

              {#if store.mediaMeshStyleStatus === 'error'}
                <p class="mesh-media-error">{store.mediaMeshStyleError}</p>
              {:else if store.mediaMeshStyleCandidates.length > 0}
                <div
                  class="mesh-media-browser {canScrollMediaLeft ? 'has-left-overflow' : ''} {canScrollMediaRight ? 'has-right-overflow' : ''}"
                >
                  <div
                    class="mesh-media-rail"
                    bind:this={mediaRailEl}
                    onscroll={updateMediaRailState}
                    onwheel={handleMediaWheel}
                  >
                    {#each store.mediaMeshStyleCandidates as candidate}
                      <button
                        type="button"
                        class="mesh-media-chip {activeMediaStyleId === candidate.id ? 'active' : ''}"
                        data-media-style-id={candidate.id}
                        onclick={() => store.applyMediaMeshStyle(candidate)}
                        title={candidate.description}
                      >
                        <span class="mesh-media-preview" aria-hidden="true">
                          <MeshStylePreview
                            config={candidate.config}
                            width={28}
                            height={18}
                            cacheKey={candidate.id}
                          />
                        </span>
                        <span>{candidate.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <div class="mesh-color-grid">
            {#each store.staticMeshGradient.colors as color, index}
            <div class="mesh-color-item">
              <div class="mesh-color-item-top">
                <label class="mesh-control-label" for={"mesh-color-" + index}>颜色 {index + 1}</label>
                <button
                  type="button"
                  class="mesh-color-remove"
                  disabled={!canRemoveMeshColor}
                  onclick={(event) => {
                    event.stopPropagation();
                    store.removeStaticMeshGradientColor(index);
                  }}
                  aria-label={`移除颜色 ${index + 1}`}
                >
                  <X class="size-3.5" />
                </button>
              </div>
              <div class="mesh-color-control">
                <input
                  id={"mesh-color-" + index}
                  type="color"
                  class="mesh-color-picker"
                  value={color}
                  oninput={(event) =>
                    updateMeshColor(index, (event.currentTarget as HTMLInputElement).value)}
                />
                <input
                  type="text"
                  class="mesh-color-value"
                  inputmode="text"
                  spellcheck="false"
                  autocapitalize="off"
                  autocomplete="off"
                  maxlength="7"
                  value={meshColorDrafts[index] ?? color}
                  oninput={(event) =>
                    updateMeshColorDraft(index, (event.currentTarget as HTMLInputElement).value)}
                  onchange={() => commitMeshColorDraft(index)}
                  onblur={() => commitMeshColorDraft(index)}
                />
              </div>
            </div>
            {/each}
          </div>
        </div>

        <div class="mesh-controls-section">
          <button
            type="button"
            class="mesh-controls-toggle"
            aria-expanded={meshControlsExpanded}
            onclick={() => (meshControlsExpanded = !meshControlsExpanded)}
          >
            <span class="mesh-controls-toggle-label">参数</span>
            <span class="mesh-controls-toggle-meta">
              {meshControlsExpanded ? '收起' : '展开'}
              <span class="mesh-controls-toggle-count">{STATIC_MESH_GRADIENT_CONTROLS.length}</span>
            </span>
          </button>

          {#if meshControlsExpanded}
            <div class="mesh-controls">
              {#each STATIC_MESH_GRADIENT_CONTROLS as control}
                <div class="mesh-control">
                  <div class="mesh-control-top">
                    <label class="mesh-control-label" for={"mesh-" + control.key}>{control.label}</label>
                    <input
                      id={"mesh-" + control.key}
                      type="number"
                      class="mesh-number-input"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={store.staticMeshGradient[control.key]}
                      oninput={(event) =>
                        updateMeshValue(control, (event.currentTarget as HTMLInputElement).valueAsNumber)}
                    />
                  </div>
                  <input
                    type="range"
                    class="mesh-range-input"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={store.staticMeshGradient[control.key]}
                    oninput={(event) =>
                      updateMeshValue(control, (event.currentTarget as HTMLInputElement).valueAsNumber)}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if store.backgroundError}
          <p class="mesh-error">{store.backgroundError}</p>
        {/if}
      </div>
    {/if}
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

  .mesh-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 12px;
    border-radius: 12px;
    background: color-mix(in oklch, var(--muted) 45%, transparent);
    border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
  }

  .mesh-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .mesh-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .mesh-strip {
    display: grid;
    gap: 10px;
  }

  .mesh-strip-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .mesh-strip-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
  }

  .mesh-strip-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mesh-media-section {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
    border-radius: 12px;
    background: color-mix(in oklch, var(--background) 88%, var(--muted));
  }

  .mesh-media-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .mesh-media-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
  }

  .mesh-media-status {
    font-size: 12px;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  .mesh-media-browser {
    position: relative;
    margin: 0 -6px;
    overflow: hidden;
    border-radius: 16px;
  }

  .mesh-media-browser::before,
  .mesh-media-browser::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 18px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 1;
  }

  .mesh-media-browser::before {
    left: 0;
    background: linear-gradient(90deg, color-mix(in oklch, var(--muted) 92%, transparent), transparent);
  }

  .mesh-media-browser::after {
    right: 0;
    background: linear-gradient(270deg, color-mix(in oklch, var(--muted) 92%, transparent), transparent);
  }

  .mesh-media-browser.has-left-overflow::before,
  .mesh-media-browser.has-right-overflow::after {
    opacity: 1;
  }

  .mesh-media-rail {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 18px 4px;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    scroll-behavior: smooth;
  }

  .mesh-media-rail::-webkit-scrollbar {
    display: none;
  }

  .mesh-media-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--background);
    color: var(--foreground);
    font-size: 12px;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    scroll-snap-align: start;
  }

  .mesh-media-chip:hover {
    border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
  }

  .mesh-media-chip.active {
    border-color: var(--primary);
    background: color-mix(in oklch, var(--primary) 5%, var(--background));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 12%, transparent);
  }

  .mesh-media-preview {
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: var(--background);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
    overflow: hidden;
  }

  .mesh-media-error {
    margin: 0;
    font-size: 12px;
    color: var(--destructive);
  }

  .mesh-strip-count {
    font-size: 12px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }

  .mesh-preset-rail {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 18px 4px;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    scroll-behavior: smooth;
  }

  .mesh-preset-rail::-webkit-scrollbar {
    display: none;
  }

  .mesh-preset-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--background);
    color: var(--foreground);
    font-size: 12px;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    scroll-snap-align: start;
  }

  .mesh-preset-chip:hover {
    border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
  }

  .mesh-preset-chip.active {
    border-color: var(--primary);
    background: color-mix(in oklch, var(--primary) 5%, var(--background));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 12%, transparent);
  }

  .mesh-preset-preview {
    width: 28px;
    height: 18px;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }

  .mesh-preset-browser {
    position: relative;
    margin: 0 -6px;
    overflow: hidden;
    border-radius: 12px;
  }

  .mesh-preset-browser::before,
  .mesh-preset-browser::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 18px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 1;
  }

  .mesh-preset-browser::before {
    left: 0;
    background: linear-gradient(90deg, color-mix(in oklch, var(--muted) 92%, transparent), transparent);
  }

  .mesh-preset-browser::after {
    right: 0;
    background: linear-gradient(270deg, color-mix(in oklch, var(--muted) 92%, transparent), transparent);
  }

  .mesh-preset-browser.has-left-overflow::before,
  .mesh-preset-browser.has-right-overflow::after {
    opacity: 1;
  }

  .mesh-preset-navs {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mesh-preset-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--background);
    color: var(--foreground);
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .mesh-preset-nav:hover:not(:disabled) {
    border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
    background: color-mix(in oklch, var(--primary) 4%, var(--background));
  }

  .mesh-preset-nav:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  .mesh-color-grid {
    display: grid;
    gap: 10px;
  }

  .mesh-color-item {
    display: grid;
    gap: 6px;
  }

  .mesh-color-item-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mesh-color-control {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .mesh-color-picker {
    width: 42px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    padding: 2px;
    cursor: pointer;
  }

  .mesh-color-value {
    min-width: 0;
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background);
    font-size: 12px;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: lowercase;
  }

  .mesh-color-value:focus {
    outline: none;
    border-color: color-mix(in oklch, var(--primary) 45%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 12%, transparent);
  }

  .mesh-color-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--background);
    color: var(--muted-foreground);
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .mesh-color-remove:hover:not(:disabled) {
    border-color: color-mix(in oklch, var(--destructive) 35%, var(--border));
    color: var(--destructive);
    background: color-mix(in oklch, var(--destructive) 5%, var(--background));
  }

  .mesh-color-remove:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .mesh-controls {
    display: grid;
    gap: 12px;
  }

  .mesh-controls-section {
    display: grid;
    gap: 12px;
  }

  .mesh-controls-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--background);
    transition: border-color 0.15s, background 0.15s;
  }

  .mesh-controls-toggle:hover {
    border-color: color-mix(in oklch, var(--primary) 35%, var(--border));
    background: color-mix(in oklch, var(--primary) 3%, var(--background));
  }

  .mesh-controls-toggle-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
  }

  .mesh-controls-toggle-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted-foreground);
  }

  .mesh-controls-toggle-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--muted) 75%, transparent);
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }

  .mesh-control {
    display: grid;
    gap: 8px;
  }

  .mesh-control-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .mesh-control-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--foreground);
  }

  .mesh-number-input {
    width: 88px;
    height: 30px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background);
    padding: 0 10px;
    font-size: 12px;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .mesh-range-input {
    width: 100%;
    accent-color: oklch(0.61 0.23 303);
    cursor: pointer;
  }

  .mesh-error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in oklch, var(--destructive) 10%, transparent);
    color: var(--destructive);
    font-size: 12px;
    line-height: 1.45;
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
