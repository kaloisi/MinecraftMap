import type { Seed } from './MapDataStorage';
import { MapDataStorage } from './MapDataStorage';
import { MapDataFile } from './MapDataFile';

const SEEDS_KEY = 'mapdata:seeds';
const MOST_RECENT_SEED_KEY = 'mapdata:mostRecentSeed';

/**
 * Factory and registry for MapDataFile instances.
 *
 * MapDataFiles maintains a persistent set of all seeds the user has
 * explored and tracks the most recently used seed. This enables UI
 * features like a "recent worlds" list and restoring the last session
 * on page load.
 *
 * Registry data is stored at the top level of the storage backend:
 *   mapdata:seeds          → JSON array of seed strings
 *   mapdata:mostRecentSeed → single seed string
 *
 * Per-seed data lives under the `map:<seed>:` namespace managed by
 * each MapDataFile instance.
 */
export class MapDataFiles {
  private readonly storage: MapDataStorage;

  constructor(storage: MapDataStorage = new MapDataStorage()) {
    this.storage = storage;
  }

  getMapDataFile(seed: Seed): MapDataFile {
    const seeds = this.getExistingSeeds();
    seeds.add(seed);
    this.saveSeeds(seeds);
    this.storage.setString(MOST_RECENT_SEED_KEY, seed.toString());
    return new MapDataFile(seed, this.storage);
  }

  getExistingSeeds(): Set<Seed> {
    const raw = this.storage.getJSON<string[]>(SEEDS_KEY);
    if (!raw) return new Set();
    return new Set(raw.map((s) => BigInt(s)));
  }

  getMostRecentSeed(): Seed | null {
    const raw = this.storage.getString(MOST_RECENT_SEED_KEY);
    if (!raw) return null;
    return BigInt(raw);
  }

  private saveSeeds(seeds: Set<Seed>): void {
    const arr = Array.from(seeds).map((s) => s.toString());
    this.storage.setJSON(SEEDS_KEY, arr);
  }
}
