import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MapViewer from './MapViewer';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

const DEFAULT_SEED = 0n;

export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Minecraft Map
            </Typography>
          </Toolbar>
        </AppBar>
        <MapViewer seed={DEFAULT_SEED} />
      </Box>
    </ThemeProvider>
  );
}
