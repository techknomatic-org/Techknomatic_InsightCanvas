// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    ButtonBase,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DashboardSuggestion } from './intelligenceTypes';

interface SuggestionPanelProps {
    suggestions: DashboardSuggestion[];
    onSelectSuggestion: (suggestion: DashboardSuggestion) => void;
    generating?: boolean;
    onRefresh?: () => void;
    refreshLoading?: boolean;
}

const getCategoryMeta = (cat?: string) => {
    switch ((cat || '').toLowerCase()) {
        case 'strategic':
            return {
                label: 'Strategic',
                icon: '🎯',
                color: '#4338ca',
                bgcolor: '#eef2ff',
                borderColor: '#c7d2fe',
            };
        case 'operational':
            return {
                label: 'Operational',
                icon: '⚡',
                color: '#0369a1',
                bgcolor: '#f0f9ff',
                borderColor: '#bae6fd',
            };
        case 'financial':
            return {
                label: 'Financial',
                icon: '💰',
                color: '#047857',
                bgcolor: '#ecfdf5',
                borderColor: '#a7f3d0',
            };
        case 'trends':
            return {
                label: 'Trends',
                icon: '📈',
                color: '#b45309',
                bgcolor: '#fffbeb',
                borderColor: '#fde68a',
            };
        case 'risk':
            return {
                label: 'Risk',
                icon: '⚠️',
                color: '#b91c1c',
                bgcolor: '#fef2f2',
                borderColor: '#fecaca',
            };
        default:
            return {
                label: cat || 'Analytics',
                icon: '💡',
                color: '#1B75BB',
                bgcolor: '#eff6ff',
                borderColor: '#bfdbfe',
            };
    }
};

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
    suggestions,
    onSelectSuggestion,
    generating = false,
    onRefresh,
    refreshLoading = false,
}) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <Box sx={{ width: '100%', mb: 1.5 }}>
            {/* Header bar with title and refresh action */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.2,
                    px: 0.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 16, color: '#1B75BB' }} />
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: '#001d52',
                            fontSize: '11.5px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}
                    >
                        Recommended Dashboards
                    </Typography>
                </Box>

                {onRefresh && (
                    <Tooltip title="Generate fresh recommendations tailored to this dataset" arrow placement="top">
                        <ButtonBase
                            onClick={onRefresh}
                            disabled={generating || refreshLoading}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.3,
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                bgcolor: '#ffffff',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                                transition: 'all 0.15s ease',
                                cursor: (generating || refreshLoading) ? 'not-allowed' : 'pointer',
                                opacity: (generating || refreshLoading) ? 0.6 : 1,
                                '&:hover': (generating || refreshLoading)
                                    ? {}
                                    : {
                                          borderColor: '#1B75BB',
                                          color: '#1B75BB',
                                          bgcolor: '#f8fafc',
                                      },
                            }}
                        >
                            {refreshLoading ? (
                                <CircularProgress size={11} sx={{ color: '#1B75BB' }} />
                            ) : (
                                <RefreshIcon sx={{ fontSize: 13, color: 'inherit' }} />
                            )}
                            <span>Refresh Ideas</span>
                        </ButtonBase>
                    </Tooltip>
                )}
            </Box>

            {/* Compact 2x2 grid with small cards and no scrollbars */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: '1fr 1fr',
                    },
                    gap: 1.2,
                    width: '100%',
                }}
            >
                {suggestions.slice(0, 4).map((sug, idx) => {
                    const catMeta = getCategoryMeta(sug.category);
                    return (
                        <Paper
                            key={sug.id || sug.title || idx}
                            elevation={0}
                            onClick={() => !generating && onSelectSuggestion(sug)}
                            sx={{
                                p: 1.4,
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                cursor: generating ? 'not-allowed' : 'pointer',
                                opacity: generating ? 0.6 : 1,
                                transition: 'all 0.18s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                '&:hover': generating
                                    ? {}
                                    : {
                                          borderColor: '#1B75BB',
                                          transform: 'translateY(-1px)',
                                          boxShadow: '0 4px 14px rgba(27, 117, 187, 0.08)',
                                          '& .gen-arrow': {
                                              transform: 'translateX(2px)',
                                              color: '#1B75BB',
                                          },
                                      },
                            }}
                        >
                            <Box sx={{ mb: 0.8 }}>
                                {/* Category Badge & Arrow */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.8, mb: 0.6 }}>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.4,
                                            px: 0.8,
                                            py: 0.15,
                                            borderRadius: '4px',
                                            bgcolor: catMeta.bgcolor,
                                            border: `1px solid ${catMeta.borderColor}`,
                                            color: catMeta.color,
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                        }}
                                    >
                                        <span>{catMeta.icon}</span>
                                        <span>{catMeta.label}</span>
                                    </Box>

                                    <ArrowForwardIcon
                                        className="gen-arrow"
                                        sx={{
                                            fontSize: 14,
                                            color: '#94a3b8',
                                            transition: 'transform 0.18s ease, color 0.18s ease',
                                            flexShrink: 0,
                                        }}
                                    />
                                </Box>

                                {/* Title */}
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        fontSize: '12.5px',
                                        lineHeight: 1.25,
                                        mb: 0.4,
                                    }}
                                >
                                    {sug.title}
                                </Typography>

                                {/* Description */}
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontSize: '10.5px',
                                        lineHeight: 1.35,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {sug.description || sug.reason}
                                </Typography>
                            </Box>

                            {/* Footer: Generate button & Focus Metrics */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 0.6, gap: 0.8 }}>
                                <Chip
                                    size="small"
                                    icon={<InsightsIcon sx={{ fontSize: '10px !important' }} />}
                                    label="Build"
                                    sx={{
                                        height: 20,
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        bgcolor: 'rgba(27, 117, 187, 0.08)',
                                        color: '#1B75BB',
                                        cursor: 'pointer',
                                    }}
                                />

                                {sug.focus_metrics && sug.focus_metrics.length > 0 && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                        {sug.focus_metrics.slice(0, 2).map((m, mIdx) => (
                                            <Typography
                                                key={mIdx}
                                                variant="caption"
                                                sx={{
                                                    fontSize: '9.5px',
                                                    color: '#64748b',
                                                    fontWeight: 500,
                                                    bgcolor: '#f1f5f9',
                                                    px: 0.6,
                                                    py: 0.1,
                                                    borderRadius: '3px',
                                                    whiteSpace: 'nowrap',
                                                    textOverflow: 'ellipsis',
                                                    overflow: 'hidden',
                                                    maxWidth: 110,
                                                }}
                                            >
                                                {m}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
};
