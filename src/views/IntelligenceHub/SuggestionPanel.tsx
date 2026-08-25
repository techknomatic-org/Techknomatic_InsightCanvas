// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DashboardSuggestion } from './intelligenceTypes';

interface SuggestionPanelProps {
    suggestions: DashboardSuggestion[];
    onSelectSuggestion: (suggestion: DashboardSuggestion) => void;
    generating?: boolean;
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
    suggestions,
    onSelectSuggestion,
    generating = false,
}) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <Box sx={{ width: '100%', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 1.2 }}>
                <AutoAwesomeIcon sx={{ fontSize: 15, color: '#1B75BB' }} />
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        color: '#001d52',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    Recommended Dashboards
                </Typography>
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
                {suggestions.slice(0, 4).map((sug, idx) => (
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.8, mb: 0.3 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        fontSize: '12px',
                                        lineHeight: 1.25,
                                    }}
                                >
                                    {sug.title}
                                </Typography>
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

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 0.4 }}>
                            <Chip
                                size="small"
                                icon={<InsightsIcon sx={{ fontSize: '10px !important' }} />}
                                label="Generate"
                                sx={{
                                    height: 18,
                                    fontSize: '9.5px',
                                    fontWeight: 600,
                                    bgcolor: 'rgba(27, 117, 187, 0.08)',
                                    color: '#1B75BB',
                                    cursor: 'pointer',
                                }}
                            />
                            {sug.focus_metrics && sug.focus_metrics.length > 0 && (
                                <Typography variant="caption" sx={{ fontSize: '9.5px', color: '#64748b', fontWeight: 500 }}>
                                    {sug.focus_metrics.slice(0, 2).join(' • ')}
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
};
