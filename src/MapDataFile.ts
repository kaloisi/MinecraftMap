import type { Seed, MapDataStorage } from './MapDataStorage';

export class MapDataFile {
  private readonly seed: Seed;
  private readonly storage: MapDataStorage;
  private readonly keyPrefix: string;

  constructor(seed: Seed, storage: MapDataStorage = localStorage) {
    this.seed = seed;
    this.storage = storage;
    this.keyPrefix = `map:${seed.toString()}:`;
  }

  getSeed(): Seed {
    return this.seed;
  }

  getString(key: string): string | null {
    return this.storage.getItem(this.keyPrefix + key);
  }

  setString(key: string, value: string): void {
    this.storage.setItem(this.keyPrefix + key, value);
  }

  getNumber(key: string): number | null {
    const raw = this.storage.getItem(this.keyPrefix + key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }

  setNumber(key: string, value: number): void {
    this.storage.setItem(this.keyPrefix + key, String(value));
  }

  getBoolean(key: string): boolean | null {
    const raw = this.storage.getItem(this.keyPrefix + key);
    if (raw === null) return null;
    return raw === 'true';
  }

  setBoolean(key: string, value: boolean): void {
    this.storage.setItem(this.keyPrefix + key, String(value));
  }

  getJSON<T>(key: string): T | null {
    const raw = this.storage.getItem(this.keyPrefix + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  setJSON<T>(key: string, value: T): void {
    this.storage.setItem(this.keyPrefix + key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.removeItem(this.keyPrefix + key);
  }
}
