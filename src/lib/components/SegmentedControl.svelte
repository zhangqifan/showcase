<script lang="ts" generics="T extends string | number">
  import type { Component } from 'svelte';
  import type { IconProps } from '@lucide/svelte';

  interface SegmentOption {
    value: T;
    label: string;
    icon?: Component<IconProps>;
    disabled?: boolean;
    title?: string;
  }

  let {
    options,
    value,
    onchange,
    label,
    iconOnly = false,
    distribution = 'equal'
  }: {
    options: readonly SegmentOption[];
    value: T;
    onchange: (value: T) => void;
    label: string;
    iconOnly?: boolean;
    /** `proportional` sizes segments by their labels, like NSSegmentedControl's fit distribution. */
    distribution?: 'equal' | 'proportional';
  } = $props();

  let buttons: HTMLButtonElement[] = $state([]);

  // Roving focus: arrow keys move the selection like a native radio group.
  function onKeydown(event: KeyboardEvent, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : 0;
    if (step === 0) return;
    event.preventDefault();
    for (let offset = 1; offset <= options.length; offset += 1) {
      const next = (index + step * offset + options.length) % options.length;
      if (options[next].disabled) continue;
      onchange(options[next].value);
      buttons[next]?.focus();
      return;
    }
  }
</script>

<div class="segmented" class:proportional={distribution === 'proportional'} role="radiogroup" aria-label={label}>
  {#each options as option, index (option.value)}
    {@const selected = option.value === value}
    <button
      bind:this={buttons[index]}
      type="button"
      role="radio"
      class="segment"
      aria-checked={selected}
      aria-label={iconOnly ? option.label : undefined}
      title={option.title ?? (iconOnly ? option.label : undefined)}
      tabindex={selected ? 0 : -1}
      disabled={option.disabled}
      onclick={() => onchange(option.value)}
      onkeydown={(event) => onKeydown(event, index)}
    >
      {#if option.icon}
        <option.icon class="size-3.5 shrink-0" strokeWidth={2} />
      {/if}
      {#if !iconOnly}
        <span class="segment-label">{option.label}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: flex;
    width: 100%;
    padding: 2px;
    gap: 2px;
    border-radius: 9px;
    background: var(--control-track);
  }

  .segment {
    flex: 1 1 0;
    min-width: 0;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 4px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--foreground);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    cursor: default;
    transition: background-color 0.18s, box-shadow 0.18s;
  }

  .proportional .segment {
    flex: 1 1 auto;
  }

  .segment:not([aria-checked='true']):not(:disabled):hover {
    background: var(--control-hover);
  }

  .segment[aria-checked='true'] {
    background: var(--control-thumb);
    box-shadow:
      0 0 0 0.5px rgb(0 0 0 / 0.04),
      0 2px 6px rgb(0 0 0 / 0.1),
      0 1px 1px rgb(0 0 0 / 0.04);
  }

  .segment:disabled {
    color: var(--muted-foreground);
    opacity: 0.55;
  }

  .segment:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 0;
  }

  .segment-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
