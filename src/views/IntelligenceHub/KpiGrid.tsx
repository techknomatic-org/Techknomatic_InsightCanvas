// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import { KpiSpec } from './intelligenceTypes';

interface KpiGridProps {
    kpis: KpiSpec[];
}

const ACCENTS = [
    {
        color: '#1B75BB',
        bg: 'linear-gradient(180deg, rgba(27, 117, 187, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(27, 117, 187, 0.1)',
        icon: <MonetizationOnOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
        color: '#10B981',
        bg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(16, 185, 129, 0.1)',
        icon: <AnalyticsIcon sx={{ fontSize: 16 }} />,
    },
    {
        color: '#8B5CF6',
        bg: 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(139, 92, 246, 0.1)',
        icon: <PercentOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
        color: '#F59E0B',
        bg: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(245, 158, 11, 0.1)',
        icon: <TagOutlinedIcon sx={{ fontSize: 16 }} />,
    },
];

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis }) => {
    const items = kpis.slice(0, 4);

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
            }}
        >
            {items.map((kpi, idx) => {
                const accent = ACCENTS[idx % ACCENTS.length];

                return (
                    <Card
                        key={kpi.id || idx}
                        elevation={0}
                        sx={{
                            height: '100%',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            borderTop: `4px solid ${accent.color}`,
                            background: accent.bg,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 20px ${accent.color}18`,
                                borderColor: accent.color,
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.2 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: '#475569',
                                    }}
                                >
                                    {kpi.title}
                                </Typography>
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '8px',
                                        bgcolor: accent.badgeBg,
                                        color: accent.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {accent.icon}
                                </Box>
                            </Box>

                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    letterSpacing: '-0.03em',
                                    fontSize: '26px',
                                    lineHeight: 1.2,
                                    mb: 0.8,
                                }}
                            >
                                {kpi.formatted_value || '—'}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: '11px', fontWeight: 500 }}
                                >
                                    {kpi.subtitle || `${kpi.aggregation || 'Total'} metric`}
                                </Typography>
                                {kpi.comparison && (
                                    <Chip
                                        size="small"
                                        icon={<TrendingUpIcon sx={{ fontSize: '12px !important' }} />}
                                        label={kpi.comparison}
                                        sx={{
                                            height: 20,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            bgcolor: '#ecfdf5',
                                            color: '#059669',
                                            border: '1px solid #a7f3d0',
                                        }}
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
};
