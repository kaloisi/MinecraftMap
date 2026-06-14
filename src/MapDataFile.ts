import type { Seed } from './MapDataStorage';
import { MapDataStorage } from './MapDataStorage';

/**
 * Per-seed data store for a single Minecraft world.
 *
 * Each MapDataFile namespaces its keys under `map:<seed>:` so that
 * multiple worlds can coexist in the same storage backend without
 * collisions. All typed get/set operations are delegated to the
 * underlying {@link MapDataStorage} instance.
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

  constructor(seed: Seed, storage: MapDataStorage = new MapDataStorage()) {
    this.seed = seed;
    this.storage = storage;
    this.keyPrefix = `map:${seed.toString()}:`;
  }

  getSeed(): Seed {
    return this.seed;
  }

  getString(key: string): string | null {
    return this.storage.getString(this.keyPrefix + key);
  }

  setString(key: string, value: string): void {
    this.storage.setString(this.keyPrefix + key, value);
  }

  getNumber(key: string): number | null {
    return this.storage.getNumber(this.keyPrefix + key);
  }

  setNumber(key: string, value: number): void {
    this.storage.setNumber(this.keyPrefix + key, value);
  }

  getBoolean(key: string): boolean | null {
    return this.storage.getBoolean(this.keyPrefix + key);
  }

  setBoolean(key: string, value: boolean): void {
    this.storage.setBoolean(this.keyPrefix + key, value);
  }

  getJSON<T>(key: string): T | null {
    return this.storage.getJSON<T>(this.keyPrefix + key);
  }

  setJSON<T>(key: string, value: T): void {
    this.storage.setJSON(this.keyPrefix + key, value);
  }

  remove(key: string): void {
    this.storage.remove(this.keyPrefix + key);
  }
}
