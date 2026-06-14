import { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Dimension } from '../CubiomesTS';

interface DimensionToggleProps {
  dimension: Dimension;
  onDimensionChange: (dim: Dimension) => void;
}

const OVERWORLD_GRADIENT = 'linear-gradient(135deg, #3b7dd8 0%, #3b7dd8 35%, #5a9e4b 35%, #5a9e4b 55%, #c8b968 55%, #c8b968 100%)';
const NETHER_GRADIENT = 'linear-gradient(135deg, #8b1a1a 0%, #4a0e0e 40%, #2d8b7a 40%, #2d8b7a 60%, #8b1a1a 60%, #6b0000 100%)';

const DimensionToggle = memo(function DimensionToggle({
  dimension,
  onDimensionChange,
}: DimensionToggleProps) {
  const isOverworld = dimension === Dimension.DIM_OVERWORLD;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 56,
        left: 12,
        display: 'flex',
        gap: 0.5,
        zIndex: 10,
        bgcolor: 'rgba(0,0,0,0.7)',
        borderRadius: 1.5,
        p: 0.5,
      }}
    >
      <Box
        onClick={() => onDimensionChange(Dimension.DIM_OVERWORLD)}
        sx={{
          width: 64,
          height: 64,
          borderRadius: 1,
          overflow: 'hidden',
          cursor: 'pointer',
          border: isOverworld ? '2px solid #4fc3f7' : '2px solid transparent',
          position: 'relative',
          background: OVERWORLD_GRADIENT,
          transition: 'border-color 0.15s',
          '&:hover': {
            border: isOverworld ? '2px solid #4fc3f7' : '2px solid rgba(255,255,255,0.5)',
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            lineHeight: 1,
          }}
        >
          Overworld
        </Typography>
      </Box>
      <Box
        onClick={() => onDimensionChange(Dimension.DIM_NETHER)}
        sx={{
          width: 64,
          height: 64,
          borderRadius: 1,
          overflow: 'hidden',
          cursor: 'pointer',
          border: !isOverworld ? '2px solid #4fc3f7' : '2px solid transparent',
          position: 'relative',
          background: NETHER_GRADIENT,
          transition: 'border-color 0.15s',
          '&:hover': {
            border: !isOverworld ? '2px solid #4fc3f7' : '2px solid rgba(255,255,255,0.5)',
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            lineHeight: 1,
          }}
        >
          Nether
        </Typography>
      </Box>
    </Box>
  );
});

export default DimensionToggle;
