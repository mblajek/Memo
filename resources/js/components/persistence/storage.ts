export interface Storage<S = string> {
  store(value: S): void;
  load(): S | undefined;
  clear(): void;
}

export class LocalStorageStorage implements Storage {
  constructor(readonly key: string) {}

  store(value: string) {
    localStorage.setItem(this.key, value);
  }

  load() {
    return localStorage.getItem(this.key) ?? undefined;
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}
