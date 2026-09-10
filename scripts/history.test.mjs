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

const { SnapshotHistory } = await importTypeScript("../src/lib/history.ts");

test("undo and redo traverse recorded snapshots", () => {
  const history = new SnapshotHistory({ value: 0 });
  history.record({ value: 1, label: "one" });
  history.reset({ value: 0 });
  history.record({ value: 1 });
  history.record({ value: 2 });

  assert.deepEqual(history.undo({ value: 2 }), { value: 1 });
  assert.deepEqual(history.undo({ value: 1 }), { value: 0 });
  assert.deepEqual(history.redo({ value: 0 }), { value: 1 });
  assert.deepEqual(history.redo({ value: 1 }), { value: 2 });
  assert.equal(history.redo({ value: 2 }), null);
});

test("no-op records preserve redo while a new branch invalidates it", () => {
  const history = new SnapshotHistory({ value: 0 });
  history.record({ value: 1 });
  history.record({ value: 2 });

  assert.deepEqual(history.undo({ value: 2 }), { value: 1 });
  history.record({ value: 1 });
  assert.deepEqual(history.redo({ value: 1 }), { value: 2 });

  assert.deepEqual(history.undo({ value: 2 }), { value: 1 });
  history.record({ value: 3 });
  assert.equal(history.redo({ value: 3 }), null);
  assert.deepEqual(history.undo({ value: 3 }), { value: 1 });
});

test("deep-equal snapshots deduplicate regardless of object key order", () => {
  const history = new SnapshotHistory({ first: 1, nested: { second: 2, third: 3 } });
  history.record({ nested: { third: 3, second: 2 }, first: 1 });

  assert.equal(history.undo({ first: 1, nested: { second: 2, third: 3 } }), null);
  assert.equal(history.snapshots.length, 1);
});

test("stored and returned nested snapshots are isolated from mutation", () => {
  const initial = {
    background: {
      gradient: {
        stops: [
          { offset: 0, color: "#111111" },
          { offset: 1, color: "#eeeeee" },
        ],
      },
    },
  };
  const next = {
    background: {
      gradient: {
        stops: [
          { offset: 0, color: "#223344" },
          { offset: 1, color: "#ddeeff" },
        ],
      },
    },
  };
  const history = new SnapshotHistory(initial);
  history.record(next);

  initial.background.gradient.stops[0].color = "mutated initial";
  next.background.gradient.stops[0].color = "mutated next";

  const restoredInitial = history.undo({
    background: {
      gradient: {
        stops: [
          { offset: 0, color: "#223344" },
          { offset: 1, color: "#ddeeff" },
        ],
      },
    },
  });
  assert.equal(restoredInitial.background.gradient.stops[0].color, "#111111");
  restoredInitial.background.gradient.stops[0].color = "mutated return value";

  const restoredNext = history.redo({
    background: {
      gradient: {
        stops: [
          { offset: 0, color: "#111111" },
          { offset: 1, color: "#eeeeee" },
        ],
      },
    },
  });
  assert.equal(restoredNext.background.gradient.stops[0].color, "#223344");

  const snapshots = history.snapshots;
  snapshots[0].background.gradient.stops[0].color = "mutated getter value";
  assert.equal(history.snapshots[0].background.gradient.stops[0].color, "#111111");
});

test("a long-running group records one undo step and commits preexisting changes", async () => {
  const history = new SnapshotHistory({ value: 0 });

  history.begin({ value: 1 });
  history.begin({ value: 999 });
  history.record({ value: 2 });
  await new Promise((resolve) => setTimeout(resolve, 10));
  history.record({ value: 3 });
  history.end({ value: 4 });

  assert.deepEqual(history.undo({ value: 4 }), { value: 1 });
  assert.deepEqual(history.undo({ value: 1 }), { value: 0 });
  assert.deepEqual(history.redo({ value: 0 }), { value: 1 });
  assert.deepEqual(history.redo({ value: 1 }), { value: 4 });
});

test("undo finalizes a pending group before traversing history", () => {
  const history = new SnapshotHistory({ value: 0 });
  history.begin({ value: 0 });
  history.record({ value: 1 });

  assert.deepEqual(history.undo({ value: 2 }), { value: 0 });
  assert.deepEqual(history.redo({ value: 0 }), { value: 2 });
});

test("the past is bounded and reset clears history and grouping", () => {
  const history = new SnapshotHistory({ value: 0 }, 2);
  history.record({ value: 1 });
  history.record({ value: 2 });
  history.record({ value: 3 });

  assert.deepEqual(history.snapshots, [{ value: 1 }, { value: 2 }, { value: 3 }]);
  assert.deepEqual(history.undo({ value: 3 }), { value: 2 });
  assert.deepEqual(history.undo({ value: 2 }), { value: 1 });
  assert.equal(history.undo({ value: 1 }), null);

  history.begin({ value: 1 });
  history.reset({ value: 9 });
  history.end({ value: 10 });
  assert.deepEqual(history.snapshots, [{ value: 9 }, { value: 10 }]);
  assert.deepEqual(history.undo({ value: 10 }), { value: 9 });
  history.reset({ value: 20 });
  assert.deepEqual(history.snapshots, [{ value: 20 }]);
  assert.equal(history.undo({ value: 20 }), null);
  assert.equal(history.redo({ value: 20 }), null);
});
