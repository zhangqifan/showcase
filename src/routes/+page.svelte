<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Preview from '$lib/components/Preview.svelte';
  import ConfigPanel from '$lib/components/ConfigPanel.svelte';
  import { store } from '$lib/state.svelte';

  $effect(() => {
    const snapshot = store.getSnapshot();
    untrack(() => store.recordHistory(snapshot));
  });

  onMount(() => {
    let editingInput: HTMLInputElement | null = null;

    function endInputEdit() {
      if (!editingInput) return;
      editingInput = null;
      store.endHistoryGroup();
    }

    function onInput(event: Event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type === 'file') return;
      if (editingInput === input) return;
      endInputEdit();
      editingInput = input;
      store.beginHistoryGroup();
    }

    function onPointerEnd() {
      if (editingInput?.type === 'range') endInputEdit();
    }

    function onPointerStart(event: PointerEvent) {
      if (event.target !== editingInput) endInputEdit();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.composedPath()[0];
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && !['range', 'color', 'button', 'checkbox', 'radio', 'file', 'submit', 'reset'].includes(target.type))
      )) return;

      event.preventDefault();
      endInputEdit();
      if (event.shiftKey) store.redo();
      else store.undo();
    }

    // Capture input before Svelte handlers mutate the editor state.
    window.addEventListener('input', onInput, true);
    window.addEventListener('change', endInputEdit);
    window.addEventListener('focusout', endInputEdit);
    window.addEventListener('pointerdown', onPointerStart, true);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('blur', endInputEdit);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('input', onInput, true);
      window.removeEventListener('change', endInputEdit);
      window.removeEventListener('focusout', endInputEdit);
      window.removeEventListener('pointerdown', onPointerStart, true);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('blur', endInputEdit);
      window.removeEventListener('keydown', onKeyDown);
      endInputEdit();
      store.clearHistory();
    };
  });
</script>

<div class="app">
  <main>
    <section class="preview-area">
      <Preview />
    </section>
    <aside class="config-area">
      <ConfigPanel />
    </aside>
  </main>
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
  }

  main {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .preview-area {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-preview);
  }

  .config-area {
    width: 380px;
    flex-shrink: 0;
    border-left: 1px solid var(--border);
    background: var(--bg-card);
    overflow-y: auto;
  }

  /* ---- Scrollbar ---- */
  .config-area::-webkit-scrollbar {
    width: 6px;
  }

  .config-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .config-area::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .config-area::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }
</style>
