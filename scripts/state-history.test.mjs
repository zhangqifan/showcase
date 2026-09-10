import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileModule } from "svelte/compiler";
import ts from "typescript";

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function transpileTypeScript(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceUrl.pathname,
  }).outputText;
}

function replaceImport(code, specifier, replacement) {
  return code
    .replaceAll(`'${specifier}'`, JSON.stringify(replacement))
    .replaceAll(`"${specifier}"`, JSON.stringify(replacement));
}

async function importStateModule() {
  const dependencyPaths = {
    "$lib/background": "../src/lib/background.ts",
    "$lib/constants": "../src/lib/constants.ts",
    "$lib/frames": "../src/lib/frames.ts",
    "$lib/history": "../src/lib/history.ts",
  };
  const dependencyEntries = await Promise.all(
    Object.entries(dependencyPaths).map(async ([specifier, path]) => [
      specifier,
      toDataUrl(await transpileTypeScript(path)),
    ]),
  );

  const stateSource = await transpileTypeScript("../src/lib/state.svelte.ts");
  let compiled = compileModule(stateSource, {
    filename: "state.svelte.js",
    generate: "client",
  }).js.code;

  compiled = replaceImport(
    compiled,
    "svelte/internal/client",
    import.meta.resolve("svelte/internal/client"),
  );
  for (const [specifier, dataUrl] of dependencyEntries) {
    compiled = replaceImport(compiled, specifier, dataUrl);
  }

  const stateUrl = toDataUrl(compiled);
  let optionsCode = await transpileTypeScript("../src/lib/options.ts");
  for (const [specifier, dataUrl] of dependencyEntries) {
    optionsCode = replaceImport(optionsCode, specifier, dataUrl);
  }
  optionsCode = replaceImport(optionsCode, "$lib/state.svelte", stateUrl);

  return {
    ...await import(stateUrl),
    ...await import(toDataUrl(optionsCode)),
  };
}

const { AppStore, store: sharedStore, getExportRenderOptions } = await importStateModule();

async function assertBlobUrl(url, expected) {
  const response = await fetch(url);
  assert.equal(await response.text(), expected);
}

async function assertRevoked(url) {
  await assert.rejects(fetch(url), TypeError);
}

function releaseAllContent(store) {
  store.clearContent();
  store.clearHistory();
}

test("model and normalized color undo atomically", () => {
  const store = new AppStore();

  store.setModel("iPhone 17");
  store.recordHistory();
  assert.deepEqual([store.model, store.color], ["iPhone 17", "Black"]);

  assert.equal(store.undo(), true);
  assert.deepEqual([store.model, store.color], ["iPhone 17 Pro", "Silver"]);
  assert.equal(store.redo(), true);
  assert.deepEqual([store.model, store.color], ["iPhone 17", "Black"]);
});

test("undo restores the complete editor snapshot", () => {
  const store = new AppStore();
  const editedGradient = {
    ...store.staticMeshGradient,
    colors: ["#010203", "#aabbcc", "#fedcba"],
    positions: 71,
    rotation: 123,
  };

  store.setModel("iPhone Duo");
  store.setFrameVariant("outer-open");
  store.backgroundMode = "staticMeshGradient";
  store.backgroundColor = "#121212";
  store.staticMeshGradient = editedGradient;
  store.frameScale = 1.75;
  store.frameOffsetX = 140;
  store.frameOffsetY = -90;
  store.recordHistory();
  const expected = store.getSnapshot();

  store.setModel("iPhone Air");
  store.backgroundMode = "solid";
  store.backgroundColor = "#ffffff";
  store.staticMeshGradient.colors[0] = "#ffffff";
  store.frameScale = 0.8;
  store.frameOffsetX = 0;
  store.frameOffsetY = 0;
  store.recordHistory();

  assert.equal(store.undo(), true);
  assert.deepEqual(store.getSnapshot(), expected);
});

test("a history group collapses continuous editor updates", () => {
  const store = new AppStore();

  store.beginHistoryGroup();
  for (let offset = 10; offset <= 50; offset += 10) {
    store.frameOffsetX = offset;
    store.frameOffsetY = -offset;
    store.recordHistory();
  }
  store.endHistoryGroup();

  assert.equal(store.undo(), true);
  assert.deepEqual([store.frameOffsetX, store.frameOffsetY], [0, 0]);
  assert.equal(store.undo(), false);
  assert.equal(store.redo(), true);
  assert.deepEqual([store.frameOffsetX, store.frameOffsetY], [50, -50]);
});

test("transient export and media state is excluded from editor history", () => {
  const store = new AppStore();

  store.exportProgress = 0.25;
  store.setBackgroundError("first background error");
  store.setMediaMeshStyleLoading();
  store.recordHistory();

  store.frameScale = 1.5;
  store.recordHistory();
  store.exportProgress = 0.75;
  store.setBackgroundError("current background error");
  store.setMediaMeshStyleError("current media error");

  assert.equal(store.undo(), true);
  assert.equal(store.frameScale, 1);
  assert.equal(store.exportProgress, 0.75);
  assert.equal(store.backgroundError, "current background error");
  assert.equal(store.mediaMeshStyleStatus, "error");
  assert.equal(store.mediaMeshStyleError, "current media error");
  assert.equal(store.undo(), false);
});

test("Blob URLs survive replacement and deletion history traversal", async () => {
  const store = new AppStore();
  store.setContent(new Blob(["first"], { type: "image/png" }));
  const firstUrl = store.contentUrl;
  store.recordHistory();

  store.setContent(new Blob(["second"], { type: "video/mp4" }));
  const secondUrl = store.contentUrl;
  store.recordHistory();
  await assertBlobUrl(firstUrl, "first");
  await assertBlobUrl(secondUrl, "second");

  assert.equal(store.undo(), true);
  assert.deepEqual([store.contentUrl, store.contentType], [firstUrl, "image"]);
  await assertBlobUrl(secondUrl, "second");
  assert.equal(store.redo(), true);
  assert.deepEqual([store.contentUrl, store.contentType], [secondUrl, "video"]);

  store.clearContent();
  store.recordHistory();
  assert.equal(store.undo(), true);
  assert.equal(store.contentUrl, secondUrl);
  assert.equal(store.redo(), true);
  assert.deepEqual([store.contentUrl, store.contentType], ["", null]);
  await assertBlobUrl(firstUrl, "first");
  await assertBlobUrl(secondUrl, "second");

  releaseAllContent(store);
  await assertRevoked(firstUrl);
  await assertRevoked(secondUrl);
});

test("discarding a redo branch revokes its unreferenced Blob URL", async () => {
  const store = new AppStore();
  store.setContent(new Blob(["first"], { type: "image/png" }));
  const firstUrl = store.contentUrl;
  store.recordHistory();
  store.setContent(new Blob(["discarded"], { type: "image/png" }));
  const discardedUrl = store.contentUrl;
  store.recordHistory();

  assert.equal(store.undo(), true);
  await assertBlobUrl(discardedUrl, "discarded");
  store.frameScale = 1.25;
  store.recordHistory();

  await assertRevoked(discardedUrl);
  await assertBlobUrl(firstUrl, "first");
  assert.equal(store.redo(), false);

  releaseAllContent(store);
});

test("history eviction and reset revoke unreferenced Blob URLs", async () => {
  const store = new AppStore();
  let firstUrl = "";
  let latestUrl = "";

  for (let index = 1; index <= 102; index += 1) {
    store.setContent(new Blob([`content ${index}`], { type: "image/png" }));
    if (index === 1) firstUrl = store.contentUrl;
    latestUrl = store.contentUrl;
    store.recordHistory();
  }

  await assertRevoked(firstUrl);
  await assertBlobUrl(latestUrl, "content 102");

  store.clearHistory();
  await assertBlobUrl(latestUrl, "content 102");
  store.clearContent();
  store.clearHistory();
  await assertRevoked(latestUrl);
});


test("export preserves composition at each output size and snapshots the background", () => {
  sharedStore.frameScale = 1.25;
  sharedStore.frameOffsetX = 240;
  sharedStore.frameOffsetY = -160;
  sharedStore.backgroundMode = "staticMeshGradient";
  const originalColors = [...sharedStore.staticMeshGradient.colors];

  const outputs = [1080, 1920].map((resolution) => ({
    resolution,
    options: getExportRenderOptions(resolution),
  }));
  sharedStore.staticMeshGradient.colors[0] = "#123456";

  for (const { resolution, options } of outputs) {
    assert.equal(options.frameScale, 1.25);
    assert.ok(Math.abs(options.frameOffsetX / resolution - 0.12) < 1e-12);
    assert.ok(Math.abs(options.frameOffsetY / resolution + 0.08) < 1e-12);
    assert.equal(options.background.mode, "staticMeshGradient");
    assert.deepEqual(options.background.staticMeshGradient.colors, originalColors);
  }
  assert.deepEqual([sharedStore.frameOffsetX, sharedStore.frameOffsetY], [240, -160]);
});
