// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import { Box, SxProps, Theme, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import techknomaticSymbol from '../assets/techknomatic-symbol.svg';

/** Animations for Pinwheel & Glow */
const rotateSpin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    opacity: 0.45;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.15);
  }
`;

const shimmerBar = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const textPulse = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`;

/** Techknomatic Animated Pinwheel & Glow */
function TechknomaticGlowPinwheel() {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
      }}
    >
      {/* Ambient Radial Gradient Glow */}
      <Box
        sx={{
          position: 'absolute',
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(27, 117, 187, 0.22) 0%, rgba(244, 121, 32, 0.12) 40%, rgba(34, 160, 72, 0.08) 65%, transparent 75%)',
          filter: 'blur(10px)',
          animation: `${pulseGlow} 3s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* Rotating Outer Ring */}
      <Box
        sx={{
          position: 'absolute',
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: '2px dashed rgba(27, 117, 187, 0.25)',
          animation: `${rotateSpin} 12s linear infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* Animated Pinwheel Symbol */}
      <Box
        component="img"
        src={techknomaticSymbol}
        alt="Techknomatic"
        sx={{
          width: 68,
          height: 68,
          objectFit: 'contain',
          animation: `${rotateSpin} 6s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          filter: 'drop-shadow(0 4px 12px rgba(27, 117, 187, 0.2))',
          zIndex: 2,
        }}
      />
    </Box>
  );
}

export interface AnvilLoaderProps {
  /** Override container height. Defaults to `'100vh'` (full-screen). */
  height?: string | number;
  /** Optional text shown below the loader. When omitted defaults to 'Loading InsightCanvas...' */
  label?: React.ReactNode;
  /** Optional control shown beside the loading label. */
  action?: React.ReactNode;
  /** Extra sx applied to the outermost container. */
  sx?: SxProps<Theme>;
}

export function AnvilLoader({ height = '100vh', label = 'Loading InsightCanvas...', action, sx }: AnvilLoaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap: 2.5,
        userSelect: 'none',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        p: 3,
        boxSizing: 'border-box',
        ...sx as any,
      }}
    >
      {/* Techknomatic Pinwheel & Ambient Glow */}
      <TechknomaticGlowPinwheel />

      {/* Product Title */}
      <Box sx={{ textAlign: 'center', mt: 0.5 }}>
        <Typography
          component="div"
          sx={{
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            color: '#0f172a',
          }}
        >
          Insight<Box component="span" sx={{ color: '#1B75BB' }}>Canvas</Box>
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#94a3b8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            mt: 0.2,
            display: 'block',
          }}
        >
          Techknomatic
        </Typography>
      </Box>

      {/* Modern Animated Gradient Shimmer Progress Bar */}
      <Box
        sx={{
          width: 160,
          height: 3.5,
          bgcolor: '#f1f5f9',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          my: 0.5,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, #1B75BB 30%, #F47920 60%, #22A048 90%, transparent)',
            animation: `${shimmerBar} 1.6s ease-in-out infinite`,
            borderRadius: '4px',
          }}
        />
      </Box>

      {/* Status / Label & Optional Action */}
      {(label !== undefined || action !== undefined) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {label !== undefined && (
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                fontSize: '0.82rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
                animation: `${textPulse} 2s ease-in-out infinite`,
              }}
            >
              {typeof label === 'string' && label.toLowerCase().includes('data formulator')
                ? label.replace(/data formulator/gi, 'InsightCanvas')
                : label}
            </Typography>
          )}
          {action && (
            <Box sx={{ mt: 0.5 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
