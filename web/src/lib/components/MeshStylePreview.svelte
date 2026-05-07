<script lang="ts">
  import { createBackgroundRenderConfig, type StaticMeshGradientConfig } from '$lib/background';
  import { prepareBackgroundImage } from '$lib/background-renderer';

  let {
    config,
    width = 28,
    height = 18,
    cacheKey = ''
  }: {
    config: StaticMeshGradientConfig;
    width?: number;
    height?: number;
    cacheKey?: string;
  } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);

  $effect(() => {
    let active = true;
    const size = Math.max(width, height) * 2;
    const background = createBackgroundRenderConfig('staticMeshGradient', '#ffffff', config);

    void prepareBackgroundImage(background, size, `mesh-chip-preview:${cacheKey}`).then((result) => {
      if (!active || !canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);

      if (result.image) {
        context.drawImage(result.image, 0, 0, width, height);
      } else {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
    });

    return () => {
      active = false;
    };
  });
</script>

<canvas bind:this={canvas} width={width} height={height}></canvas>

<style>
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: inherit;
    background: #fff;
  }
</style>
