/**
 * A Minecraft world seed. Seeds are 64-bit signed integers represented as
 * BigInt. They uniquely identify a world's terrain, biome layout, and
 * structure placement.
 */
export type Seed = bigint;

/**
 * Pluggable raw key-value backend that MapDataStorage wraps.
 *
 * Matches the browser's Storage interface (localStorage, sessionStorage).
 * Implement this to substitute alternative backends such as IndexedDB
 * or an in-memory store for testing.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Typed key-value storage layer over a raw StorageBackend.
 *
 * Provides serialization/deserialization for common data types
 * (string, number, boolean, JSON) so that both MapDataFile and
 * MapDataFiles can work with typed values without duplicating
 * conversion logic.
 *
 * The default backend is the browser's localStorage.
 */
export class MapDataStorage {
  private readonly backend: StorageBackend;

  constructor(backend: StorageBackend = localStorage) {
    this.backend = backend;
  }

  getString(key: string): string | null {
    return this.backend.getItem(key);
  }

  setString(key: string, value: string): void {
    this.backend.setItem(key, value);
  }

  getNumber(key: string): number | null {
    const raw = this.backend.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }

  setNumber(key: string, value: number): void {
    this.backend.setItem(key, String(value));
  }

  getBoolean(key: string): boolean | null {
    const raw = this.backend.getItem(key);
    if (raw === null) return null;
    return raw === 'true';
  }

  setBoolean(key: string, value: boolean): void {
    this.backend.setItem(key, String(value));
  }

  getJSON<T>(key: string): T | null {
    const raw = this.backend.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  setJSON<T>(key: string, value: T): void {
    this.backend.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.backend.removeItem(key);
  }
}
