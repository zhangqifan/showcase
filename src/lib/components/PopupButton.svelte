<script lang="ts" generics="T extends string | number">
  import { ChevronsUpDown } from '@lucide/svelte';

  interface PopupOption {
    value: T;
    label: string;
    disabled?: boolean;
  }

  let {
    options,
    value,
    onchange,
    label,
    id,
    disabled = false
  }: {
    options: readonly PopupOption[];
    value: T;
    onchange: (value: T) => void;
    label?: string;
    id?: string;
    disabled?: boolean;
  } = $props();

  // A native <select> keeps the system menu, type-to-select and keyboard behavior.
  function onChange(event: Event) {
    const index = (event.currentTarget as HTMLSelectElement).selectedIndex;
    const option = options[index];
    if (option) onchange(option.value);
  }
</script>

<div class="popup" class:disabled>
  <select
    {id}
    aria-label={label}
    {disabled}
    onchange={onChange}
  >
    {#each options as option (option.value)}
      <option value={String(option.value)} selected={option.value === value} disabled={option.disabled}>
        {option.label}
      </option>
    {/each}
  </select>
  <span class="popup-indicator" aria-hidden="true">
    <ChevronsUpDown class="size-3" strokeWidth={2.5} />
  </span>
</div>

<style>
  .popup {
    position: relative;
    width: 100%;
    min-width: 0;
  }

  select {
    appearance: none;
    width: 100%;
    height: 28px;
    padding: 0 32px 0 10px;
    border: none;
    border-radius: 8px;
    background: var(--control-thumb);
    box-shadow:
      0 0 0 0.5px var(--control-border),
      0 1px 1.5px rgb(0 0 0 / 0.08);
    color: var(--foreground);
    font: inherit;
    font-size: 13px;
    text-overflow: ellipsis;
    cursor: default;
  }

  select:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 0;
  }

  .popup-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    bottom: 4px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    background: var(--system-accent);
    color: #fff;
    pointer-events: none;
  }

  .disabled select {
    color: var(--muted-foreground);
  }

  .disabled .popup-indicator {
    background: var(--muted-foreground);
    opacity: 0.5;
  }
</style>
