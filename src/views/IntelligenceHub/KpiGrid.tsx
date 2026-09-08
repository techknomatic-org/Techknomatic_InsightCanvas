// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import FunctionsIcon from '@mui/icons-material/Functions';
import { KpiSpec } from './intelligenceTypes';

interface KpiGridProps {
    kpis: KpiSpec[];
}

const ACCENTS = [
    {
        color: '#1B75BB',
        bg: 'linear-gradient(180deg, rgba(27, 117, 187, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(27, 117, 187, 0.1)',
    },
    {
        color: '#10B981',
        bg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(16, 185, 129, 0.1)',
    },
    {
        color: '#8B5CF6',
        bg: 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(139, 92, 246, 0.1)',
    },
    {
        color: '#F59E0B',
        bg: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, #ffffff 100%)',
        badgeBg: 'rgba(245, 158, 11, 0.1)',
    },
];

const getKpiIcon = (kpi: KpiSpec) => {
    const title = (kpi.title || '').toLowerCase();
    const format = (kpi.format || '').toLowerCase();
    const col = (kpi.measure_column || '').toLowerCase();
    const expr = (kpi.expression || kpi.formula || '').toLowerCase();
    const agg = (kpi.aggregation || '').toUpperCase();
    const formattedVal = String(kpi.formatted_value || '');

    if (expr || col.includes('-') || col.includes('+') || col.includes('/') || col.includes('*')) {
        return <FunctionsIcon sx={{ fontSize: 16 }} />;
    }

    if (
        format === 'currency' ||
        formattedVal.startsWith('$') ||
        ['salary', 'revenue', 'cost', 'price', 'budget', 'profit', 'expense', 'spend', 'val', 'amt', 'pay', 'income', 'earning', 'sales'].some((k) => title.includes(k) || col.includes(k) || expr.includes(k))
    ) {
        return <MonetizationOnOutlinedIcon sx={{ fontSize: 16 }} />;
    }

    if (
        format === 'percent' ||
        formattedVal.includes('%') ||
        ['rate', 'percent', 'pct', 'ratio', 'share', 'margin', 'proportion', 'efficiency', 'utilization'].some((k) => title.includes(k) || col.includes(k) || expr.includes(k))
    ) {
        return <PercentOutlinedIcon sx={{ fontSize: 16 }} />;
    }

    if (
        agg === 'COUNT' ||
        format === 'integer' ||
        ['count', 'number', 'total', 'quantity', 'units', 'employees', 'departments', 'users', 'customers', 'orders', 'items', 'headcount'].some((k) => title.includes(k) || col.includes(k))
    ) {
        return <TagOutlinedIcon sx={{ fontSize: 16 }} />;
    }

    return <AnalyticsIcon sx={{ fontSize: 16 }} />;
};

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
                const kpiIcon = getKpiIcon(kpi);
                const formulaText = kpi.expression || kpi.formula || (kpi.measure_column && /[+\-*/]/.test(kpi.measure_column) ? kpi.measure_column : null);

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
                        <CardContent
                            sx={{
                                p: 2.2,
                                '&:last-child': { pb: 2.2 },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: '#475569',
                                        lineHeight: 1.3,
                                        flex: 1,
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
                                    {kpiIcon}
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

                            <Tooltip
                                title={
                                    formulaText
                                        ? `Formula: ${formulaText}\n${kpi.subtitle || ''}`
                                        : kpi.subtitle || ''
                                }
                                arrow
                                placement="top"
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '11.5px',
                                        fontWeight: 500,
                                        color: '#64748b',
                                        lineHeight: 1.35,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        mb: kpi.comparison ? 1 : 0,
                                        cursor: formulaText || (kpi.subtitle && kpi.subtitle.length > 40) ? 'help' : 'default',
                                    }}
                                >
                                    {formulaText && (
                                        <FunctionsIcon
                                            sx={{ fontSize: 12, color: accent.color, verticalAlign: 'middle', mr: 0.4 }}
                                        />
                                    )}
                                    {kpi.subtitle || `${kpi.aggregation || 'Total'} metric`}
                                </Typography>
                            </Tooltip>

                            {kpi.comparison && (
                                <Box sx={{ mt: 'auto', pt: 0.5, display: 'flex', alignItems: 'center' }}>
                                    <Tooltip title={kpi.comparison} arrow placement="bottom">
                                        <Chip
                                            size="small"
                                            icon={<TrendingUpIcon sx={{ fontSize: '12px !important' }} />}
                                            label={kpi.comparison}
                                            sx={{
                                                maxWidth: '100%',
                                                height: 22,
                                                fontSize: '10.5px',
                                                fontWeight: 600,
                                                bgcolor: '#ecfdf5',
                                                color: '#059669',
                                                border: '1px solid #a7f3d0',
                                                '& .MuiChip-label': {
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    px: 1,
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
};
