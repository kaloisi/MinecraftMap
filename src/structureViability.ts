import { BiomeId } from './CubiomesTS/biomes';
import { StructureType } from './CubiomesTS/finders';

function isOceanBiome(id: number): boolean {
  return id === BiomeId.ocean || id === BiomeId.frozen_ocean || id === BiomeId.deep_ocean
    || id === BiomeId.warm_ocean || id === BiomeId.lukewarm_ocean || id === BiomeId.cold_ocean
    || id === BiomeId.deep_warm_ocean || id === BiomeId.deep_lukewarm_ocean
    || id === BiomeId.deep_cold_ocean || id === BiomeId.deep_frozen_ocean;
}

function isDeepOceanBiome(id: number): boolean {
  return id === BiomeId.deep_ocean || id === BiomeId.deep_warm_ocean
    || id === BiomeId.deep_lukewarm_ocean || id === BiomeId.deep_cold_ocean
    || id === BiomeId.deep_frozen_ocean;
}

export function isViableStructureBiome(structType: number, biomeId: number): boolean {
  switch (structType) {
    case StructureType.Desert_Pyramid:
      return biomeId === BiomeId.desert;
    case StructureType.Jungle_Temple:
      return biomeId === BiomeId.jungle || biomeId === BiomeId.bamboo_jungle;
    case StructureType.Swamp_Hut:
      return biomeId === BiomeId.swamp || biomeId === BiomeId.mangrove_swamp;
    case StructureType.Igloo:
      return biomeId === BiomeId.snowy_plains || biomeId === BiomeId.snowy_taiga || biomeId === BiomeId.snowy_slopes;
    case StructureType.Village:
      return biomeId === BiomeId.plains || biomeId === BiomeId.desert || biomeId === BiomeId.savanna
        || biomeId === BiomeId.taiga || biomeId === BiomeId.snowy_plains || biomeId === BiomeId.meadow
        || biomeId === BiomeId.cherry_grove;
    case StructureType.Ocean_Ruin:
      return isOceanBiome(biomeId);
    case StructureType.Shipwreck:
      return isOceanBiome(biomeId) || biomeId === BiomeId.beach || biomeId === BiomeId.snowy_beach;
    case StructureType.Monument:
      return isDeepOceanBiome(biomeId);
    case StructureType.Mansion:
      return biomeId === BiomeId.dark_forest;
    case StructureType.Outpost:
      return biomeId === BiomeId.desert || biomeId === BiomeId.plains || biomeId === BiomeId.savanna
        || biomeId === BiomeId.snowy_plains || biomeId === BiomeId.taiga
        || biomeId === BiomeId.meadow || biomeId === BiomeId.frozen_peaks
        || biomeId === BiomeId.jagged_peaks || biomeId === BiomeId.stony_peaks
        || biomeId === BiomeId.snowy_slopes || biomeId === BiomeId.grove
        || biomeId === BiomeId.cherry_grove || biomeId === BiomeId.savanna_plateau;
    case StructureType.Ruined_Portal:
    case StructureType.Ruined_Portal_N:
      return true;
    case StructureType.Ancient_City:
      return biomeId === BiomeId.deep_dark;
    case StructureType.Trail_Ruins:
      return biomeId === BiomeId.old_growth_pine_taiga || biomeId === BiomeId.old_growth_spruce_taiga
        || biomeId === BiomeId.taiga || biomeId === BiomeId.snowy_taiga
        || biomeId === BiomeId.jungle || biomeId === BiomeId.birch_forest;
    case StructureType.Trial_Chambers:
      return biomeId !== BiomeId.deep_dark;
    case StructureType.Fortress:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest
        || biomeId === BiomeId.basalt_deltas;
    case StructureType.Bastion:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest;
    case StructureType.End_City:
      return biomeId === BiomeId.end_midlands || biomeId === BiomeId.end_highlands;
    case StructureType.Treasure:
    case StructureType.Mineshaft:
    case StructureType.Desert_Well:
    case StructureType.Geode:
      return true;
    default:
      return true;
  }
}
