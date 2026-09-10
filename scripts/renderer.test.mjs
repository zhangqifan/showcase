import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

class MockImageElement {
  constructor(naturalWidth = 0, naturalHeight = 0) {
    this.naturalWidth = naturalWidth;
    this.naturalHeight = naturalHeight;
  }
}

class MockVideoElement {}

globalThis.HTMLImageElement = MockImageElement;
globalThis.HTMLVideoElement = MockVideoElement;

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

const [{ render }, { FRAMES, getFrame, getFrameUrl }] = await Promise.all([
  importTypeScript("../src/lib/renderer.ts"),
  importTypeScript("../src/lib/frames.ts"),
]);

function createContext() {
  const calls = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    clearRect(...args) { calls.push(["clearRect", ...args]); },
    fillRect(...args) { calls.push(["fillRect", ...args]); },
    beginPath() { calls.push(["beginPath"]); },
    moveTo(...args) { calls.push(["moveTo", ...args]); },
    lineTo(...args) { calls.push(["lineTo", ...args]); },
    arcTo(...args) { calls.push(["arcTo", ...args]); },
    closePath() { calls.push(["closePath"]); },
    fill() { calls.push(["fill"]); },
    clip() { calls.push(["clip"]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); },
    stroke() { calls.push(["stroke"]); },
    fillText(...args) { calls.push(["fillText", ...args]); },
  };
  return ctx;
}

function renderFrame({ size, frame, content = null, offsetX = 0, offsetY = 0 }) {
  const ctx = createContext();
  const frameImage = new MockImageElement(frame.width, frame.height);
  render(ctx, size, frameImage, frame, content, {
    frameScale: 1,
    frameOffsetX: offsetX,
    frameOffsetY: offsetY,
    background: {
      mode: "solid",
      solidColor: "transparent",
    },
  });
  return { calls: ctx.calls, frameImage };
}

function drawFor(calls, image) {
  return calls.find((call) => call[0] === "drawImage" && call[1] === image);
}

function assertNumbersClose(actual, expected, message) {
  assert.equal(actual.length, expected.length, message);
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) < 1e-9,
      `${message}: expected ${expected[index]} at index ${index}, got ${value}`,
    );
  });
}

test("portrait frames preserve height-based sizing", () => {
  const frame = {
    width: 100,
    height: 200,
    screen: { x: 10, y: 20, w: 80, h: 160, radius: 12 },
    colors: [],
  };
  const { calls, frameImage } = renderFrame({ size: 1000, frame });

  const frameDraw = drawFor(calls, frameImage);
  assertNumbersClose(frameDraw.slice(2), [287.5, 75, 425, 850], "portrait frame draw");
});

test("landscape frames fit their width to 85 percent of the canvas", () => {
  const frame = {
    width: 200,
    height: 100,
    screen: { x: 10, y: 10, w: 180, h: 80, radius: 12 },
    colors: [],
  };
  const { calls, frameImage } = renderFrame({ size: 1000, frame });

  const frameDraw = drawFor(calls, frameImage);
  assertNumbersClose(frameDraw.slice(2), [75, 287.5, 850, 425], "landscape frame draw");
});

test("asymmetric screen corner radii are scaled and mapped clockwise", () => {
  const frame = {
    width: 200,
    height: 100,
    screen: { x: 0, y: 0, w: 200, h: 100, radius: [10, 20, 30, 40] },
    colors: [],
  };
  const { calls } = renderFrame({ size: 1000, frame });
  const firstPathStart = calls.findIndex((call) => call[0] === "beginPath");
  const firstPath = calls.slice(firstPathStart, firstPathStart + 10);

  assertNumbersClose(firstPath[1].slice(1), [117.5, 287.5], "top-left path start");
  assert.deepEqual(
    firstPath.filter((call) => call[0] === "arcTo").map((call) => call.at(-1)),
    [85, 127.5, 170, 42.5],
  );
});

test("content cover geometry and offsets scale across export sizes", () => {
  const frame = {
    width: 200,
    height: 100,
    screen: { x: 10, y: 10, w: 180, h: 80, radius: [8, 8, 8, 8] },
    colors: [],
  };
  const content = new MockImageElement(100, 100);

  for (const size of [1080, 4096]) {
    const ratio = size / 1080;
    const offsetX = 12 * ratio;
    const offsetY = -18 * ratio;
    const { calls } = renderFrame({ size, frame, content, offsetX, offsetY });
    const contentDraw = drawFor(calls, content);

    const frameScale = size * 0.85 / 200;
    const screenX = (size - size * 0.85) / 2 + offsetX + 10 * frameScale;
    const screenY = (size - 100 * frameScale) / 2 + offsetY + 10 * frameScale;
    const screenW = 180 * frameScale;
    const screenH = 80 * frameScale;
    assertNumbersClose(
      contentDraw.slice(2),
      [screenX, screenY + (screenH - screenW) / 2, screenW, screenW],
      `content draw at ${size}px`,
    );
  }
});

test("Duo frame lookup defaults safely and every variant fits the canvas", () => {
  const duo = FRAMES["iPhone Duo"];
  assert.equal(getFrame("iPhone Duo"), duo);
  assert.equal(getFrame("iPhone Duo", "unknown-variant"), duo);
  assert.equal(getFrame("unknown-model"), undefined);

  const expectedVariants = {
    "inner-open-landscape": [3093, 2247],
    "inner-open-portrait": [2247, 3093],
    "outer-closed-portrait": [1574, 2194],
    "outer-closed-landscape": [2194, 1574],
    "outer-open": [3056, 2194],
  };

  for (const [variantId, expectedSize] of Object.entries(expectedVariants)) {
    const frame = getFrame("iPhone Duo", variantId);
    assert.ok(frame, variantId);
    assert.deepEqual([frame.width, frame.height], expectedSize, variantId);

    const { calls, frameImage } = renderFrame({ size: 1000, frame });
    const frameDraw = drawFor(calls, frameImage);
    assert.ok(frameDraw, `${variantId} frame draw`);
    assert.ok(
      Math.abs(Math.max(frameDraw[4], frameDraw[5]) - 850) < 1e-9,
      `${variantId} longest dimension`,
    );
  }
});

test("all Duo color URLs resolve to distinct PNGs matching their variant dimensions", async () => {
  const variants = FRAMES["iPhone Duo"].variants;
  assert.equal(variants.length, 5);

  const urls = [];
  for (const variant of variants) {
    assert.equal(variant.colors.length, 2, variant.id);
    for (const color of variant.colors) {
      const url = getFrameUrl("iPhone Duo", color.name, variant.id);
      urls.push(url);

      const png = await readFile(new URL(`../static${url}`, import.meta.url));
      assert.deepEqual(
        [...png.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
        `${url} PNG signature`,
      );
      assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR", `${url} IHDR`);
      assert.deepEqual(
        [png.readUInt32BE(16), png.readUInt32BE(20)],
        [variant.width, variant.height],
        `${url} dimensions`,
      );
    }
  }

  assert.equal(urls.length, 10);
  assert.equal(new Set(urls).size, 10);
});

test("outer-open content stays on the right and scales its offset before the frame overlay", () => {
  const frame = getFrame("iPhone Duo", "outer-open");
  assert.ok(frame);
  const content = new MockImageElement(frame.screen.w, frame.screen.h);
  const normalizedContentDraws = [];

  for (const size of [1080, 1920]) {
    const ratio = size / 1080;
    const { calls, frameImage } = renderFrame({
      size,
      frame,
      content,
      offsetX: 24 * ratio,
      offsetY: -12 * ratio,
    });
    const contentDrawIndex = calls.findIndex(
      (call) => call[0] === "drawImage" && call[1] === content,
    );
    const clipIndex = calls.findIndex((call) => call[0] === "clip");
    const frameDrawIndex = calls.findIndex(
      (call) => call[0] === "drawImage" && call[1] === frameImage,
    );
    assert.ok(clipIndex >= 0, `${size}px clip call`);
    assert.ok(contentDrawIndex >= 0, `${size}px content draw`);
    assert.ok(frameDrawIndex >= 0, `${size}px frame draw`);
    assert.ok(clipIndex < contentDrawIndex, `${size}px clips content first`);
    assert.ok(contentDrawIndex < frameDrawIndex, `${size}px draws bezel last`);

    const contentDraw = calls[contentDrawIndex];
    const [, , drawX, , drawW] = contentDraw;
    assert.ok(drawX > size / 2, `${size}px screen starts right of center`);
    assert.ok(drawX + drawW <= size, `${size}px screen stays inside canvas`);
    normalizedContentDraws.push(contentDraw.slice(2).map((value) => value / size));
  }

  assertNumbersClose(
    normalizedContentDraws[1],
    normalizedContentDraws[0],
    "outer-open normalized content geometry",
  );
});
