export type Seed = bigint;

export interface MapDataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

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

const SEEDS_KEY = 'mapdata:seeds';
const MOST_RECENT_SEED_KEY = 'mapdata:mostRecentSeed';

export class MapDataFiles {
  private readonly storage: MapDataStorage;

  constructor(storage: MapDataStorage = localStorage) {
    this.storage = storage;
  }

  getMapDataFile(seed: Seed): MapDataFile {
    const seeds = this.getExistingSeeds();
    seeds.add(seed);
    this.saveSeeds(seeds);
    this.storage.setItem(MOST_RECENT_SEED_KEY, seed.toString());
    return new MapDataFile(seed, this.storage);
  }

  getExistingSeeds(): Set<Seed> {
    const raw = this.storage.getItem(SEEDS_KEY);
    if (!raw) return new Set();
    const arr: Seed[] = JSON.parse(raw).map((s: string) => BigInt(s));
    return new Set(arr);
  }

  getMostRecentSeed(): Seed | null {
    const raw = this.storage.getItem(MOST_RECENT_SEED_KEY);
    if (!raw) return null;
    return BigInt(raw);
  }

  private saveSeeds(seeds: Set<Seed>): void {
    const arr = Array.from(seeds).map((s) => s.toString());
    this.storage.setItem(SEEDS_KEY, JSON.stringify(arr));
  }
}
