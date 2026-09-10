type StoredSnapshot = string;

function storeSnapshot<T>(snapshot: T): StoredSnapshot {
  const stored = JSON.stringify(snapshot, (_key, value: unknown) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });

  if (stored === undefined) {
    throw new TypeError("Snapshot must be JSON-compatible");
  }

  return stored;
}

function restoreSnapshot<T>(snapshot: StoredSnapshot): T {
  return JSON.parse(snapshot) as T;
}

export class SnapshotHistory<T> {
  private readonly limit: number;
  private past: StoredSnapshot[] = [];
  private current: StoredSnapshot;
  private future: StoredSnapshot[] = [];
  private grouping = false;

  constructor(initial: T, limit = 100) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError("History limit must be a non-negative integer");
    }

    this.limit = limit;
    this.current = storeSnapshot(initial);
  }

  record(snapshot: T): void {
    if (this.grouping) return;

    const next = storeSnapshot(snapshot);
    if (next === this.current) return;

    this.pushPast(this.current);
    this.current = next;
    this.future = [];
  }

  begin(snapshot: T): void {
    if (this.grouping) return;

    this.record(snapshot);
    this.grouping = true;
  }

  end(snapshot: T): void {
    this.grouping = false;
    this.record(snapshot);
  }

  undo(snapshot: T): T | null {
    this.finishPendingChanges(snapshot);

    const previous = this.past.pop();
    if (previous === undefined) return null;

    this.future.push(this.current);
    this.current = previous;
    return restoreSnapshot<T>(this.current);
  }

  redo(snapshot: T): T | null {
    this.finishPendingChanges(snapshot);

    const next = this.future.pop();
    if (next === undefined) return null;

    this.pushPast(this.current);
    this.current = next;
    return restoreSnapshot<T>(this.current);
  }

  get snapshots(): T[] {
    return [...this.past, this.current, ...this.future].map((snapshot) =>
      restoreSnapshot<T>(snapshot),
    );
  }

  reset(snapshot: T): void {
    this.past = [];
    this.current = storeSnapshot(snapshot);
    this.future = [];
    this.grouping = false;
  }

  private finishPendingChanges(snapshot: T): void {
    if (this.grouping) {
      this.end(snapshot);
    } else {
      this.record(snapshot);
    }
  }

  private pushPast(snapshot: StoredSnapshot): void {
    this.past.push(snapshot);

    const overflow = this.past.length - this.limit;
    if (overflow > 0) this.past.splice(0, overflow);
  }
}
