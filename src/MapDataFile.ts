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

  get(key: string): string | null {
    return this.storage.getItem(this.keyPrefix + key);
  }

  set(key: string, value: string): void {
    this.storage.setItem(this.keyPrefix + key, value);
  }

  remove(key: string): void {
    this.storage.removeItem(this.keyPrefix + key);
  }
}
