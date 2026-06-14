/**
 * A Minecraft world seed. Seeds are 64-bit signed integers represented as
 * BigInt. They uniquely identify a world's terrain, biome layout, and
 * structure placement.
 */
export type Seed = bigint;

/**
 * Pluggable key-value storage backend for map data persistence.
 *
 * The default implementation uses the browser's localStorage, but this
 * interface allows substituting alternative backends such as IndexedDB,
 * sessionStorage, or an in-memory store for testing.
 *
 * All values are stored as strings — typed serialization/deserialization
 * is handled by MapDataFile's utility methods.
 */
export interface MapDataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
