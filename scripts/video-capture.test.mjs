import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScript(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceUrl.pathname,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

const { captureVideoFrames } = await importTypeScript("../src/lib/video-capture.ts");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class FakeVideo {
  currentTime = 0;
  ended = false;
  paused = true;
  listeners = new Map();
  frameCallbacks = new Map();
  nextFrameCallbackId = 1;
  cancelledFrameCallbacks = [];

  async play() {
    this.paused = false;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  requestVideoFrameCallback(callback) {
    const id = this.nextFrameCallbackId++;
    this.frameCallbacks.set(id, callback);
    return id;
  }

  cancelVideoFrameCallback(id) {
    this.cancelledFrameCallbacks.push(id);
    this.frameCallbacks.delete(id);
  }

  emitFrame(mediaTime) {
    const [entry] = this.frameCallbacks.entries();
    assert.ok(entry, "expected a scheduled video frame callback");
    const [id, callback] = entry;
    this.frameCallbacks.delete(id);
    callback(0, { mediaTime });
  }

  end() {
    this.ended = true;
    this.paused = true;
    for (const listener of this.listeners.get("ended") ?? []) listener();
  }
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("the explicit first frame prevents a duplicate timestamp zero", async () => {
  const video = new FakeVideo();
  const timestamps = [];
  const capture = captureVideoFrames(video, {
    fps: 30,
    async writeFrame(timestamp) {
      timestamps.push(timestamp);
    },
  });

  await flushMicrotasks();
  video.emitFrame(0);
  video.emitFrame(0.25);
  await flushMicrotasks();
  video.end();
  await capture;

  assert.deepEqual(timestamps, [0, 0.25]);
});

test("completion waits for a pending tail frame", async () => {
  const video = new FakeVideo();
  const tail = deferred();
  let completed = false;
  const capture = captureVideoFrames(video, {
    fps: 30,
    writeFrame(timestamp) {
      return timestamp === 0 ? Promise.resolve() : tail.promise;
    },
  }).then(() => { completed = true; });

  await flushMicrotasks();
  video.emitFrame(0.5);
  await flushMicrotasks();
  video.end();
  await flushMicrotasks();
  assert.equal(completed, false);

  tail.resolve();
  await capture;
  assert.equal(completed, true);
});

test("a rejected frame write rejects capture and cancels rVFC state", async () => {
  const video = new FakeVideo();
  const frameError = new Error("frame failed");
  const capture = captureVideoFrames(video, {
    fps: 30,
    writeFrame(timestamp) {
      return timestamp === 0 ? Promise.resolve() : Promise.reject(frameError);
    },
  });

  await flushMicrotasks();
  video.emitFrame(0.5);
  await assert.rejects(capture, frameError);
  assert.equal(video.frameCallbacks.size, 0);
  assert.equal(video.listeners.get("ended")?.size, 0);
});

test("the interval fallback applies backpressure and is cleared on end", async () => {
  const video = new FakeVideo();
  video.requestVideoFrameCallback = undefined;
  video.cancelVideoFrameCallback = undefined;
  const callbacks = new Map();
  const cleared = [];
  const scheduler = {
    setInterval(callback) {
      callbacks.set(1, callback);
      return 1;
    },
    clearInterval(id) {
      cleared.push(id);
      callbacks.delete(id);
    },
  };
  const tail = deferred();
  const timestamps = [];
  const capture = captureVideoFrames(video, {
    fps: 30,
    scheduler,
    writeFrame(timestamp) {
      timestamps.push(timestamp);
      return timestamp === 0 ? Promise.resolve() : tail.promise;
    },
  });

  await flushMicrotasks();
  video.currentTime = 0.2;
  callbacks.get(1)();
  await flushMicrotasks();
  video.currentTime = 0.4;
  callbacks.get(1)();
  video.end();

  assert.deepEqual(timestamps, [0, 0.2]);
  assert.deepEqual(cleared, [1]);
  tail.resolve();
  await capture;
  assert.equal(video.listeners.get("ended")?.size, 0);
});
