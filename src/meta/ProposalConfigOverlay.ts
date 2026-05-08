export interface OverlayEntry {
  key: string;
  value: unknown;
}

export class ProposalConfigOverlay {
  private store = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  get(key: string): unknown {
    return this.store.get(key);
  }

  entries(): OverlayEntry[] {
    return Array.from(this.store.entries(), ([key, value]) => ({ key, value }));
  }

  clear(): void {
    this.store.clear();
  }

  async withOverlay<T>(entries: OverlayEntry[], fn: () => Promise<T>): Promise<T> {
    this.clear();
    for (const entry of entries) {
      this.set(entry.key, entry.value);
    }

    try {
      return await fn();
    } finally {
      this.clear();
    }
  }
}
