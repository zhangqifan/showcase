import { prepareBackgroundImage } from '$lib/background-renderer';
import { render } from '$lib/renderer';
import { store } from '$lib/state.svelte';
import { FRAMES } from '$lib/frames';
import { getExportRenderOptions } from '$lib/options';

let mediabunnyPromise: Promise<typeof import('mediabunny')> | null = null;

async function loadMediabunny(): Promise<typeof import('mediabunny')> {
  if (!mediabunnyPromise) mediabunnyPromise = import('mediabunny');
  try {
    return await mediabunnyPromise;
  } catch (e) {
    mediabunnyPromise = null;
    if (import.meta.env.DEV) {
      try {
        return await import(
          /* @vite-ignore */
          `/node_modules/.vite/deps/mediabunny.js?t=${Date.now()}`
        ) as typeof import('mediabunny');
      } catch {
        /* fall through */
      }
    }
    throw e;
  }
}

function chooseBitrate(resolution: number): number {
  return resolution >= 3840 ? 50_000_000
    : resolution >= 1920 ? 25_000_000
    : 12_000_000;
}

async function chooseVideoConfig(
  mb: typeof import('mediabunny'),
  requestedResolution: number
): Promise<{ resolution: number; bitrate: number; hardwareAcceleration: 'prefer-hardware' | 'no-preference' }> {
  const { canEncodeVideo } = mb;
  const candidates = [...new Set([
    requestedResolution,
    Math.min(requestedResolution, 3072),
    Math.min(requestedResolution, 2560),
    Math.min(requestedResolution, 2048),
    1920,
    1080
  ])].filter((v) => Number.isFinite(v) && v > 0);

  for (const res of candidates) {
    const baseBitrate = chooseBitrate(res);
    const variants = [
      { bitrate: baseBitrate, hardwareAcceleration: 'prefer-hardware' as const },
      { bitrate: Math.min(baseBitrate, 25_000_000), hardwareAcceleration: 'prefer-hardware' as const },
      { bitrate: Math.min(baseBitrate, 16_000_000), hardwareAcceleration: 'no-preference' as const }
    ];
    for (const v of variants) {
      const ok = await canEncodeVideo('avc', {
        width: res,
        height: res,
        bitrate: v.bitrate,
        hardwareAcceleration: v.hardwareAcceleration
      });
      if (ok) return { resolution: res, bitrate: v.bitrate, hardwareAcceleration: v.hardwareAcceleration };
    }
  }
  throw new Error('当前浏览器不支持此分辨率的视频编码。请尝试更低分辨率（如 1920 或 1080），或更换浏览器。');
}

function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(u);
}

export interface ExportContext {
  frameImage: HTMLImageElement;
  contentElement: HTMLImageElement | HTMLVideoElement | null;
}

export async function exportImage(
  ctx: ExportContext,
  resolution: number
): Promise<void> {
  const fc = FRAMES[store.model];
  if (!fc) return;

  const c = document.createElement('canvas');
  c.width = resolution;
  c.height = resolution;
  const cx = c.getContext('2d')!;
  const opts = getExportRenderOptions(resolution);
  const background = await prepareBackgroundImage(opts.background, resolution);
  store.setBackgroundError(background.errorMessage);
  render(cx, resolution, ctx.frameImage, fc, ctx.contentElement, opts, background.image);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (blob) downloadBlob(blob, `showcase-${resolution}x${resolution}.png`);
}

const FPS = 30;

export async function exportVideoMP4(
  ctx: ExportContext,
  resolution: number
): Promise<void> {
  const fc = FRAMES[store.model];
  if (!fc) return;

  let mb: typeof import('mediabunny');
  try {
    mb = await loadMediabunny();
  } catch (e) {
    alert('无法加载编码库: ' + e);
    return;
  }

  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource } = mb;
  const selectedConfig = await chooseVideoConfig(mb, resolution);
  const exportResolution = selectedConfig.resolution;

  if (exportResolution !== resolution) {
    alert(`当前浏览器不支持 ${resolution}×${resolution} 编码，已自动降级为 ${exportResolution}×${exportResolution} 导出。`);
  }

  const opts = getExportRenderOptions(exportResolution);
  const background = await prepareBackgroundImage(opts.background, exportResolution);
  store.setBackgroundError(background.errorMessage);
  const oc = document.createElement('canvas');
  oc.width = exportResolution;
  oc.height = exportResolution;
  const ox = oc.getContext('2d')!;

  const vid = document.createElement('video');
  vid.src = store.contentUrl;
  vid.playsInline = true;
  vid.muted = true;
  vid.preload = 'auto';
  await new Promise<void>((ok, fail) => {
    vid.oncanplaythrough = () => ok();
    vid.onerror = () => fail(new Error('无法加载视频'));
    vid.load();
  });

  const duration = vid.duration;

  let audioBuffer: AudioBuffer | null = null;
  try {
    const ab = await (await fetch(store.contentUrl)).arrayBuffer();
    audioBuffer = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(ab);
  } catch { /* no audio */ }

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target
  });

  const videoSource = new CanvasSource(oc, {
    codec: 'avc',
    bitrate: selectedConfig.bitrate,
    hardwareAcceleration: selectedConfig.hardwareAcceleration
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });

  let audioSource: InstanceType<typeof AudioBufferSource> | null = null;
  if (audioBuffer) {
    audioSource = new AudioBufferSource({ codec: 'aac', bitrate: 192_000 });
    output.addAudioTrack(audioSource);
  }

  try {
    await output.start();
  } catch (e) {
    alert('编码器初始化失败: ' + e);
    return;
  }

  store.exportProgress = 0;

  vid.currentTime = 0;
  await new Promise((r) => setTimeout(r, 0));
  render(ox, exportResolution, ctx.frameImage, fc, vid, opts, background.image);
  await videoSource.add(0, 1 / FPS);

  vid.currentTime = 0;
  await vid.play();

  const useRVFC = 'requestVideoFrameCallback' in vid;
  await new Promise<void>((resolve) => {
    let lastT = -1;

    async function captureFrame(mediaTimeSec: number) {
      if (mediaTimeSec <= lastT) return;
      lastT = mediaTimeSec;
      render(ox, exportResolution, ctx.frameImage, fc, vid, opts, background.image);
      await videoSource.add(mediaTimeSec, 1 / FPS);
      store.exportProgress = Math.min(mediaTimeSec / duration, 0.99);
    }

    if (useRVFC) {
      function onRVFC(_now: number, meta: { mediaTime: number }) {
        captureFrame(meta.mediaTime).then(() => {
          if (!vid.ended && !vid.paused) {
            (vid as unknown as { requestVideoFrameCallback(f: typeof onRVFC): void }).requestVideoFrameCallback(onRVFC);
          }
        });
      }
      (vid as unknown as { requestVideoFrameCallback(f: typeof onRVFC): void }).requestVideoFrameCallback(onRVFC);
    } else {
      const ivl = setInterval(() => {
        if (vid.ended || vid.paused) {
          clearInterval(ivl);
          return;
        }
        captureFrame(vid.currentTime);
      }, 1000 / FPS);
      vid.addEventListener('ended', () => clearInterval(ivl), { once: true });
    }

    vid.addEventListener('ended', () => {
      store.exportProgress = 0.99;
      resolve();
    }, { once: true });
  });

  videoSource.close();

  if (audioBuffer && audioSource) {
    try {
      await audioSource.add(audioBuffer);
    } catch { /* skip */ }
    audioSource.close();
  }

  await output.finalize();

  store.exportProgress = 1;
  const blob = new Blob([target.buffer!], { type: 'video/mp4' });
  downloadBlob(blob, `showcase-${exportResolution}x${exportResolution}.mp4`);

  store.exportProgress = -1;
  vid.pause();
  vid.removeAttribute('src');
  vid.load();
}
