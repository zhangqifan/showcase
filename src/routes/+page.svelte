<script lang="ts">
  import Preview from '$lib/components/Preview.svelte';
  import ConfigPanel from '$lib/components/ConfigPanel.svelte';
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
