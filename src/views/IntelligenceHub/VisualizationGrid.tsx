// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import embed from 'vega-embed';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import { VisualizationSpec } from './intelligenceTypes';

interface ChartCardProps {
    viz: VisualizationSpec;
    index: number;
}

const getChartIcon = (type?: string) => {
    switch ((type || '').toLowerCase()) {
        case 'line':
            return <ShowChartIcon sx={{ fontSize: 14 }} />;
        case 'area':
            return <TimelineIcon sx={{ fontSize: 14 }} />;
        case 'pie':
        case 'donut':
            return <PieChartIcon sx={{ fontSize: 14 }} />;
        default:
            return <BarChartIcon sx={{ fontSize: 14 }} />;
    }
};

const ChartCard: React.FC<ChartCardProps> = ({ viz, index }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !viz.vega_spec) return;

        let isMounted = true;
        const target = containerRef.current;
        target.innerHTML = '';

        // Strip duplicate internal Vega title so only the single styled card header is shown
        const { title: _internalTitle, ...vegaSpecWithoutTitle } = viz.vega_spec;

        // Inject rich responsive config
        const specToRender: any = {
            ...vegaSpecWithoutTitle,
            width: 'container',
            height: 200,
            autosize: { type: 'fit', contains: 'padding' },
            config: {
                ...(viz.vega_spec.config || {}),
                background: 'transparent',
                view: { stroke: 'transparent' },
                axis: {
                    domainColor: '#e2e8f0',
                    tickColor: '#e2e8f0',
                    gridColor: '#f8fafc',
                    labelFont: 'Inter, sans-serif',
                    titleFont: 'Inter, sans-serif',
                },
            },
        };

        embed(target, specToRender, {
            actions: false,
            renderer: 'svg',
        }).catch((err) => {
            if (isMounted) {
                console.warn('Vega embed warning for:', viz.title, err);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [viz.vega_spec, viz.data]);

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 29, 82, 0.03)',
                '&:hover': {
                    boxShadow: '0 8px 24px rgba(27, 117, 187, 0.08)',
                    borderColor: '#93c5fd',
                },
            }}
        >
            <CardContent sx={{ p: 2.2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', lineHeight: 1.3 }}>
                        {viz.title}
                    </Typography>
                    <Chip
                        size="small"
                        icon={getChartIcon(viz.chart_type)}
                        label={viz.chart_type || 'chart'}
                        sx={{
                            height: 20,
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            bgcolor: 'rgba(27, 117, 187, 0.06)',
                            color: '#1B75BB',
                        }}
                    />
                </Box>

                {viz.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', fontSize: '11px', lineHeight: 1.4 }}>
                        {viz.description}
                    </Typography>
                )}

                <Box
                    ref={containerRef}
                    sx={{
                        flex: 1,
                        width: '100%',
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 'auto',
                        '& svg': { maxWidth: '100% !important' },
                    }}
                />
            </CardContent>
        </Card>
    );
};

interface VisualizationGridProps {
    visualizations: VisualizationSpec[];
}

export const VisualizationGrid: React.FC<VisualizationGridProps> = ({ visualizations }) => {
    const items = visualizations.slice(0, 6);

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2.5,
            }}
        >
            {items.map((viz, idx) => (
                <ChartCard key={viz.id || idx} viz={viz} index={idx} />
            ))}
        </Box>
    );
};
