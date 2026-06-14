import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import AddIcon from '@mui/icons-material/Add';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MapViewer from './MapViewer';
import type { MapViewerHandle } from './MapViewer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { Dimension, MCVersion, StructureType, isSlimeChunk, getStructureConfig, getStructurePos } from './CubiomesTS';
import { lookupBiomeName } from './components/CubiomesMap';
import { MapDataFiles } from './MapDataFiles';
import type { MapDataFile } from './MapDataFile';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

const DEFAULT_SEED = 6770262141636552371n;

function formatCoord(n: number): string {
  return Number.isNaN(n) ? '0' : n.toLocaleString('en-US');
}

function parseCoord(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10);
}
const mapDataFiles = new MapDataFiles();

function loadStateFromFile(file: MapDataFile, seed: bigint) {
  const version = file.getNumber('mcVersion') as MCVersion | null;
  const structures = file.getJSON<number[]>('enabledStructures');
  const x = file.getNumber('centerX');
  const z = file.getNumber('centerZ');
  const name = file.getString('mapName');
  const zoom = file.getNumber('zoom');
  return {
    mcVersion: version ?? MCVersion.MC_1_21,
    enabledStructures: new Set<StructureType>(structures ?? []),
    centerX: x ?? 0,
    centerZ: z ?? 0,
    mapName: name ?? seed.toString(),
    zoom: zoom ?? 4,
  };
}

function parseSeedFromHash(): bigint | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#seed=')) return null;
  const raw = decodeURIComponent(hash.slice(6));
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function setSeedInHash(seed: bigint) {
  const newHash = `#seed=${seed.toString()}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function getInitialSeed(): bigint {
  return parseSeedFromHash() ?? mapDataFiles.getMostRecentSeed() ?? DEFAULT_SEED;
}

function getInitialState() {
  const seed = getInitialSeed();
  const file = mapDataFiles.getMapDataFile(seed);
  return { seed, ...loadStateFromFile(file, seed) };
}

interface StructureEntry { type: StructureType; label: string }
interface StructureGroup { dimension: string; entries: StructureEntry[] }

const STRUCTURE_GROUPS: StructureGroup[] = [
  {
    dimension: 'Overworld',
    entries: [
      { type: StructureType.Village, label: 'Village' },
      { type: StructureType.Desert_Pyramid, label: 'Desert Pyramid' },
      { type: StructureType.Jungle_Temple, label: 'Jungle Temple' },
      { type: StructureType.Swamp_Hut, label: 'Swamp Hut' },
      { type: StructureType.Igloo, label: 'Igloo' },
      { type: StructureType.Ocean_Ruin, label: 'Ocean Ruin' },
      { type: StructureType.Shipwreck, label: 'Shipwreck' },
      { type: StructureType.Monument, label: 'Monument' },
      { type: StructureType.Mansion, label: 'Mansion' },
      { type: StructureType.Outpost, label: 'Outpost' },
      { type: StructureType.Ruined_Portal, label: 'Ruined Portal' },
      { type: StructureType.Ancient_City, label: 'Ancient City' },
      { type: StructureType.Treasure, label: 'Treasure' },
      { type: StructureType.Mineshaft, label: 'Mineshaft' },
      { type: StructureType.Desert_Well, label: 'Desert Well' },
      { type: StructureType.Geode, label: 'Geode' },
      { type: StructureType.Trail_Ruins, label: 'Trail Ruins' },
      { type: StructureType.Trial_Chambers, label: 'Trial Chambers' },
    ],
  },
  {
    dimension: 'The Nether',
    entries: [
      { type: StructureType.Fortress, label: 'Fortress' },
      { type: StructureType.Bastion, label: 'Bastion' },
      { type: StructureType.Ruined_Portal_N, label: 'Ruined Portal' },
    ],
  },
  {
    dimension: 'The End',
    entries: [
      { type: StructureType.End_City, label: 'End City' },
      { type: StructureType.End_Gateway, label: 'End Gateway' },
      { type: StructureType.End_Island, label: 'End Island' },
    ],
  },
];

const VERSION_ENTRIES: { version: MCVersion; label: string }[] = [
  { version: MCVersion.MC_1_21, label: '1.21' },
  { version: MCVersion.MC_1_20, label: '1.20' },
  { version: MCVersion.MC_1_19, label: '1.19' },
  { version: MCVersion.MC_1_18, label: '1.18' },
];

export default function App() {
  const initial = useMemo(getInitialState, []);
  const [seed, setSeed] = useState(initial.seed);
  const [dimension, setDimension] = useState<Dimension>(Dimension.DIM_OVERWORLD);
  const [mcVersion, setMcVersion] = useState<MCVersion>(initial.mcVersion);
  const [enabledStructures, setEnabledStructures] = useState<Set<StructureType>>(initial.enabledStructures);
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [structMenuAnchor, setStructMenuAnchor] = useState<null | HTMLElement>(null);
  const [subMenuAnchor, setSubMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeGroupIdx, setActiveGroupIdx] = useState<number>(-1);
  const [recentMenuAnchor, setRecentMenuAnchor] = useState<null | HTMLElement>(null);
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; z: number } | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDialogData, setLocationDialogData] = useState<{
    blockX: number; blockZ: number;
    chunkX: number; chunkZ: number;
    regionX: number; regionZ: number;
    biome: string;
    slimeChunk: boolean;
    nearbyStructures: { label: string; x: number; z: number; dist: number }[];
    dimensionLabel: string;
  } | null>(null);
  const [mapName, setMapName] = useState(initial.mapName);
  const [propsDialogOpen, setPropsDialogOpen] = useState(false);
  const [propsName, setPropsName] = useState('');
  const [propsVersion, setPropsVersion] = useState<MCVersion>(MCVersion.MC_1_21);
  const [centerX, setCenterX] = useState(formatCoord(initial.centerX));
  const [centerZ, setCenterZ] = useState(formatCoord(initial.centerZ));
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const mapRef = useRef<MapViewerHandle>(null);
  const mapDataFileRef = useRef<MapDataFile>(mapDataFiles.getMapDataFile(seed));
  const isUserEditingCoords = useRef(false);
  const coordsDirty = useRef(false);
  const lastSavedCoords = useRef({ x: initial.centerX, z: initial.centerZ });
  const zoomDirty = useRef(false);
  const lastSavedZoom = useRef(initial.zoom);
  const currentZoom = useRef(initial.zoom);
  const fileMenuOpen = Boolean(fileMenuAnchor);
  const structMenuOpen = Boolean(structMenuAnchor);

  const handleFileMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setFileMenuAnchor(e.currentTarget);
  }, []);

  const handleFileMenuClose = useCallback(() => {
    setFileMenuAnchor(null);
    setRecentMenuAnchor(null);
  }, []);

  const handleStructMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setStructMenuAnchor(e.currentTarget);
  }, []);

  const handleStructMenuClose = useCallback(() => {
    setStructMenuAnchor(null);
    setSubMenuAnchor(null);
    setActiveGroupIdx(-1);
  }, []);

  const handleSubMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>, idx: number) => {
    setSubMenuAnchor(e.currentTarget);
    setActiveGroupIdx(idx);
  }, []);

  const handleSubMenuClose = useCallback(() => {
    setSubMenuAnchor(null);
    setActiveGroupIdx(-1);
  }, []);

  const handleRecentMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setRecentMenuAnchor(e.currentTarget);
  }, []);

  const handleRecentMenuClose = useCallback(() => {
    setRecentMenuAnchor(null);
  }, []);

  const handleNewSeed = useCallback(() => {
    handleFileMenuClose();
    setSeedInput('');
    setSeedDialogOpen(true);
  }, [handleFileMenuClose]);

  const saveCoords = useCallback(() => {
    const x = parseCoord(centerX);
    const z = parseCoord(centerZ);
    if (!isNaN(x) && !isNaN(z) && (x !== lastSavedCoords.current.x || z !== lastSavedCoords.current.z)) {
      mapDataFileRef.current.setNumber('centerX', x);
      mapDataFileRef.current.setNumber('centerZ', z);
      lastSavedCoords.current = { x, z };
      coordsDirty.current = false;
    }
  }, [centerX, centerZ]);

  const saveZoom = useCallback(() => {
    if (currentZoom.current !== lastSavedZoom.current) {
      mapDataFileRef.current.setNumber('zoom', currentZoom.current);
      lastSavedZoom.current = currentZoom.current;
      zoomDirty.current = false;
    }
  }, []);

  const loadSeed = useCallback((newSeed: bigint) => {
    if (coordsDirty.current) saveCoords();
    if (zoomDirty.current) saveZoom();
    const file = mapDataFiles.getMapDataFile(newSeed);
    mapDataFileRef.current = file;
    const state = loadStateFromFile(file, newSeed);
    coordsDirty.current = false;
    lastSavedCoords.current = { x: state.centerX, z: state.centerZ };
    zoomDirty.current = false;
    lastSavedZoom.current = state.zoom;
    currentZoom.current = state.zoom;
    setSeed(newSeed);
    setSeedInHash(newSeed);
    setMcVersion(state.mcVersion);
    setMapName(state.mapName);
    setEnabledStructures(state.enabledStructures);
    setCenterX(formatCoord(state.centerX));
    setCenterZ(formatCoord(state.centerZ));
    if (state.centerX !== 0 || state.centerZ !== 0) {
      setTimeout(() => mapRef.current?.goToPosition(state.centerX, state.centerZ), 0);
    }
  }, [saveCoords, saveZoom]);

  const handleSeedSubmit = useCallback(() => {
    const trimmed = seedInput.trim();
    if (trimmed === '') return;
    let newSeed: bigint;
    try {
      newSeed = BigInt(trimmed);
    } catch {
      const hash = Array.from(new TextEncoder().encode(trimmed)).reduce(
        (acc, b) => (acc * 31 + b) | 0,
        0,
      );
      newSeed = BigInt(hash);
    }
    loadSeed(newSeed);
    setSeedDialogOpen(false);
  }, [seedInput, loadSeed]);

  const handleGoToOrigin = useCallback(() => {
    mapRef.current?.goToOrigin();
  }, []);

  const handleCopySeedFromFooter = useCallback(() => {
    navigator.clipboard.writeText(seed.toString());
  }, [seed]);

  const NETHER_RATIO = 8;
  const BIOME_SCALE = 4;

  const handleLocationClick = useCallback((worldPos: { x: number; z: number }) => {
    const cs = dimension === Dimension.DIM_NETHER ? NETHER_RATIO : 1;
    const blockX = Math.floor(worldPos.x * BIOME_SCALE / cs);
    const blockZ = Math.floor(worldPos.z * BIOME_SCALE / cs);
    const chunkX = Math.floor(blockX / 16);
    const chunkZ = Math.floor(blockZ / 16);
    const regionX = Math.floor(chunkX / 32);
    const regionZ = Math.floor(chunkZ / 32);

    const biome = lookupBiomeName(worldPos.x, worldPos.z) ?? 'Unknown';

    const slime = dimension === Dimension.DIM_OVERWORLD
      ? isSlimeChunk(seed, chunkX, chunkZ)
      : false;

    const dimLabel = dimension === Dimension.DIM_NETHER ? 'The Nether'
      : dimension === Dimension.DIM_END ? 'The End' : 'Overworld';

    const nearby: { label: string; x: number; z: number; dist: number }[] = [];
    const SEARCH_RADIUS = 10;
    for (const group of STRUCTURE_GROUPS) {
      for (const entry of group.entries) {
        const config = getStructureConfig(entry.type, mcVersion);
        if (!config || config.dim !== dimension) continue;
        const regionBlockSize = config.regionSize * 16;
        const minReg = Math.floor((blockX - SEARCH_RADIUS * regionBlockSize) / regionBlockSize);
        const maxReg = Math.ceil((blockX + SEARCH_RADIUS * regionBlockSize) / regionBlockSize);
        const minRegZ = Math.floor((blockZ - SEARCH_RADIUS * regionBlockSize) / regionBlockSize);
        const maxRegZ = Math.ceil((blockZ + SEARCH_RADIUS * regionBlockSize) / regionBlockSize);
        for (let rz = minRegZ; rz <= maxRegZ; rz++) {
          for (let rx = minReg; rx <= maxReg; rx++) {
            const pos = getStructurePos(entry.type, mcVersion, seed, rx, rz);
            if (pos) {
              const dx = pos.x - blockX;
              const dz = pos.z - blockZ;
              const dist = Math.sqrt(dx * dx + dz * dz);
              if (dist < 500) {
                nearby.push({ label: entry.label, x: pos.x, z: pos.z, dist: Math.round(dist) });
              }
            }
          }
        }
      }
    }
    nearby.sort((a, b) => a.dist - b.dist);

    setLocationDialogData({
      blockX, blockZ, chunkX, chunkZ, regionX, regionZ,
      biome, slimeChunk: slime, nearbyStructures: nearby.slice(0, 10),
      dimensionLabel: dimLabel,
    });
    setLocationDialogOpen(true);
  }, [seed, dimension, mcVersion]);

  const handleOpenProperties = useCallback(() => {
    handleFileMenuClose();
    setPropsName(mapName);
    setPropsVersion(mcVersion);
    setPropsDialogOpen(true);
  }, [handleFileMenuClose, mapName, mcVersion]);

  const handleSaveProperties = useCallback(() => {
    const name = propsName.trim() || seed.toString();
    setMapName(name);
    mapDataFileRef.current.setString('mapName', name);
    setMcVersion(propsVersion);
    mapDataFileRef.current.setNumber('mcVersion', propsVersion);
    setPropsDialogOpen(false);
  }, [propsName, propsVersion, seed]);

  const handleToggleStructure = useCallback((structType: StructureType) => {
    setEnabledStructures((prev) => {
      const next = new Set(prev);
      if (next.has(structType)) {
        next.delete(structType);
      } else {
        next.add(structType);
      }
      mapDataFileRef.current.setJSON('enabledStructures', Array.from(next));
      return next;
    });
  }, []);

  const handleCenterChange = useCallback((x: number, z: number) => {
    if (isUserEditingCoords.current) return;
    setCenterX(formatCoord(x));
    setCenterZ(formatCoord(z));
    coordsDirty.current = true;
  }, []);

  const [zoomTick, setZoomTick] = useState(0);

  const handleZoomChange = useCallback((zoom: number) => {
    currentZoom.current = zoom;
    zoomDirty.current = true;
    setZoomTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!coordsDirty.current) return;
    const id = setTimeout(saveCoords, 1_000);
    return () => clearTimeout(id);
  }, [centerX, centerZ, saveCoords]);

  useEffect(() => {
    if (!zoomDirty.current) return;
    const id = setTimeout(saveZoom, 1_000);
    return () => clearTimeout(id);
  }, [zoomTick, saveZoom]);

  useEffect(() => {
    const flush = () => {
      if (coordsDirty.current) saveCoords();
      if (zoomDirty.current) saveZoom();
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [saveCoords, saveZoom]);

  useEffect(() => {
    setSeedInHash(seed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hashSeed = parseSeedFromHash();
      if (hashSeed !== null && hashSeed !== seed) {
        loadSeed(hashSeed);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [seed, loadSeed]);

  const handleCoordsSubmit = useCallback(() => {
    isUserEditingCoords.current = false;
    const x = parseCoord(centerX);
    const z = parseCoord(centerZ);
    if (!isNaN(x) && !isNaN(z)) {
      mapRef.current?.goToPosition(x, z);
    }
  }, [centerX, centerZ]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ mr: 2 }}>
              Minecraft Map
            </Typography>
            <Button
              color="inherit"
              onClick={handleFileMenuOpen}
              sx={{ textTransform: 'none', mr: 1 }}
            >
              Maps
            </Button>
            <Menu
              anchorEl={fileMenuAnchor}
              open={fileMenuOpen}
              onClose={handleFileMenuClose}
            >
              <MenuItem onClick={handleNewSeed}>
                <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                <ListItemText>New Seed…</ListItemText>
              </MenuItem>
              <MenuItem
                onMouseEnter={handleRecentMenuOpen}
                onClick={handleRecentMenuOpen}
                selected={recentMenuAnchor !== null}
              >
                <ListItemText>Recent Maps</ListItemText>
                <ArrowRightIcon fontSize="small" sx={{ ml: 2, opacity: 0.5 }} />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleOpenProperties}>
                <ListItemText>Properties</ListItemText>
              </MenuItem>
            </Menu>
            <Popover
              open={recentMenuAnchor !== null}
              anchorEl={recentMenuAnchor}
              onClose={handleRecentMenuClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              disableAutoFocus
              disableEnforceFocus
              disableRestoreFocus
              slotProps={{
                paper: { style: { maxHeight: '80vh' }, onMouseLeave: handleRecentMenuClose },
                root: { style: { pointerEvents: 'none' } },
              }}
              sx={{ pointerEvents: 'none' }}
            >
              <Paper sx={{ pointerEvents: 'auto' }}>
                <MenuList dense>
                  {Array.from(mapDataFiles.getExistingSeeds()).map((s) => {
                    const file = mapDataFiles.getMapDataFile(s);
                    const name = file.getString('mapName') || s.toString();
                    return (
                      <MenuItem
                        key={s.toString()}
                        onClick={() => { loadSeed(s); handleFileMenuClose(); }}
                        selected={s === seed}
                      >
                        <ListItemText>{name}</ListItemText>
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Paper>
            </Popover>
            <Button
              color="inherit"
              onClick={handleStructMenuOpen}
              sx={{ textTransform: 'none', mr: 2 }}
            >
              Structures
            </Button>
            <Menu
              anchorEl={structMenuAnchor}
              open={structMenuOpen}
              onClose={handleStructMenuClose}
            >
              {STRUCTURE_GROUPS.map((group, idx) => (
                <MenuItem
                  key={group.dimension}
                  onMouseEnter={(e) => handleSubMenuOpen(e, idx)}
                  onClick={(e) => handleSubMenuOpen(e, idx)}
                  selected={activeGroupIdx === idx}
                >
                  <ListItemText>{group.dimension}</ListItemText>
                  <ArrowRightIcon fontSize="small" sx={{ ml: 2, opacity: 0.5 }} />
                </MenuItem>
              ))}
            </Menu>
            <Popover
              open={subMenuAnchor !== null}
              anchorEl={subMenuAnchor}
              onClose={handleSubMenuClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              disableAutoFocus
              disableEnforceFocus
              disableRestoreFocus
              slotProps={{
                paper: { style: { maxHeight: '80vh' }, onMouseLeave: handleSubMenuClose },
                root: { style: { pointerEvents: 'none' } },
              }}
              sx={{ pointerEvents: 'none' }}
            >
              <Paper sx={{ pointerEvents: 'auto' }}>
                <MenuList dense>
                  {activeGroupIdx >= 0 && STRUCTURE_GROUPS[activeGroupIdx].entries.map(({ type, label }) => (
                    <MenuItem key={type} onClick={() => handleToggleStructure(type)}>
                      <Checkbox
                        checked={enabledStructures.has(type)}
                        size="small"
                        sx={{ p: 0, mr: 1 }}
                      />
                      <ListItemText>{label}</ListItemText>
                    </MenuItem>
                  ))}
                </MenuList>
              </Paper>
            </Popover>
            <Select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as Dimension)}
              size="small"
              variant="outlined"
              sx={{
                color: 'inherit',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                '.MuiSvgIcon-root': { color: 'inherit' },
                minWidth: 140,
              }}
            >
              <MenuItem value={Dimension.DIM_OVERWORLD}>Overworld</MenuItem>
              <MenuItem value={Dimension.DIM_NETHER}>The Nether</MenuItem>
              <MenuItem value={Dimension.DIM_END}>The End</MenuItem>
            </Select>
            <Box sx={{ flexGrow: 1 }} />
            <TextField
              label="X"
              size="small"
              variant="outlined"
              value={centerX}
              onFocus={() => { isUserEditingCoords.current = true; }}
              onBlur={() => { isUserEditingCoords.current = false; }}
              onChange={(e) => setCenterX(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCoordsSubmit(); }}
              sx={{
                width: 90,
                mr: 1,
                input: { color: 'inherit', py: 0.5, fontSize: '0.875rem' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '.MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' },
              }}
            />
            <TextField
              label="Z"
              size="small"
              variant="outlined"
              value={centerZ}
              onFocus={() => { isUserEditingCoords.current = true; }}
              onBlur={() => { isUserEditingCoords.current = false; }}
              onChange={(e) => setCenterZ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCoordsSubmit(); }}
              sx={{
                width: 90,
                mr: 0.5,
                input: { color: 'inherit', py: 0.5, fontSize: '0.875rem' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '.MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' },
              }}
            />
            <IconButton
              color="inherit"
              size="small"
              onClick={handleGoToOrigin}
              title="Go to Origin"
              sx={{ mr: 2 }}
            >
              <LocationSearchingIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MapViewer ref={mapRef} seed={seed} dimension={dimension} mcVersion={mcVersion} enabledStructures={enabledStructures} initialCenter={{ x: initial.centerX, z: initial.centerZ }} initialZoom={initial.zoom} onBiomeHover={setHoveredBiome} onCenterChange={handleCenterChange} onZoomChange={handleZoomChange} onCursorChange={setCursorPos} onLocationClick={handleLocationClick} />
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: 'rgba(255, 255, 255, 0.85)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              userSelect: 'none',
            }}
          >
            Seed:{' '}
            <Box
              component="span"
              onClick={handleCopySeedFromFooter}
              sx={{
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(255,255,255,0.4)',
                '&:hover': { textDecorationColor: 'rgba(255,255,255,0.85)' },
              }}
              title="Click to copy seed"
            >
              {seed.toString()}
            </Box>
            {cursorPos && <> &nbsp;|&nbsp; X: {Math.floor(cursorPos.x * 4 / (dimension === Dimension.DIM_NETHER ? 8 : 1))}, Z: {Math.floor(cursorPos.z * 4 / (dimension === Dimension.DIM_NETHER ? 8 : 1))}</>}
            {hoveredBiome && <> &nbsp;|&nbsp; Biome: {hoveredBiome}</>}
          </Typography>
        </Box>
      </Box>

      <Dialog
        open={seedDialogOpen}
        onClose={() => setSeedDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Enter Seed</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Seed"
            placeholder="Number or text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSeedSubmit(); }}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSeedSubmit} variant="contained">Load</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={propsDialogOpen}
        onClose={() => setPropsDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Map Properties</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Map Name"
            value={propsName}
            onChange={(e) => setPropsName(e.target.value)}
            margin="dense"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>MC Version</InputLabel>
            <Select
              value={propsVersion}
              label="MC Version"
              onChange={(e) => setPropsVersion(e.target.value as MCVersion)}
            >
              {VERSION_ENTRIES.map(({ version, label }) => (
                <MenuItem key={version} value={version}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPropsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProperties} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Location Details</DialogTitle>
        {locationDialogData && (
          <DialogContent>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: 140 }}>Dimension</TableCell>
                  <TableCell>{locationDialogData.dimensionLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Block</TableCell>
                  <TableCell>X: {locationDialogData.blockX}, Z: {locationDialogData.blockZ}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Chunk</TableCell>
                  <TableCell>X: {locationDialogData.chunkX}, Z: {locationDialogData.chunkZ}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Region</TableCell>
                  <TableCell>r.{locationDialogData.regionX}.{locationDialogData.regionZ}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Biome</TableCell>
                  <TableCell>{locationDialogData.biome}</TableCell>
                </TableRow>
                {dimension === Dimension.DIM_OVERWORLD && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Slime Chunk</TableCell>
                    <TableCell>{locationDialogData.slimeChunk ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {locationDialogData.nearbyStructures.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Nearby Structures (within 500 blocks)</Typography>
                <Table size="small">
                  <TableBody>
                    {locationDialogData.nearbyStructures.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.label}</TableCell>
                        <TableCell>X: {s.x}, Z: {s.z}</TableCell>
                        <TableCell align="right">{s.dist} blocks</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
            {locationDialogData.nearbyStructures.length === 0 && (
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>No structures found within 500 blocks.</Typography>
            )}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
