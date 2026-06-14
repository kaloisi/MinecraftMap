import { useState, useCallback, useRef } from 'react';
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
import Radio from '@mui/material/Radio';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MapViewer from './MapViewer';
import type { MapViewerHandle } from './MapViewer';
import { Dimension, MCVersion, StructureType } from './CubiomesTS';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

const DEFAULT_SEED = 6770262141636552371n;

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
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [dimension, setDimension] = useState<Dimension>(Dimension.DIM_OVERWORLD);
  const [mcVersion, setMcVersion] = useState<MCVersion>(MCVersion.MC_1_21);
  const [enabledStructures, setEnabledStructures] = useState<Set<StructureType>>(new Set());
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [structMenuAnchor, setStructMenuAnchor] = useState<null | HTMLElement>(null);
  const [subMenuAnchor, setSubMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeGroupIdx, setActiveGroupIdx] = useState<number>(-1);
  const [hoveredBiome, setHoveredBiome] = useState<string | null>(null);
  const [centerX, setCenterX] = useState('0');
  const [centerZ, setCenterZ] = useState('0');
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const mapRef = useRef<MapViewerHandle>(null);
  const isUserEditingCoords = useRef(false);
  const fileMenuOpen = Boolean(fileMenuAnchor);
  const structMenuOpen = Boolean(structMenuAnchor);

  const handleFileMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setFileMenuAnchor(e.currentTarget);
  }, []);

  const handleFileMenuClose = useCallback(() => {
    setFileMenuAnchor(null);
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

  const handleNewSeed = useCallback(() => {
    handleFileMenuClose();
    setSeedInput('');
    setSeedDialogOpen(true);
  }, [handleFileMenuClose]);

  const handleSeedSubmit = useCallback(() => {
    const trimmed = seedInput.trim();
    if (trimmed === '') return;
    try {
      setSeed(BigInt(trimmed));
    } catch {
      const hash = Array.from(new TextEncoder().encode(trimmed)).reduce(
        (acc, b) => (acc * 31 + b) | 0,
        0,
      );
      setSeed(BigInt(hash));
    }
    setSeedDialogOpen(false);
  }, [seedInput]);

  const handleGoToOrigin = useCallback(() => {
    handleFileMenuClose();
    mapRef.current?.goToOrigin();
  }, [handleFileMenuClose]);

  const handleCopySeed = useCallback(() => {
    handleFileMenuClose();
    navigator.clipboard.writeText(seed.toString());
  }, [handleFileMenuClose, seed]);

  const handleToggleStructure = useCallback((structType: StructureType) => {
    setEnabledStructures((prev) => {
      const next = new Set(prev);
      if (next.has(structType)) {
        next.delete(structType);
      } else {
        next.add(structType);
      }
      return next;
    });
  }, []);

  const handleCenterChange = useCallback((x: number, z: number) => {
    if (!isUserEditingCoords.current) {
      setCenterX(String(x));
      setCenterZ(String(z));
    }
  }, []);

  const handleCoordsSubmit = useCallback(() => {
    isUserEditingCoords.current = false;
    const x = parseInt(centerX, 10);
    const z = parseInt(centerZ, 10);
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
              File
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
              <MenuItem onClick={handleGoToOrigin}>
                <ListItemIcon><HomeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Go to Origin</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleCopySeed}>
                <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Copy Seed</ListItemText>
              </MenuItem>
              <Divider />
              {VERSION_ENTRIES.map(({ version, label }) => (
                <MenuItem
                  key={version}
                  onClick={() => { setMcVersion(version); handleFileMenuClose(); }}
                  dense
                >
                  <Radio
                    checked={mcVersion === version}
                    size="small"
                    sx={{ p: 0, mr: 1 }}
                  />
                  <ListItemText>{label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
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
                mr: 2,
                input: { color: 'inherit', py: 0.5, fontSize: '0.875rem' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '.MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' },
              }}
            />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {hoveredBiome && <>Biome: {hoveredBiome} &nbsp;|&nbsp; </>}
              Seed: {seed.toString()}
            </Typography>
          </Toolbar>
        </AppBar>
        <MapViewer ref={mapRef} seed={seed} dimension={dimension} mcVersion={mcVersion} enabledStructures={enabledStructures} onBiomeHover={setHoveredBiome} onCenterChange={handleCenterChange} />
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
    </ThemeProvider>
  );
}
