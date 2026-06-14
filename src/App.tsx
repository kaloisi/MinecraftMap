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
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MapViewer from './MapViewer';
import type { MapViewerHandle } from './MapViewer';
import { Dimension } from './CubiomesTS';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

const DEFAULT_SEED = 0n;

export default function App() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [dimension, setDimension] = useState<Dimension>(Dimension.DIM_OVERWORLD);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const mapRef = useRef<MapViewerHandle>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleNewSeed = useCallback(() => {
    handleMenuClose();
    setSeedInput('');
    setSeedDialogOpen(true);
  }, [handleMenuClose]);

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
    handleMenuClose();
    mapRef.current?.goToOrigin();
  }, [handleMenuClose]);

  const handleCopySeed = useCallback(() => {
    handleMenuClose();
    navigator.clipboard.writeText(seed.toString());
  }, [handleMenuClose, seed]);

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
              onClick={handleMenuOpen}
              sx={{ textTransform: 'none', mr: 2 }}
            >
              File
            </Button>
            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={handleMenuClose}
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
            </Menu>
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
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Seed: {seed.toString()}
            </Typography>
          </Toolbar>
        </AppBar>
        <MapViewer ref={mapRef} seed={seed} dimension={dimension} />
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
