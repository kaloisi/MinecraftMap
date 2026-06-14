import type { Seed, MapDataStorage } from './MapDataStorage';

/**
 * Per-seed data store for a single Minecraft world.
 *
 * Each MapDataFile namespaces its keys under `map:<seed>:` so that
 * multiple worlds can coexist in the same storage backend without
 * collisions. Typed getter/setter pairs handle serialization for
 * common value types (string, number, boolean, JSON objects).
 *
 * Instances are created via {@link MapDataFiles.getMapDataFile} rather
 * than constructed directly, so the factory can track known seeds.
 *
 * Example stored keys for seed 12345:
 *   map:12345:viewportX   → number (last pan position)
 *   map:12345:viewportZ   → number
 *   map:12345:zoom        → number
 *   map:12345:overlays    → JSON (enabled structure overlay config)
 */
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
