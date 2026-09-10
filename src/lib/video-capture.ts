export interface VideoFrameCaptureScheduler {
  setInterval(callback: () => void, delayMs: number): unknown;
  clearInterval(id: unknown): void;
}

export interface VideoFrameCaptureOptions {
  fps: number;
  writeFrame(timestamp: number): Promise<void>;
  onFrameWritten?(timestamp: number): void;
  scheduler?: VideoFrameCaptureScheduler;
}

const browserScheduler: VideoFrameCaptureScheduler = {
  setInterval: (callback, delayMs) => globalThis.setInterval(callback, delayMs),
  clearInterval: (id) => globalThis.clearInterval(id as number)
};

export async function captureVideoFrames(
  video: HTMLVideoElement,
  options: VideoFrameCaptureOptions
): Promise<void> {
  if (!Number.isFinite(options.fps) || options.fps <= 0) {
    throw new TypeError('fps must be a positive number.');
  }

  let lastTimestamp = -Infinity;
  const writeFrame = async (timestamp: number) => {
    lastTimestamp = timestamp;
    await options.writeFrame(timestamp);
    options.onFrameWritten?.(timestamp);
  };

  await writeFrame(0);

  const requestFrame = typeof video.requestVideoFrameCallback === 'function'
    ? video.requestVideoFrameCallback.bind(video)
    : null;
  const cancelFrame = typeof video.cancelVideoFrameCallback === 'function'
    ? video.cancelVideoFrameCallback.bind(video)
    : null;
  const scheduler = options.scheduler ?? browserScheduler;

  let intervalId: unknown;
  let frameCallbackId: number | undefined;
  let pendingWrite: Promise<void> | null = null;
  let finishing = false;
  let settled = false;
  let resolveCompletion: () => void;
  let rejectCompletion: (reason: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  void completion.catch(() => {});

  const stopScheduling = () => {
    if (frameCallbackId !== undefined) {
      cancelFrame?.(frameCallbackId);
      frameCallbackId = undefined;
    }
    if (intervalId !== undefined) {
      scheduler.clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const cleanup = () => {
    stopScheduling();
    video.removeEventListener('ended', finish);
  };

  const succeed = () => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveCompletion();
  };

  const fail = (reason: unknown) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectCompletion(reason);
  };

  const finish = () => {
    if (finishing || settled) return;
    finishing = true;
    stopScheduling();
    if (!pendingWrite) succeed();
  };

  const scheduleFrameCallback = () => {
    if (!requestFrame || finishing || settled || video.ended || video.paused) return;
    frameCallbackId = requestFrame(onVideoFrame);
  };

  const queueFrame = (timestamp: number): boolean => {
    if (
      finishing
      || settled
      || pendingWrite
      || !Number.isFinite(timestamp)
      || timestamp < 0
      || timestamp <= lastTimestamp
    ) {
      return false;
    }

    const write = Promise.resolve().then(() => writeFrame(timestamp));
    pendingWrite = write;
    void write.then(() => {
      if (pendingWrite === write) pendingWrite = null;
      if (finishing) succeed();
      else scheduleFrameCallback();
    }, fail);
    return true;
  };

  function onVideoFrame(_now: number, metadata: VideoFrameCallbackMetadata) {
    frameCallbackId = undefined;
    if (!queueFrame(metadata.mediaTime)) scheduleFrameCallback();
  }

  video.addEventListener('ended', finish);

  try {
    await video.play();
    if (video.ended) finish();
    else if (requestFrame) scheduleFrameCallback();
    else {
      intervalId = scheduler.setInterval(() => {
        if (!video.ended && !video.paused) queueFrame(video.currentTime);
      }, 1000 / options.fps);
    }
    await completion;
  } finally {
    cleanup();
  }
}
